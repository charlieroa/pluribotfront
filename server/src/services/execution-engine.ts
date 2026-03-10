import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { getAgentConfig, VISUAL_AGENT_IDS, REFINE_AGENT_IDS } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { checkCredits, consumeCredits } from './credit-tracker.js'
import {
  getExecutingPlan, setExecutingPlan, removeExecutingPlan,
  type ExecutingPlan, type OrchestratorStep,
} from './plan-cache.js'
import type { LLMMessage, LLMUsage } from './llm/types.js'
import { validateHtml, sanitizeHtml, extractHtmlBlock, wrapTextAsHtml, VISUAL_EDITOR_SCRIPT, LOGO_SELECTION_SCRIPT } from './html-utils.js'
import { readAndEncodeImage } from './image-utils.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { executeToolCall } from './tools/executor.js'
import { getNextVersionInfo, getVersionCount } from './deliverable-versioning.js'
import { parseProjectFilesFromText } from './project-files.js'
import { validateProjectFiles } from './project-files.js'
import { buildDevTemplateContext } from './dev-template-system.js'
import { buildDevDesignPackContext } from './dev-design-packs.js'
import { buildDevCanonicalExamplesContext } from './dev-canonical-examples.js'
const DELIVERABLE_TYPE_MAP: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video'> = {
  seo: 'report',
  brand: 'design',
  web: 'design',
  social: 'design',
  ads: 'copy',
  video: 'video',
  dev: 'code',
}

// Helper: create a 'todo' kanban task for a plan step
export async function createTodoKanbanTask(conversationId: string, step: OrchestratorStep): Promise<void> {
  const agentConfig = getAgentConfig(step.agentId)
  const taskId = uuid()
  const title = `${agentConfig?.name ?? step.agentId}: ${step.userDescription?.slice(0, 60) || step.task.slice(0, 60)}`

  const kanbanTask = await prisma.kanbanTask.create({
    data: {
      id: taskId,
      conversationId,
      title,
      agent: agentConfig?.name ?? step.agentId,
      status: 'todo',
      botType: agentConfig?.botType ?? step.agentId,
      instanceId: step.instanceId,
    },
  })

  broadcast(conversationId, {
    type: 'kanban_update',
    task: {
      id: taskId,
      title,
      agent: agentConfig?.name ?? step.agentId,
      status: 'todo' as const,
      botType: agentConfig?.botType ?? step.agentId,
      instanceId: step.instanceId,
      createdAt: kanbanTask.createdAt.toISOString(),
    },
  })
}

// Start parallel execution: compute groups and run first group
export async function startParallelExecution(
  conversationId: string,
  steps: OrchestratorStep[],
  userId: string,
  modelOverride?: string,
  imageUrl?: string
): Promise<void> {
  broadcast(conversationId, {
    type: 'coordination_start',
    agents: steps.map(s => {
      const agentConfig = getAgentConfig(s.agentId)
      return { agentId: s.agentId, agentName: agentConfig?.name ?? s.agentId, task: s.userDescription || s.task }
    }),
  })

  const rawGroups = topologicalSortGroups(steps)
  const executionGroups = ensureSequentialVisualAgents(rawGroups, steps)
  console.log(`[Parallel] ${steps.length} steps in ${executionGroups.length} groups:`, executionGroups.map(g => g.instanceIds))

  const plan: ExecutingPlan = {
    steps,
    executionGroups,
    currentGroupIndex: 0,
    completedInstances: [],
    agentOutputs: {},
    conversationId,
    userId,
    modelOverride,
    imageUrl,
  }

  await setExecutingPlan(conversationId, plan)

  // Create 'todo' kanban tasks for steps that don't already have one (in parallel)
  await Promise.all(steps.map(async (step) => {
    const existing = await prisma.kanbanTask.findFirst({
      where: { conversationId, instanceId: step.instanceId },
    })
    if (!existing) {
      await createTodoKanbanTask(conversationId, step)
    }
  }))

  await executeCurrentGroup(plan)
}

