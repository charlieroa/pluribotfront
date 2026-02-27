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
import { extractDesignContext, validateHtml, extractHtmlBlock, wrapTextAsHtml, VISUAL_EDITOR_SCRIPT } from './html-utils.js'
import { readAndEncodeImage } from './image-utils.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { executeToolCall } from './tools/executor.js'

// Protected files that Logic must never overwrite (they belong to the template base)
const LOGIC_PROTECTED_FILES = ['src/index.css', 'src/main.tsx']
const LOGIC_PROTECTED_PREFIXES = ['src/components/ui/']

function stripProtectedFiles(files: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {}
  for (const [path, content] of Object.entries(files)) {
    if (LOGIC_PROTECTED_FILES.includes(path)) {
      console.warn(`[Logic] Stripped protected file from output: ${path}`)
      continue
    }
    if (LOGIC_PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix))) {
      console.warn(`[Logic] Stripped protected file from output: ${path}`)
      continue
    }
    cleaned[path] = content
  }
  if (!cleaned['src/App.tsx']) {
    console.warn('[Logic] WARNING: output is missing src/App.tsx')
  }
  return cleaned
}

// Helper: robustly extract Logic agent JSON from LLM output
function extractLogicJson(text: string): { templateId: string; description: string; files: Record<string, string> } {
  // Try 1: code fence ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* try next */ }
  }
  // Try 2: raw JSON parse
  try { return JSON.parse(text.trim()) } catch { /* try next */ }
  // Try 3: find first { ... } block containing "templateId"
  const braceStart = text.indexOf('{')
  if (braceStart >= 0) {
    let depth = 0
    let end = -1
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end > braceStart) {
      const candidate = text.slice(braceStart, end + 1)
      try {
        const parsed = JSON.parse(candidate)
        if (parsed.templateId || parsed.files) return parsed
      } catch { /* fall through */ }
    }
  }
  throw new Error('Could not extract valid JSON from Logic output')
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
    if (lastVisual) {
      // Visual agent in last group → enter refine mode
      const agentConfig = getAgentConfig(lastVisual.agentId)
      broadcast(conversationId, {
        type: 'step_complete',
        agentId: lastVisual.agentId,
        agentName: agentConfig?.name ?? lastVisual.agentId,
        instanceId: lastVisual.instanceId,
        summary: 'Propuesta lista. Puedes pedir cambios o finalizar.',
        stepIndex: completedCount - 1,
        totalSteps: totalCount,
        conversationId,
      })
      return
    }

    // Non-visual last group → end
    await removeExecutingPlan(conversationId)
    broadcast(conversationId, { type: 'coordination_end' })
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
    const agentConfig = getAgentConfig(lastVisual.agentId)
    broadcast(conversationId, {
      type: 'step_complete',
      agentId: lastVisual.agentId,
      agentName: agentConfig?.name ?? lastVisual.agentId,
      instanceId: lastVisual.instanceId,
      summary: 'Propuesta lista. Puedes pedir cambios o continuar.',
      nextAgentId: firstNextStep?.agentId,
      nextAgentName: nextAgentConfig?.name ?? firstNextStep?.agentId,
      nextInstanceId: firstNextStep?.instanceId,
      nextTask: firstNextStep?.task,
      stepIndex: completedCount - 1,
      totalSteps: totalCount,
      conversationId,
    })
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

  // Check if bot is active for the user (skip for anonymous/non-registered users)
  if (userId !== 'anonymous') {
    const userBot = await prisma.userBot.findUnique({
      where: { userId_botId: { userId, botId: step.agentId } },
    })
    if (userBot && !userBot.isActive) {
      broadcast(conversationId, {
        type: 'bot_inactive',
        botId: step.agentId,
        botName: agentConfig.name,
        stepTask: step.task,
        conversationId,
      })
      return
    }
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
  if (step.dependsOn) {
    for (const depInstanceId of step.dependsOn) {
      const depStep = plan.steps.find(s => s.instanceId === depInstanceId)
      if (depStep && plan.agentOutputs[depInstanceId]) {
        const depAgent = getAgentConfig(depStep.agentId)
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

  const taskPrompt = `${step.task}${contextBlock}`

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  // Build task message, attaching user-uploaded image if available
  const taskMessage: LLMMessage = { role: 'user' as const, content: taskPrompt }
  if (plan.imageUrl) {
    const encoded = await readAndEncodeImage(plan.imageUrl)
    if (encoded) {
      taskMessage.images = [{ type: 'image', source: encoded.source, mediaType: encoded.mediaType }]
    }
  }

  const messages: LLMMessage[] = [
    ...history.filter(m => m.type === 'user').map(m => ({
      role: 'user' as const,
      content: m.text,
    })),
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

  broadcast(conversationId, {
    type: 'agent_start',
    agentId: agentConfig.id,
    agentName: agentConfig.name,
    instanceId: step.instanceId,
    task: step.task,
  })

  // Use modelOverride if provided, otherwise agent's default
  const rawAgentModelConfig = modelOverride
    ? resolveModelConfig(modelOverride, agentConfig.modelConfig) ?? agentConfig.modelConfig
    : agentConfig.modelConfig

  // Check provider availability, try fallback if needed
  const agentModelConfig = await resolveAvailableConfig(rawAgentModelConfig)
  if (!agentModelConfig) {
    broadcast(conversationId, {
      type: 'error',
      message: `El proveedor ${rawAgentModelConfig.provider} no esta disponible. Verifica las API keys en el panel de administracion.`,
    })
    return
  }
  const provider = getProvider(agentModelConfig)
  let agentFullText = ''
  let agentUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 }
  let agentCreditsCost = 0

  const agentTools = agentConfig.tools
  if (agentTools.length > 0) {
    const { getToolDefinitions } = await import('./tools/executor.js')
    const toolDefs = getToolDefinitions(agentTools)

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
        await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
        const creditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens)
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
        return await executeToolCall(toolCall, conversationId, agentConfig, userId)
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
        await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
        const creditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens)
        agentCreditsCost += creditResult.creditsUsed
        broadcast(conversationId, { type: 'credit_update', creditsUsed: creditResult.creditsUsed, balance: creditResult.balance })
      },
      onError: (err) => {
        console.error(`[${agentConfig.name}:${step.instanceId}] Error:`, err)
        broadcast(conversationId, { type: 'error', message: `Error en ${agentConfig.name}` })
      },
    })
  }

  // ─── Logic agent: parse JSON and broadcast logic_project ───
  if (agentConfig.id === 'logic') {
    try {
      const logicData = extractLogicJson(agentFullText)
      const { templateId, description } = logicData
      const files = stripProtectedFiles(logicData.files || {})

      broadcast(conversationId, {
        type: 'logic_project',
        templateId: templateId || 'blank',
        description: description || '',
        files,
      })

      // Save deliverable as code type
      const deliverableId = uuid()
      await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId,
          title: `Logic: ${description || step.task.slice(0, 60)}`,
          type: 'code',
          content: agentFullText,
          agent: agentConfig.name,
          botType: agentConfig.botType,
          instanceId: step.instanceId,
        },
      })

      // Update kanban
      const kanbanTask = await prisma.kanbanTask.findFirst({
        where: { conversationId, instanceId: step.instanceId },
      })
      if (kanbanTask) {
        await prisma.kanbanTask.update({
          where: { id: kanbanTask.id },
          data: { deliverableId, status: 'done' },
        })
        broadcast(conversationId, {
          type: 'kanban_update',
          task: { id: kanbanTask.id, title: kanbanTask.title, agent: agentConfig.name, status: 'done' as const, botType: agentConfig.botType, deliverableId, instanceId: step.instanceId, createdAt: kanbanTask.createdAt.toISOString() },
        })
      }

      // Save agent message
      const agentMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: agentConfig.name,
          text: `Logic genero un proyecto: ${description || 'Ver en el IDE'}`,
          type: 'agent',
          botType: agentConfig.botType,
        },
      })

      broadcast(conversationId, {
        type: 'agent_end',
        agentId: agentConfig.id,
        instanceId: step.instanceId,
        messageId: agentMsg.id,
        fullText: `Logic genero un proyecto: ${description || 'Ver en el IDE'}`,
        model: agentModelConfig.model,
        inputTokens: agentUsage.inputTokens,
        outputTokens: agentUsage.outputTokens,
        creditsCost: agentCreditsCost,
      })
      return
    } catch (parseErr) {
      console.error(`[Logic:${step.instanceId}] JSON parse error, falling back to normal flow:`, parseErr)
    }
  }

  // Create deliverable
  console.log(`[${agentConfig.name}:${step.instanceId}] Response length: ${agentFullText.length} chars`)
  let htmlBlock = extractHtmlBlock(agentFullText)
  console.log(`[${agentConfig.name}:${step.instanceId}] HTML block: ${htmlBlock ? `YES (${htmlBlock.length} chars)` : 'NO - using text wrapper'}`)

  // Auto-retry on validation errors for visual agents
  if (htmlBlock && VISUAL_AGENT_IDS.includes(agentConfig.id)) {
    const validationErrors = validateHtml(htmlBlock)
    if (validationErrors.length > 0) {
      console.log(`[${agentConfig.name}:${step.instanceId}] Validation errors: ${validationErrors.join(', ')} — retrying...`)
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
          await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
          const retryCreditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens)
          agentCreditsCost += retryCreditResult.creditsUsed
        },
        onError: (err) => {
          console.error(`[${agentConfig.name}:${step.instanceId}] Retry error:`, err)
        },
      })

      const retryHtml = extractHtmlBlock(retryText)
      if (retryHtml) {
        const retryErrors = validateHtml(retryHtml)
        if (retryErrors.length < validationErrors.length) {
          console.log(`[${agentConfig.name}:${step.instanceId}] Retry improved: ${validationErrors.length} → ${retryErrors.length} errors`)
          agentFullText = retryText
          htmlBlock = retryHtml
          plan.agentOutputs[step.instanceId] = retryText
        }
      }
    }
  }

  const deliverableTypeMap: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video'> = {
    seo: 'report',
    brand: 'design',
    web: 'design',
    social: 'design',
    ads: 'copy',
    video: 'video',
    logic: 'code',
  }
  const deliverableType = deliverableTypeMap[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 60)}`

  let deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)

  // Inject error-catching script and visual editor for visual agents
  if (htmlBlock && VISUAL_AGENT_IDS.includes(agentConfig.id)) {
    const errorScript = `<script>window.onerror=function(msg,url,line,col){window.parent.postMessage({type:'iframe-error',error:String(msg),line:line},'*');}</script>`
    deliverableContentRaw = deliverableContentRaw.replace('</head>', `${errorScript}\n</head>`)
    deliverableContentRaw = deliverableContentRaw.replace('</body>', `${VISUAL_EDITOR_SCRIPT}\n</body>`)
  }

  const cdnBase = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`
  const deliverableContent = deliverableContentRaw
    .replace(/src="\/uploads\//g, `src="${cdnBase}/uploads/`)
    .replace(/src='\/uploads\//g, `src='${cdnBase}/uploads/`)

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
