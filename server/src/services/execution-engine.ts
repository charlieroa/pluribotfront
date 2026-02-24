import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { getAgentConfig, VISUAL_AGENT_IDS, PROJECT_AGENT_IDS, REFINE_AGENT_IDS } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { checkCredits, consumeCredits } from './credit-tracker.js'
import {
  getExecutingPlan, setExecutingPlan, removeExecutingPlan,
  type ExecutingPlan, type OrchestratorStep,
} from './plan-cache.js'
import type { LLMMessage, LLMUsage } from './llm/types.js'
import { extractDesignContext, validateHtml, extractHtmlBlock, wrapTextAsHtml, VISUAL_EDITOR_SCRIPT } from './html-utils.js'
import { parseArtifact, bundleToHtml } from './artifact-parser.js'
import { ArtifactStreamer } from './artifact-streamer.js'
import { readAndEncodeImage } from './image-utils.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { executeToolCall } from './tools/executor.js'
import type { ProjectArtifact } from '../../../shared/types.js'

/**
 * Validate a project artifact for common syntax issues via regex heuristics.
 * Returns an array of error descriptions (empty = valid).
 */
export function validateProjectArtifact(artifact: ProjectArtifact): string[] {
  const errors: string[] = []
  const warnings: string[] = []

  // ─── Structural checks (blocking) ───

  // 1. App.tsx is required
  const hasAppFile = artifact.files.some(f =>
    f.filePath === 'src/App.tsx' || f.filePath === 'src/App.jsx' ||
    f.filePath === 'src/App.ts' || f.filePath === 'src/App.js'
  )
  if (!hasAppFile) {
    errors.push('Missing src/App.tsx — the entry point file is required')
  }

  // 2. Default export in App.tsx
  const appFile = artifact.files.find(f =>
    /^src\/App\.(tsx?|jsx?)$/.test(f.filePath)
  )
  if (appFile && !appFile.content.includes('export default')) {
    errors.push(`${appFile.filePath}: Missing 'export default' — App component must have a default export`)
  }

  // Prohibited packages (no UMD builds available)
  const PROHIBITED_PACKAGES = ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'react-beautiful-dnd', '@tanstack/react-table']

  for (const file of artifact.files) {
    if (!/\.(tsx?|jsx?|ts|js)$/.test(file.filePath)) continue
    const { content, filePath } = file

    // Check unclosed braces/brackets
    let braces = 0, brackets = 0, parens = 0
    let inString = false, stringChar = ''
    let inTemplate = false, inLineComment = false, inBlockComment = false

    for (let i = 0; i < content.length; i++) {
      const ch = content[i]
      const prev = i > 0 ? content[i - 1] : ''

      if (inLineComment) {
        if (ch === '\n') inLineComment = false
        continue
      }
      if (inBlockComment) {
        if (ch === '/' && prev === '*') inBlockComment = false
        continue
      }
      if (ch === '/' && content[i + 1] === '/') { inLineComment = true; continue }
      if (ch === '/' && content[i + 1] === '*') { inBlockComment = true; continue }

      if (inString) {
        if (ch === stringChar && prev !== '\\') inString = false
        continue
      }
      if (inTemplate) {
        if (ch === '`' && prev !== '\\') inTemplate = false
        continue
      }

      if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue }
      if (ch === '`') { inTemplate = true; continue }

      if (ch === '{') braces++
      else if (ch === '}') braces--
      else if (ch === '[') brackets++
      else if (ch === ']') brackets--
      else if (ch === '(') parens++
      else if (ch === ')') parens--
    }

    if (braces !== 0) errors.push(`${filePath}: ${braces > 0 ? 'Unclosed' : 'Extra closing'} curly brace (off by ${Math.abs(braces)})`)
    if (brackets !== 0) errors.push(`${filePath}: ${brackets > 0 ? 'Unclosed' : 'Extra closing'} bracket (off by ${Math.abs(brackets)})`)
    if (parens !== 0) errors.push(`${filePath}: ${parens > 0 ? 'Unclosed' : 'Extra closing'} parenthesis (off by ${Math.abs(parens)})`)

    // Check for imports referencing files not in the artifact
    const relativeImports = content.matchAll(/import\s+.*?\s+from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g)
    for (const match of relativeImports) {
      const importPath = match[1]
      // Resolve the import to check if the file exists in the artifact
      const dir = filePath.split('/').slice(0, -1).join('/')
      let resolved = importPath.startsWith('./')
        ? `${dir}/${importPath.slice(2)}`
        : importPath.replace(/^\.\.\//, '')

      const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']
      const found = extensions.some(ext =>
        artifact.files.some(f => f.filePath === resolved + ext)
      )
      if (!found) {
        errors.push(`${filePath}: Import '${importPath}' references a file not in the artifact`)
      }
    }

    // ─── Quality checks (warnings, included in errors array for auto-fix) ───

    // 3. BrowserRouter is prohibited (must use HashRouter or MemoryRouter)
    if (/BrowserRouter/.test(content)) {
      warnings.push(`${filePath}: Uses BrowserRouter — must use HashRouter or MemoryRouter for iframe preview`)
    }

    // 4. import.meta.env is prohibited (gets replaced but model shouldn't generate it)
    if (/import\.meta\.env/.test(content)) {
      warnings.push(`${filePath}: Uses import.meta.env — not available in CDN preview, use direct constants`)
    }

    // 5. Multi-line imports (break the CDN transform)
    const multiLineImport = content.match(/^import\s+\{[^}]*\n[^}]*\}\s+from\s+/m)
    if (multiLineImport) {
      warnings.push(`${filePath}: Multi-line import detected — all imports must be on a single line`)
    }

    // 6. Prohibited packages (no UMD builds)
    for (const pkg of PROHIBITED_PACKAGES) {
      if (content.includes(`from '${pkg}'`) || content.includes(`from "${pkg}"`)) {
        warnings.push(`${filePath}: Uses prohibited package '${pkg}' — not available in CDN preview`)
      }
    }
  }

  // Return errors first, then warnings (both trigger auto-fix)
  return [...errors, ...warnings]
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

        // When Pixel→Logic, prepend structured design context for better integration
        if (['brand', 'web', 'social'].includes(depStep.agentId) && step.agentId === 'dev') {
          const designContext = extractDesignContext(depOutput)
          if (designContext) {
            contextBlock += `\n\n--- Resumen de Diseno de ${depAgent?.name ?? 'Pixel'} [${depInstanceId}] ---\n${designContext}\n--- Fin resumen de diseno ---`
          }
        }

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

  // Inject Supabase config for dev agents
  let supabaseBlock = ''
  if (agentConfig.id === 'dev') {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { supabaseUrl: true, supabaseAnonKey: true },
    })
    if (conv?.supabaseUrl && conv?.supabaseAnonKey) {
      supabaseBlock = `\n\nSUPABASE CONFIGURADO POR EL USUARIO:\nURL del proyecto: ${conv.supabaseUrl}\nAnon Key: ${conv.supabaseAnonKey}\nIMPORTANTE: Usa estas credenciales REALES en src/lib/supabase.ts. NO uses placeholders.`
    }
  }

  // Inject quality preamble for Logic (dev) so the model always uses UI components and design system
  let qualityPreamble = ''
  if (agentConfig.id === 'dev') {
    qualityPreamble = `\n\nRECORDATORIO DE CALIDAD:
- Usa const { Button, Card, CardHeader, CardTitle, CardContent, Input, Badge, ... } = window.__UI para TODOS los componentes de interfaz.
- Usa SIEMPRE tokens semanticos de Tailwind: bg-background, text-foreground, bg-primary, text-primary-foreground, bg-card, text-muted-foreground, border-border, bg-muted, bg-accent, bg-secondary.
- NUNCA uses colores directos (bg-white, bg-gray-100, text-blue-500) — solo tokens semanticos.
- Usa iconos de Lucide como Icons.Plus, Icons.Trash, Icons.Edit, Icons.Check, etc.
- Para landing pages y portfolios, incluye animaciones GSAP + ScrollTrigger.
- Incluye imagenes reales de Unsplash donde aplique.
- El resultado debe verse profesional y pulido, no basico ni placeholder.`
  }

  const taskPrompt = `${step.task}${qualityPreamble}${contextBlock}${supabaseBlock}`

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
  // Project agents (Logic) stream tokens AND emit file_update events
  const isVisualAgent = VISUAL_AGENT_IDS.includes(agentConfig.id)
  const isProjectAgent = PROJECT_AGENT_IDS.includes(agentConfig.id)
  const artifactStreamer = isProjectAgent ? new ArtifactStreamer() : null

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
        const wasInsideArtifact = artifactStreamer?.isStreaming() ?? false
        // Process artifact first so file_update events fire
        if (artifactStreamer) {
          const events = artifactStreamer.onToken(token)
          for (const ev of events) {
            if (ev.type === 'artifact_start') {
              broadcast(conversationId, { type: 'artifact_start', agentId: agentConfig.id, instanceId: step.instanceId })
            } else if (ev.type === 'file_update') {
              broadcast(conversationId, { type: 'file_update', filePath: ev.filePath!, content: ev.content!, language: ev.language!, partial: ev.partial, instanceId: step.instanceId })
            }
          }
        }
        // Only send token to chat if not inside artifact
        if (!isVisualAgent && !wasInsideArtifact && !(artifactStreamer?.isStreaming())) {
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
        const wasInsideArtifact = artifactStreamer?.isStreaming() ?? false
        // Process artifact first so file_update events fire
        if (artifactStreamer) {
          const events = artifactStreamer.onToken(token)
          for (const ev of events) {
            if (ev.type === 'artifact_start') {
              broadcast(conversationId, { type: 'artifact_start', agentId: agentConfig.id, instanceId: step.instanceId })
            } else if (ev.type === 'file_update') {
              broadcast(conversationId, { type: 'file_update', filePath: ev.filePath!, content: ev.content!, language: ev.language!, partial: ev.partial, instanceId: step.instanceId })
            }
          }
        }
        // Only send token to chat if not inside artifact
        if (!isVisualAgent && !wasInsideArtifact && !(artifactStreamer?.isStreaming())) {
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

  const deliverableTypeMap: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video' | 'project'> = {
    seo: 'report',
    brand: 'design',
    web: 'design',
    social: 'design',
    ads: 'copy',
    dev: 'project',
    video: 'video',
  }
  let deliverableType = deliverableTypeMap[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 60)}`

  // Try to parse project artifact from Logic's output
  let parsedArtifact = PROJECT_AGENT_IDS.includes(agentConfig.id) ? parseArtifact(agentFullText) : null
  let deliverableContentRaw: string

  // Auto-fix loop for project artifacts with validation errors
  if (parsedArtifact && PROJECT_AGENT_IDS.includes(agentConfig.id)) {
    const validationErrors = validateProjectArtifact(parsedArtifact)
    if (validationErrors.length > 0) {
      console.log(`[${agentConfig.name}:${step.instanceId}] Artifact validation errors: ${validationErrors.join(', ')}`)

      const maxRetries = 2
      let bestArtifact = parsedArtifact
      let bestErrorCount = validationErrors.length
      let currentErrors = validationErrors

      for (let attempt = 1; attempt <= maxRetries && currentErrors.length > 0; attempt++) {
        broadcast(conversationId, {
          type: 'agent_thinking',
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          instanceId: step.instanceId,
          step: `Auto-corrigiendo errores (intento ${attempt}/${maxRetries})...`,
        })

        const retryMessages: LLMMessage[] = [
          ...messages,
          { role: 'assistant' as const, content: agentFullText },
          { role: 'user' as const, content: `Fix these errors in the artifact:\n\n${currentErrors.join('\n')}\n\nRegenerate the COMPLETE artifact with all files corrected.` },
        ]

        let retryText = ''
        const retryStreamer = new ArtifactStreamer()
        await provider.stream(agentConfig.systemPrompt, retryMessages, {
          onToken: (token) => {
            const events = retryStreamer.onToken(token)
            for (const ev of events) {
              if (ev.type === 'file_update') {
                broadcast(conversationId, { type: 'file_update', filePath: ev.filePath!, content: ev.content!, language: ev.language!, partial: ev.partial, instanceId: step.instanceId })
              }
            }
          },
          onComplete: async (fullText, usage) => {
            retryText = fullText
            await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
            const retryCreditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens)
            agentCreditsCost += retryCreditResult.creditsUsed
          },
          onError: (err) => {
            console.error(`[${agentConfig.name}:${step.instanceId}] Auto-fix retry error:`, err)
          },
        })

        const retryArtifact = parseArtifact(retryText)
        if (retryArtifact) {
          const retryErrors = validateProjectArtifact(retryArtifact)
          if (retryErrors.length < bestErrorCount) {
            bestArtifact = retryArtifact
            bestErrorCount = retryErrors.length
            agentFullText = retryText
            plan.agentOutputs[step.instanceId] = retryText
            console.log(`[${agentConfig.name}:${step.instanceId}] Auto-fix improved: ${currentErrors.length} → ${retryErrors.length} errors`)
          }
          currentErrors = retryErrors
        } else {
          break // Retry didn't produce a valid artifact
        }
      }

      parsedArtifact = bestArtifact
    }
  }

  // Fetch Supabase config for placeholder replacement
  let supabaseConfig: { url: string; anonKey: string } | undefined
  {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { supabaseUrl: true, supabaseAnonKey: true },
    })
    if (conv?.supabaseUrl && conv?.supabaseAnonKey) {
      supabaseConfig = { url: conv.supabaseUrl, anonKey: conv.supabaseAnonKey }
    }
  }

  if (parsedArtifact) {
    // Project artifact found — bundle for preview
    deliverableContentRaw = bundleToHtml(parsedArtifact, supabaseConfig)
    deliverableType = 'project'
    console.log(`[${agentConfig.name}:${step.instanceId}] Artifact parsed: ${parsedArtifact.files.length} files`)
  } else {
    deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)
    // If dev agent didn't produce an artifact, fall back to 'code' type
    if (agentConfig.id === 'dev') deliverableType = 'code'
  }

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
      ...(parsedArtifact ? { artifact: parsedArtifact } : {}),
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
        ...(parsedArtifact ? { artifact: parsedArtifact } : {}),
      },
    },
  })

  // For visual/project agents, save only the summary text
  let messageText = agentFullText
  if (isVisualAgent && htmlBlock) {
    const htmlIdx = agentFullText.indexOf('```html')
    messageText = htmlIdx > 0
      ? agentFullText.substring(0, htmlIdx).trim()
      : `${agentConfig.name} genero una propuesta visual. Ver en el canvas.`
  } else if (parsedArtifact) {
    // Project agent with artifact — show summary
    const artifactIdx = agentFullText.indexOf('<logicArtifact')
    messageText = artifactIdx > 0
      ? agentFullText.substring(0, artifactIdx).trim()
      : `${agentConfig.name} genero un proyecto con ${parsedArtifact.files.length} archivos. Ver en el workspace.`
    if (!messageText) {
      messageText = `${agentConfig.name} genero un proyecto con ${parsedArtifact.files.length} archivos. Ver en el workspace.`
    }
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