// Execute ALL steps in the current group in parallel
export async function executeCurrentGroup(plan: ExecutingPlan): Promise<void> {
  const { conversationId } = plan
  const group = plan.executionGroups[plan.currentGroupIndex]

  if (!group) {
    // All groups done
    await removeExecutingPlan(conversationId)
    broadcast(conversationId, { type: 'coordination_end' })
    suggestProjectIfNeeded(conversationId).catch(console.error)
    return
  }

  const stepsInGroup = group.instanceIds
    .map(iid => plan.steps.find(s => s.instanceId === iid))
    .filter((s): s is OrchestratorStep => !!s)

  if (stepsInGroup.length === 0) {
    // Empty group, skip
    plan.currentGroupIndex++
    await setExecutingPlan(conversationId, plan)
    await executeCurrentGroup(plan)
    return
  }

  console.log(`[Parallel] Executing group ${plan.currentGroupIndex}: ${group.instanceIds.join(', ')}`)

  // Execute ALL steps in this group in parallel
  await Promise.all(stepsInGroup.map(step => executeSingleStep(plan, step)))

  // All steps in group completed — mark them
  for (const step of stepsInGroup) {
    if (!plan.completedInstances.includes(step.instanceId)) {
      plan.completedInstances.push(step.instanceId)
    }
  }
  await setExecutingPlan(conversationId, plan)

  // Check if any refine-capable agents were in this group (visual + project agents)
  const visualSteps = stepsInGroup.filter(s => REFINE_AGENT_IDS.includes(s.agentId))
  const lastVisual = visualSteps.length > 0 ? visualSteps[visualSteps.length - 1] : null

  // Check if there's a next group
  const nextGroupIndex = plan.currentGroupIndex + 1
  const nextGroup = plan.executionGroups[nextGroupIndex]

  // Calculate completed steps count for progress
  const completedCount = plan.completedInstances.length
  const totalCount = plan.steps.length

  if (!nextGroup) {
    // Last group
    if (visualSteps.length > 0) {
      // Broadcast step_complete for EACH visual step (supports multiple parallel projects)
      for (const vs of visualSteps) {
        const agentConfig = getAgentConfig(vs.agentId)
        broadcast(conversationId, {
          type: 'step_complete',
          agentId: vs.agentId,
          agentName: agentConfig?.name ?? vs.agentId,
          instanceId: vs.instanceId,
          summary: visualSteps.length > 1
            ? `${vs.userDescription ?? vs.task.slice(0, 60)} — listo. Puedes pedir cambios o finalizar.`
            : 'Propuesta lista. Puedes pedir cambios o finalizar.',
          stepIndex: completedCount - 1,
          totalSteps: totalCount,
          conversationId,
        })
      }
      return
    }

    // Non-visual last group → end
    await removeExecutingPlan(conversationId)
    broadcast(conversationId, { type: 'coordination_end' })
    suggestProjectIfNeeded(conversationId).catch(console.error)
    return
  }

  // There's a next group
  const nextSteps = nextGroup.instanceIds
    .map(iid => plan.steps.find(s => s.instanceId === iid))
    .filter((s): s is OrchestratorStep => !!s)
  const firstNextStep = nextSteps[0]
  const nextAgentConfig = firstNextStep ? getAgentConfig(firstNextStep.agentId) : null

  if (lastVisual) {
    // Visual agent in group → pause for refine before continuing
    // Broadcast for each visual step
    for (const vs of visualSteps) {
      const agentConfig = getAgentConfig(vs.agentId)
      broadcast(conversationId, {
        type: 'step_complete',
        agentId: vs.agentId,
        agentName: agentConfig?.name ?? vs.agentId,
        instanceId: vs.instanceId,
        summary: visualSteps.length > 1
          ? `${vs.userDescription ?? vs.task.slice(0, 60)} — listo. Puedes pedir cambios o continuar.`
          : 'Propuesta lista. Puedes pedir cambios o continuar.',
        nextAgentId: firstNextStep?.agentId,
        nextAgentName: nextAgentConfig?.name ?? firstNextStep?.agentId,
        nextInstanceId: firstNextStep?.instanceId,
        nextTask: firstNextStep?.task,
        stepIndex: completedCount - 1,
        totalSteps: totalCount,
        conversationId,
      })
    }
    return
  }

  // No visual agents in group — auto-advance to next group
  plan.currentGroupIndex++
  await setExecutingPlan(conversationId, plan)
  await executeCurrentGroup(plan)
}

// Execute a single step (one specific instance)
export async function executeSingleStep(plan: ExecutingPlan, step: OrchestratorStep): Promise<void> {
  const { conversationId, userId, modelOverride } = plan

  const agentConfig = getAgentConfig(step.agentId)
  if (!agentConfig) {
    console.warn(`[executeSingleStep] Agent config not found for ${step.agentId}`)
    return
  }

  // ─── Credit check before each agent execution ───
  const stepCreditCheck = await checkCredits(userId)
  if (!stepCreditCheck.allowed) {
    broadcast(conversationId, {
      type: 'credits_exhausted',
      balance: stepCreditCheck.balance,
      planId: stepCreditCheck.planId,
    })
    return
  }

  // ─── Video: open workflow editor instead of executing agent ───
  if (step.agentId === 'video') {
    // Mark kanban task as done
    const videoTask = await prisma.kanbanTask.findFirst({
      where: { conversationId, instanceId: step.instanceId },
    })
    if (videoTask) {
      await prisma.kanbanTask.update({ where: { id: videoTask.id }, data: { status: 'done' } })
      broadcast(conversationId, {
        type: 'kanban_update',
        task: {
          id: videoTask.id,
          title: videoTask.title,
          agent: videoTask.agent,
          status: 'done',
          botType: videoTask.botType,
          instanceId: videoTask.instanceId ?? undefined,
          deliverableId: videoTask.deliverableId ?? undefined,
          createdAt: videoTask.createdAt.toISOString(),
        },
      })
    }

    // Send SSE event to open the workflow editor with the prompt
    broadcast(conversationId, {
      type: 'open_workflow',
      prompt: step.task,
      agentId: step.agentId,
      instanceId: step.instanceId,
    })

    // Mark step as completed so pipeline can continue
    plan.agentOutputs[step.instanceId] = 'Video workflow opened for user'
    return
  }

  // Check if bot is globally disabled by superadmin
  const globalBotConfig = await prisma.globalBotConfig.findUnique({
    where: { botId: step.agentId },
  })
  if (globalBotConfig && !globalBotConfig.isActive) {
    const disabledMsg = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Sistema',
        text: `El bot ${agentConfig.name} esta temporalmente deshabilitado. Intenta de nuevo mas tarde.`,
        type: 'agent',
        botType: 'system',
      },
    })
    broadcast(conversationId, {
      type: 'agent_end',
      agentId: 'system',
      messageId: disabledMsg.id,
      fullText: disabledMsg.text,
    })
    return
  }

  // Update kanban task from 'todo' to 'doing'
  const existingTask = await prisma.kanbanTask.findFirst({
    where: { conversationId, instanceId: step.instanceId },
  })
  if (existingTask && existingTask.status === 'todo') {
    await prisma.kanbanTask.update({
      where: { id: existingTask.id },
      data: { status: 'doing' },
    })
    broadcast(conversationId, {
      type: 'kanban_update',
      task: {
        id: existingTask.id,
        title: existingTask.title,
        agent: existingTask.agent,
        status: 'doing' as const,
        botType: existingTask.botType,
        instanceId: step.instanceId,
        createdAt: existingTask.createdAt.toISOString(),
      },
    })
  }

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: agentConfig.id,
    agentName: agentConfig.name,
    instanceId: step.instanceId,
    step: 'Preparando contexto de trabajo...',
  })

  // Build context from dependencies (now references instanceIds)
  let contextBlock = ''
  let devExtensionMode = false
  if (step.dependsOn) {
    for (const depInstanceId of step.dependsOn) {
      const depStep = plan.steps.find(s => s.instanceId === depInstanceId)
      if (depStep && plan.agentOutputs[depInstanceId]) {
        const depAgent = getAgentConfig(depStep.agentId)

        // Dev-to-dev dependency: pass the project files for extension mode
        if (agentConfig.id === 'dev' && depStep.agentId === 'dev') {
          try {
            const prevDeliverable = await prisma.deliverable.findFirst({
              where: { conversationId, instanceId: depInstanceId },
              orderBy: { createdAt: 'desc' },
            })
            if (prevDeliverable) {
              devExtensionMode = true
              contextBlock += `\n\n--- MODO EXTENSION: ARCHIVOS DEL PROYECTO EXISTENTE (${depInstanceId}) ---
Debes tomar estos archivos como base y AGREGAR/MODIFICAR solo lo necesario.
NO reescribas archivos que no necesiten cambios. Solo incluye en tu respuesta los archivos nuevos o modificados.
El proyecto ya tiene la estructura de archivos listada abajo funcionando.

ARCHIVOS EXISTENTES:
${prevDeliverable.content}
--- FIN ARCHIVOS EXISTENTES ---`
              broadcast(conversationId, {
                type: 'agent_thinking',
                agentId: agentConfig.id,
                agentName: agentConfig.name,
                instanceId: step.instanceId,
                step: `Extendiendo proyecto existente con nuevo modulo...`,
              })
              continue
            }
          } catch (err) {
            console.error(`[${agentConfig.name}:${step.instanceId}] Error fetching prev deliverable:`, err)
          }
        }

        const depOutput = plan.agentOutputs[depInstanceId]
        contextBlock += `\n\n--- Contexto de ${depAgent?.name ?? depStep.agentId} (${depAgent?.role ?? 'agente'}) [${depInstanceId}] ---\n${depOutput}\n--- Fin contexto ---`
        broadcast(conversationId, {
          type: 'agent_thinking',
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          instanceId: step.instanceId,
          step: `Leyendo resultados de ${depAgent?.name ?? depStep.agentId}...`,
        })
      }
    }
  }

  // Backend context disabled for dev agent (multi-file projects use local state)
  let backendContext = ''
  const devTemplateContext = agentConfig.id === 'dev'
    ? buildDevTemplateContext(step.task)
    : ''
  const devDesignPackContext = agentConfig.id === 'dev'
    ? buildDevDesignPackContext(step.task)
    : ''
  const devCanonicalExamplesContext = agentConfig.id === 'dev'
    ? buildDevCanonicalExamplesContext()
    : ''

  // Append image URL to task so agents can reference it in tool calls (e.g. remove_background)
  const imageContext = plan.imageUrl ? `\n\n[Imagen adjunta por el usuario: ${plan.imageUrl}]` : ''
  const taskPrompt = `${step.task}${devTemplateContext}${devDesignPackContext}${devCanonicalExamplesContext}${contextBlock}${backendContext}${imageContext}`

  // History limit: enough context for cache hits (cache reads cost 0.1x)
  const historyLimit = 20
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: historyLimit,
  })

  // Build task message, attaching user-uploaded image if available
  const taskMessage: LLMMessage = { role: 'user' as const, content: taskPrompt }
  if (plan.imageUrl) {
    const encoded = await readAndEncodeImage(plan.imageUrl)
    if (encoded) {
      taskMessage.images = [{ type: 'image', source: encoded.source, mediaType: encoded.mediaType }]
    }
  }

  // Include user + agent messages for cache continuity (Anthropic requires alternating roles)
  const historyMessages: LLMMessage[] = []
  for (const m of history) {
    const role = m.type === 'user' ? 'user' as const : 'assistant' as const
    // Skip consecutive same-role messages (Anthropic requires alternation)
    if (historyMessages.length > 0 && historyMessages[historyMessages.length - 1].role === role) continue
    // Truncate long agent responses in history to save tokens (keep first 500 chars as context)
    const content = role === 'assistant' && m.text.length > 500
      ? m.text.substring(0, 500) + '...[truncated]'
      : m.text
    historyMessages.push({ role, content })
  }
  // Ensure last history message is assistant so taskMessage (user) can follow
  if (historyMessages.length > 0 && historyMessages[historyMessages.length - 1].role === 'user') {
    historyMessages.pop()
  }

  const messages: LLMMessage[] = [
    ...historyMessages,
    taskMessage,
  ]

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: agentConfig.id,
    agentName: agentConfig.name,
    instanceId: step.instanceId,
    step: 'Generando respuesta...',
  })

  // Visual agents (Nova, Pixel, Spark, Reel) work silently — no token streaming
  const isVisualAgent = VISUAL_AGENT_IDS.includes(agentConfig.id)

  // Resolve model BEFORE broadcast so we can include it in agent_start
  const rawAgentModelConfig = modelOverride
    ? resolveModelConfig(modelOverride, agentConfig.modelConfig) ?? agentConfig.modelConfig
    : agentConfig.modelConfig

  const agentModelConfig = await resolveAvailableConfig(rawAgentModelConfig)
  if (!agentModelConfig) {
    broadcast(conversationId, {
      type: 'error',
      message: `El proveedor ${rawAgentModelConfig.provider} no esta disponible. Verifica las API keys en el panel de administracion.`,
    })
    return
  }

  broadcast(conversationId, {
    type: 'agent_start',
    agentId: agentConfig.id,
    agentName: agentConfig.name,
    instanceId: step.instanceId,
    task: step.task,
    model: agentModelConfig.model,
  })
  const provider = getProvider(agentModelConfig)
  let agentFullText = ''
  let agentUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 }
  let agentCreditsCost = 0

  const agentTools = agentConfig.tools
  if (agentTools.length > 0) {
    const { getToolDefinitions } = await import('./tools/executor.js')
    const toolDefs = await getToolDefinitions(agentTools, userId)

    await provider.streamWithTools(agentConfig.systemPrompt, messages, toolDefs, {
      onToken: (token) => {
        if (!isVisualAgent) {
          broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
        }
      },
      onThinking: (text) => {
        broadcast(conversationId, { type: 'thinking_update', agentId: agentConfig.id, instanceId: step.instanceId, content: text })
      },
      onComplete: async (fullText, usage) => {
        agentFullText = fullText
        agentUsage = usage
        plan.agentOutputs[step.instanceId] = fullText
        await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
        const creditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
        agentCreditsCost += creditResult.creditsUsed
        broadcast(conversationId, { type: 'credit_update', creditsUsed: creditResult.creditsUsed, balance: creditResult.balance })
      },
      onError: (err) => {
        console.error(`[${agentConfig.name}:${step.instanceId}] Error:`, err)
        broadcast(conversationId, { type: 'error', message: `Error en ${agentConfig.name}` })
      },
      onToolCall: async (toolCall) => {
        broadcast(conversationId, {
          type: 'agent_thinking',
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          instanceId: step.instanceId,
          step: `Ejecutando herramienta: ${toolCall.name}...`,
        })
        return await executeToolCall(toolCall, conversationId, agentConfig, userId, step.instanceId)
      },
    })
  } else {
    await provider.stream(agentConfig.systemPrompt, messages, {
      onToken: (token) => {
        if (!isVisualAgent) {
          broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
        }
      },
      onThinking: (text) => {
        broadcast(conversationId, { type: 'thinking_update', agentId: agentConfig.id, instanceId: step.instanceId, content: text })
      },
      onComplete: async (fullText, usage) => {
        agentFullText = fullText
        agentUsage = usage
        plan.agentOutputs[step.instanceId] = fullText
        await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
        const creditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
        agentCreditsCost += creditResult.creditsUsed
        broadcast(conversationId, { type: 'credit_update', creditsUsed: creditResult.creditsUsed, balance: creditResult.balance })
      },
      onError: (err) => {
        console.error(`[${agentConfig.name}:${step.instanceId}] Error:`, err)
        broadcast(conversationId, { type: 'error', message: `Error en ${agentConfig.name}` })
      },
    })
  }

  // Create deliverable
  console.log(`[${agentConfig.name}:${step.instanceId}] Response length: ${agentFullText.length} chars`)

  // Dev agent always outputs multi-file JSON (React/Vite projects)
  if (agentConfig.id === 'dev') {
    console.log(`[${agentConfig.name}:${step.instanceId}] DEV V2 mode — parsing multi-file JSON output`)
    let projectJson = agentFullText.trim()
    try {
      let files = parseProjectFilesFromText(projectJson).files

      // Extension mode: merge new/modified files with the previous deliverable's files
      if (devExtensionMode && step.dependsOn) {
        for (const depInstanceId of step.dependsOn) {
          const depStep = plan.steps.find(s => s.instanceId === depInstanceId)
          if (depStep?.agentId === 'dev') {
            const prevDeliverable = await prisma.deliverable.findFirst({
              where: { conversationId, instanceId: depInstanceId },
              orderBy: { createdAt: 'desc' },
            })
            if (prevDeliverable) {
              try {
                const prevFiles = JSON.parse(prevDeliverable.content)
                if (Array.isArray(prevFiles)) {
                  const newFilePaths = new Set((files as any[]).map((f: any) => f.path))
                  const merged = [
                    ...prevFiles.filter((f: any) => !newFilePaths.has(f.path)),
                    ...files,
                  ]
                  console.log(`[${agentConfig.name}:${step.instanceId}] Extension mode: merged ${(files as any[]).length} new/modified files with ${prevFiles.length} existing (total: ${merged.length})`)
                  files = merged
                }
              } catch {
                console.warn(`[${agentConfig.name}:${step.instanceId}] Could not parse previous deliverable for merge`)
              }
            }
          }
        }
      }

      console.log(`[${agentConfig.name}:${step.instanceId}] Parsed ${files.length} project files: ${files.map((f: any) => f.path).join(', ')}`)
      projectJson = JSON.stringify(files)
    } catch (err) {
      console.error(`[${agentConfig.name}:${step.instanceId}] Failed to parse multi-file JSON:`, err)
      // For dev v2, don't fall through to HTML — send error to user
      broadcast(conversationId, { type: 'error', message: `Error al generar proyecto: ${(err as Error).message}. Intenta de nuevo.` })
      return
    }

    if (projectJson.startsWith('[')) {
      const deliverableType = 'code' as const
      const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 60)}`

      const versionInfo = await getNextVersionInfo(conversationId, step.instanceId)
      const deliverableId = uuid()
      const deliverable = await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId,
          title: deliverableTitle,
          type: deliverableType,
          content: projectJson,
          agent: agentConfig.name,
          botType: agentConfig.botType,
          instanceId: step.instanceId,
          version: versionInfo.version,
          parentId: versionInfo.parentId,
        },
      })

      broadcast(conversationId, {
        type: 'deliverable',
        deliverable: {
          id: deliverable.id,
          title: deliverable.title,
          type: deliverableType,
          content: deliverable.content,
          agent: deliverable.agent,
          botType: deliverable.botType,
          version: versionInfo.version,
          versionCount: versionInfo.version,
        },
      })

      // Update kanban task
      const existingKanban = await prisma.kanbanTask.findFirst({
        where: { conversationId, instanceId: step.instanceId },
      })

      let kanbanTaskId: string
      let kanbanCreatedAt: string

      if (existingKanban) {
        await prisma.kanbanTask.update({
          where: { id: existingKanban.id },
          data: { deliverableId, title: deliverableTitle, status: 'done' },
        })
        kanbanTaskId = existingKanban.id
        kanbanCreatedAt = existingKanban.createdAt.toISOString()
      } else {
        kanbanTaskId = uuid()
        const newTask = await prisma.kanbanTask.create({
          data: {
            id: kanbanTaskId,
            conversationId,
            title: deliverableTitle,
            agent: agentConfig.name,
            status: 'done',
            botType: agentConfig.botType,
            deliverableId,
            instanceId: step.instanceId,
          },
        })
        kanbanCreatedAt = newTask.createdAt.toISOString()
      }

      broadcast(conversationId, {
        type: 'kanban_update',
        task: {
          id: kanbanTaskId,
          title: deliverableTitle,
          agent: agentConfig.name,
          status: 'done' as const,
          botType: agentConfig.botType,
          deliverableId,
          instanceId: step.instanceId,
          createdAt: kanbanCreatedAt,
          deliverable: {
            id: deliverable.id,
            title: deliverable.title,
            type: deliverableType,
            content: deliverable.content,
            agent: deliverable.agent,
            botType: deliverable.botType,
          },
        },
      })

      const agentMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: agentConfig.name,
          text: `Proyecto generado con ${JSON.parse(projectJson).length} archivos. Ver en el canvas.`,
          type: 'agent',
          botType: agentConfig.botType,
        },
      })

      broadcast(conversationId, {
        type: 'agent_end',
        agentId: agentConfig.id,
        instanceId: step.instanceId,
        messageId: agentMsg.id,
        fullText: agentMsg.text,
        model: agentModelConfig.model,
        inputTokens: agentUsage.inputTokens,
        outputTokens: agentUsage.outputTokens,
        creditsCost: agentCreditsCost,
      })

      return // Skip normal HTML processing
    }
  }

  let htmlBlock = extractHtmlBlock(agentFullText)
  console.log(`[${agentConfig.name}:${step.instanceId}] HTML block: ${htmlBlock ? `YES (${htmlBlock.length} chars)` : 'NO - using text wrapper'}`)

  // Auto-fix validation errors for visual agents: 1 retry max, then sanitize
  if (htmlBlock && VISUAL_AGENT_IDS.includes(agentConfig.id)) {
    const validationErrors = validateHtml(htmlBlock)
    if (validationErrors.length > 0) {
      // Only retry if errors are structural (not just missing CDN)
      const structuralErrors = validationErrors.filter(e => e.includes('Unbalanced'))
      if (structuralErrors.length > 0) {
        console.log(`[${agentConfig.name}:${step.instanceId}] Validation errors: ${validationErrors.join(', ')} — trying sanitizer...`)
        // Try server-side sanitizer first (free, instant)
        const sanitized = sanitizeHtml(htmlBlock)
        const sanitizedErrors = validateHtml(sanitized)
        if (sanitizedErrors.filter(e => e.includes('Unbalanced')).length === 0) {
          console.log(`[${agentConfig.name}:${step.instanceId}] Sanitizer fixed all structural errors`)
          htmlBlock = sanitized
        } else {
          // Sanitizer wasn't enough — do 1 LLM retry
          console.log(`[${agentConfig.name}:${step.instanceId}] Sanitizer insufficient, retrying with LLM...`)
          broadcast(conversationId, {
            type: 'agent_thinking',
            agentId: agentConfig.id,
            agentName: agentConfig.name,
            instanceId: step.instanceId,
            step: 'Corrigiendo errores detectados...',
          })

          const retryMessages: LLMMessage[] = [
            ...messages,
            { role: 'assistant' as const, content: agentFullText },
            { role: 'user' as const, content: `Tu HTML tiene los siguientes errores que debes corregir:\n\n${validationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nGenera el documento HTML completo corregido. Responde SOLO con el HTML, sin texto adicional.` },
          ]

          let retryText = ''
          await provider.stream(agentConfig.systemPrompt, retryMessages, {
            onToken: (token) => {
              broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
            },
            onComplete: async (fullText, usage) => {
              retryText = fullText
              await trackUsage(userId, agentConfig.id, agentModelConfig!.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
              const retryCreditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig!.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
              agentCreditsCost += retryCreditResult.creditsUsed
            },
            onError: (err) => {
              console.error(`[${agentConfig.name}:${step.instanceId}] Retry error:`, err)
            },
          })

          const retryHtml = extractHtmlBlock(retryText)
          if (retryHtml) {
            // Apply sanitizer to retry result too
            const sanitizedRetry = sanitizeHtml(retryHtml)
            const retryErrors = validateHtml(sanitizedRetry)
            if (retryErrors.filter(e => e.includes('Unbalanced')).length < structuralErrors.length) {
              console.log(`[${agentConfig.name}:${step.instanceId}] Retry+sanitizer improved: ${structuralErrors.length} → ${retryErrors.filter(e => e.includes('Unbalanced')).length} structural errors`)
              agentFullText = retryText
              htmlBlock = sanitizedRetry
              plan.agentOutputs[step.instanceId] = retryText
            } else {
              // Retry didn't help — use sanitized original
              console.log(`[${agentConfig.name}:${step.instanceId}] Retry didn't improve, using sanitized original`)
              htmlBlock = sanitized
            }
          } else {
            // Retry produced no HTML — use sanitized original
            htmlBlock = sanitized
          }
        }
      }
    }
  }

  const deliverableType = DELIVERABLE_TYPE_MAP[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 60)}`

  let deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)

  // Fix localhost URLs → relative (LLM sometimes builds absolute URLs from tool results)
  deliverableContentRaw = deliverableContentRaw.replace(/https?:\/\/localhost:\d+/g, '')

  // Inject error-catching script and visual editor for visual agents
  if (htmlBlock && VISUAL_AGENT_IDS.includes(agentConfig.id)) {
    const errorScript = `<script>window.onerror=function(msg,url,line,col){window.parent.postMessage({type:'iframe-error',error:String(msg),line:line},'*');}</script>`
    deliverableContentRaw = deliverableContentRaw.replace('</head>', `${errorScript}\n</head>`)
    deliverableContentRaw = deliverableContentRaw.replace('</body>', `${VISUAL_EDITOR_SCRIPT}\n</body>`)

    // Inject logo selection script for brand agent (logo deliverables)
    if (agentConfig.id === 'brand') {
      deliverableContentRaw = deliverableContentRaw.replace('</body>', `${LOGO_SELECTION_SCRIPT}\n</body>`)
    }
  }

  const cdnBase = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`
  const deliverableContent = deliverableContentRaw
    .replace(/src="\/uploads\//g, `src="${cdnBase}/uploads/`)
    .replace(/src='\/uploads\//g, `src='${cdnBase}/uploads/`)

  const versionInfo = await getNextVersionInfo(conversationId, step.instanceId)
  const deliverableId = uuid()
  const deliverable = await prisma.deliverable.create({
    data: {
      id: deliverableId,
      conversationId,
      title: deliverableTitle,
      type: deliverableType,
      content: deliverableContent,
      agent: agentConfig.name,
      botType: agentConfig.botType,
      instanceId: step.instanceId,
      version: versionInfo.version,
      parentId: versionInfo.parentId,
    },
  })

  broadcast(conversationId, {
    type: 'deliverable',
    deliverable: {
      id: deliverable.id,
      title: deliverable.title,
      type: deliverable.type as typeof deliverableType,
      content: deliverable.content,
      agent: deliverable.agent,
      botType: deliverable.botType,
      version: versionInfo.version,
      versionCount: versionInfo.version,
    },
  })

  // Link deliverable to existing kanban task, or create one as fallback
  const existingKanban = await prisma.kanbanTask.findFirst({
    where: { conversationId, instanceId: step.instanceId },
  })

  let kanbanTaskId: string
  let kanbanCreatedAt: string

  if (existingKanban) {
    await prisma.kanbanTask.update({
      where: { id: existingKanban.id },
      data: { deliverableId, title: deliverableTitle, status: 'done' },
    })
    kanbanTaskId = existingKanban.id
    kanbanCreatedAt = existingKanban.createdAt.toISOString()
  } else {
    kanbanTaskId = uuid()
    const newTask = await prisma.kanbanTask.create({
      data: {
        id: kanbanTaskId,
        conversationId,
        title: deliverableTitle,
        agent: agentConfig.name,
        status: 'done',
        botType: agentConfig.botType,
        deliverableId,
        instanceId: step.instanceId,
      },
    })
    kanbanCreatedAt = newTask.createdAt.toISOString()
  }

  broadcast(conversationId, {
    type: 'kanban_update',
    task: {
      id: kanbanTaskId,
      title: deliverableTitle,
      agent: agentConfig.name,
      status: 'done' as const,
      botType: agentConfig.botType,
      deliverableId,
      instanceId: step.instanceId,
      createdAt: kanbanCreatedAt,
      deliverable: {
        id: deliverable.id,
        title: deliverable.title,
        type: deliverable.type as typeof deliverableType,
        content: deliverable.content,
        agent: deliverable.agent,
        botType: deliverable.botType,
      },
    },
  })

  // For visual agents, save only the summary text
  let messageText = agentFullText
  if (isVisualAgent && htmlBlock) {
    const htmlIdx = agentFullText.indexOf('```html')
    messageText = htmlIdx > 0
      ? agentFullText.substring(0, htmlIdx).trim()
      : `${agentConfig.name} genero una propuesta visual. Ver en el canvas.`
  }

  const agentMsg = await prisma.message.create({
    data: {
      id: uuid(),
      conversationId,
      sender: agentConfig.name,
      text: messageText,
      type: 'agent',
      botType: agentConfig.botType,
    },
  })

  broadcast(conversationId, {
    type: 'agent_end',
    agentId: agentConfig.id,
    instanceId: step.instanceId,
    messageId: agentMsg.id,
    fullText: messageText,
    model: agentModelConfig.model,
    inputTokens: agentUsage.inputTokens,
    outputTokens: agentUsage.outputTokens,
    creditsCost: agentCreditsCost,
  })
}

// Suggest creating a project if the conversation isn't already in one
async function suggestProjectIfNeeded(conversationId: string): Promise<void> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { projectId: true, title: true, userId: true },
  })
  if (!conv || conv.projectId || conv.userId === 'anonymous') return

  broadcast(conversationId, {
    type: 'project_suggest',
    conversationId,
    title: conv.title,
  })
}

// Post-process groups: ensure each refine-capable agent (visual + project) gets its own group
// so the user can approve/refine each output before the next one starts.
// Non-visual agents stay parallel as before.
export function ensureSequentialVisualAgents(
  groups: { instanceIds: string[] }[],
  steps: OrchestratorStep[]
): { instanceIds: string[] }[] {
  const result: { instanceIds: string[] }[] = []

  for (const group of groups) {
    const visual: string[] = []
    const nonVisual: string[] = []

    for (const iid of group.instanceIds) {
      const step = steps.find(s => s.instanceId === iid)
      if (step && REFINE_AGENT_IDS.includes(step.agentId)) {
        visual.push(iid)
      } else {
        nonVisual.push(iid)
      }
    }

    if (visual.length <= 1) {
      // 0 or 1 visual agents — keep group as-is
      result.push(group)
    } else {
      // Multiple visual agents — split them so each gets approval
      // Non-visual + first visual agent run together
      result.push({ instanceIds: [...nonVisual, visual[0]] })
      // Each remaining visual agent gets its own group
      for (let i = 1; i < visual.length; i++) {
        result.push({ instanceIds: [visual[i]] })
      }
    }
  }

  return result
}

// Topological sort into parallel execution groups (Kahn's algorithm by levels)
export function topologicalSortGroups(steps: OrchestratorStep[]): { instanceIds: string[] }[] {
  const stepMap = new Map(steps.map(s => [s.instanceId, s]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  // Initialize
  for (const step of steps) {
    inDegree.set(step.instanceId, 0)
    dependents.set(step.instanceId, [])
  }

  // Build dependency graph
  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (stepMap.has(depId)) {
          inDegree.set(step.instanceId, (inDegree.get(step.instanceId) ?? 0) + 1)
          dependents.get(depId)?.push(step.instanceId)
        }
      }
    }
  }

  // Kahn's algorithm — group by levels
  const groups: { instanceIds: string[] }[] = []
  let queue = steps
    .filter(s => (inDegree.get(s.instanceId) ?? 0) === 0)
    .map(s => s.instanceId)

  while (queue.length > 0) {
    groups.push({ instanceIds: [...queue] })
    const nextQueue: string[] = []

    for (const id of queue) {
      for (const dep of (dependents.get(id) ?? [])) {
        const newDegree = (inDegree.get(dep) ?? 1) - 1
        inDegree.set(dep, newDegree)
        if (newDegree === 0) {
          nextQueue.push(dep)
        }
      }
    }

    queue = nextQueue
  }

  return groups
}
