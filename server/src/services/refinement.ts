import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { getAgentConfig, VISUAL_AGENT_IDS } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { consumeCredits } from './credit-tracker.js'
import { setExecutingPlan, type ExecutingPlan, type OrchestratorStep } from './plan-cache.js'
import type { LLMMessage, LLMUsage } from './llm/types.js'
import { extractDesignContext, extractHtmlBlock, wrapTextAsHtml, VISUAL_EDITOR_SCRIPT } from './html-utils.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { executeToolCall } from './tools/executor.js'
import { getNextVersionInfo } from './deliverable-versioning.js'

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

// Apply search-replace diffs to existing files
function applyDiffs(
  previousFiles: Record<string, string>,
  diffs: Record<string, Array<{ search: string; replace: string }>>
): Record<string, string> {
  const result = { ...previousFiles }
  for (const [filePath, changes] of Object.entries(diffs)) {
    if (!result[filePath]) {
      console.warn(`[Logic] Diff target not found: ${filePath}, skipping`)
      continue
    }
    let content = result[filePath]
    for (const { search, replace } of changes) {
      if (content.includes(search)) {
        content = content.replace(search, replace)
      } else {
        console.warn(`[Logic] Diff search not found in ${filePath} (${search.slice(0, 60)}...), skipping`)
      }
    }
    result[filePath] = content
  }
  return result
}

// Helper: robustly extract Logic agent JSON from LLM output
function extractLogicJson(text: string): { templateId: string; description: string; files: Record<string, string>; diffs?: Record<string, Array<{ search: string; replace: string }>> } {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* try next */ }
  }
  try { return JSON.parse(text.trim()) } catch { /* try next */ }
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

// Refine a completed step by re-running the agent with user feedback
export async function refineStep(plan: ExecutingPlan, step: OrchestratorStep, userFeedback: string, userId: string): Promise<void> {
  const { conversationId, modelOverride } = plan
  const agentConfig = getAgentConfig(step.agentId)
  if (!agentConfig) return

  const isVisualAgent = VISUAL_AGENT_IDS.includes(agentConfig.id)

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: agentConfig.id,
    agentName: agentConfig.name,
    instanceId: step.instanceId,
    step: 'Refinando con tus indicaciones...',
  })

  // Build context from dependencies
  let contextBlock = ''
  if (step.dependsOn) {
    for (const depInstanceId of step.dependsOn) {
      const depStep = plan.steps.find(s => s.instanceId === depInstanceId)
      if (depStep && plan.agentOutputs[depInstanceId]) {
        const depAgent = getAgentConfig(depStep.agentId)
        const depOutput = plan.agentOutputs[depInstanceId]

        contextBlock += `\n\n--- Contexto de ${depAgent?.name ?? depStep.agentId} (${depAgent?.role ?? 'agente'}) ---\n${depOutput}\n--- Fin contexto ---`
      }
    }
  }

  const previousOutput = plan.agentOutputs[step.instanceId] || ''

  // For Logic refinements, extract previous files so we can merge later
  let previousFiles: Record<string, string> = {}
  if (agentConfig.id === 'logic' && previousOutput) {
    try {
      const prev = extractLogicJson(previousOutput)
      previousFiles = stripProtectedFiles(prev.files || {})
    } catch { /* if previous output doesn't parse, skip merge */ }
  }

  // For Logic, build a compact context showing file names so it knows what exists
  let logicFileIndex = ''
  if (agentConfig.id === 'logic' && Object.keys(previousFiles).length > 0) {
    logicFileIndex = '\n\nArchivos actuales del proyecto:\n' +
      Object.entries(previousFiles).map(([path, content]) => `- ${path} (${content.split('\n').length} lineas)`).join('\n')
  }

  const refinePrompt = agentConfig.id === 'logic'
    ? `El cliente pide estos cambios:\n\n${userFeedback}${logicFileIndex}\n\nRESPONDE SOLO CON JSON. Usa "diffs" para cambios parciales y "files" para archivos nuevos o reescritos:\n{"templateId":"...","description":"...","files":{"ruta/nuevo.tsx":"contenido completo"},"diffs":{"ruta/existente.tsx":[{"search":"texto exacto actual","replace":"texto nuevo"}]}}\n\nREGLAS:\n1. Para cambios PEQUENOS en archivos existentes: usa "diffs" con pares search-replace. Cada "search" DEBE ser una subcadena EXACTA del archivo actual (incluye 2-3 lineas de contexto para unicidad).\n2. Para archivos NUEVOS o reescrituras mayores (>50% del archivo): usa "files" con contenido completo.\n3. No incluyas archivos sin cambios.\n4. Puedes combinar "files" y "diffs" en la misma respuesta.\n5. Si solo modificas unas lineas de un archivo de 100+ lineas, usa "diffs" — ahorra tokens.`
    : `El cliente ha revisado tu propuesta y pide los siguientes cambios:\n\n${userFeedback}\n\nGenera una nueva version completa incorporando estos cambios. Recuerda: responde SOLO con el HTML completo, sin texto adicional.`

  // Build conversation: original task → previous output → refinement request
  const messages: LLMMessage[] = [
    { role: 'user' as const, content: `${step.task}${contextBlock}` },
    { role: 'assistant' as const, content: previousOutput },
    { role: 'user' as const, content: refinePrompt },
  ]

  const rawRefineConfig = modelOverride
    ? resolveModelConfig(modelOverride, agentConfig.modelConfig) ?? agentConfig.modelConfig
    : agentConfig.modelConfig

  const agentModelConfig = await resolveAvailableConfig(rawRefineConfig)
  if (!agentModelConfig) {
    broadcast(conversationId, {
      type: 'error',
      message: `El proveedor ${rawRefineConfig.provider} no esta disponible para refinar.`,
    })
    return
  }
  const provider = getProvider(agentModelConfig)

  let agentFullText = ''
  let agentUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 }
  let refineCreditsCost = 0

  const refineCallbacks = {
    onToken: (token: string) => {
      if (!isVisualAgent) {
        broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
      }
    },
    onThinking: (text: string) => {
      broadcast(conversationId, { type: 'thinking_update', agentId: agentConfig.id, instanceId: step.instanceId, content: text })
    },
    onComplete: async (fullText: string, usage: LLMUsage) => {
      agentFullText = fullText
      agentUsage = usage
      plan.agentOutputs[step.instanceId] = fullText
      await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
      const creditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens)
      refineCreditsCost += creditResult.creditsUsed
      broadcast(conversationId, { type: 'credit_update', creditsUsed: creditResult.creditsUsed, balance: creditResult.balance })
    },
    onError: (err: Error) => {
      console.error(`[${agentConfig.name}:${step.instanceId}] Refine error:`, err)
      broadcast(conversationId, { type: 'error', message: `Error al refinar con ${agentConfig.name}` })
    },
  }

  if (agentConfig.tools.length > 0) {
    const { getToolDefinitions } = await import('./tools/executor.js')
    const toolDefs = getToolDefinitions(agentConfig.tools)

    await provider.streamWithTools(agentConfig.systemPrompt, messages, toolDefs, {
      ...refineCallbacks,
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
    await provider.stream(agentConfig.systemPrompt, messages, refineCallbacks)
  }

  if (!agentFullText) return

  // ─── Logic agent: parse JSON and broadcast logic_project ───
  if (agentConfig.id === 'logic') {
    try {
      const logicData = extractLogicJson(agentFullText)
      const { templateId, description } = logicData
      const newFiles = stripProtectedFiles(logicData.files || {})

      // Apply search-replace diffs to existing files, then merge with new/complete files
      const diffedFiles = logicData.diffs ? applyDiffs(previousFiles, logicData.diffs) : previousFiles
      const mergedFiles = { ...diffedFiles, ...newFiles }

      // Update agentOutputs with merged JSON so next refinement has the full set
      const mergedOutput = JSON.stringify({ templateId, description, files: mergedFiles })
      plan.agentOutputs[step.instanceId] = mergedOutput

      broadcast(conversationId, {
        type: 'logic_project',
        templateId: templateId || 'blank',
        description: description || '',
        files: mergedFiles,
      })

      const logicRefineVersionInfo = await getNextVersionInfo(conversationId, step.instanceId)
      const deliverableId = uuid()
      await prisma.deliverable.create({
        data: {
          id: deliverableId,
          conversationId,
          title: `Logic: ${description || step.task.slice(0, 50)} (refinado)`,
          type: 'code',
          content: agentFullText,
          agent: agentConfig.name,
          botType: agentConfig.botType,
          instanceId: step.instanceId,
          version: logicRefineVersionInfo.version,
          parentId: logicRefineVersionInfo.parentId,
        },
      })

      // Update kanban task to point to latest version
      const logicKanban = await prisma.kanbanTask.findFirst({
        where: { conversationId, instanceId: step.instanceId },
      })
      if (logicKanban) {
        await prisma.kanbanTask.update({
          where: { id: logicKanban.id },
          data: { deliverableId },
        })
      }

      const agentMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: agentConfig.name,
          text: `Logic actualizo el proyecto. Ver en el IDE.`,
          type: 'agent',
          botType: agentConfig.botType,
        },
      })

      broadcast(conversationId, {
        type: 'agent_end',
        agentId: agentConfig.id,
        instanceId: step.instanceId,
        messageId: agentMsg.id,
        fullText: `Logic actualizo el proyecto. Ver en el IDE.`,
        model: agentModelConfig.model,
        inputTokens: agentUsage.inputTokens,
        outputTokens: agentUsage.outputTokens,
        creditsCost: refineCreditsCost,
      })

      // Re-send step_complete for further refinements
      await setExecutingPlan(conversationId, plan)
      const nextGroupIndex = plan.currentGroupIndex + 1
      const nextGroup = plan.executionGroups[nextGroupIndex]
      const completedCount = plan.completedInstances.length
      const totalCount = plan.steps.length

      if (nextGroup) {
        const nextSteps = nextGroup.instanceIds
          .map(iid => plan.steps.find(s => s.instanceId === iid))
          .filter((s): s is OrchestratorStep => !!s)
        const firstNext = nextSteps[0]
        const nextAgentConfig = firstNext ? getAgentConfig(firstNext.agentId) : null

        broadcast(conversationId, {
          type: 'step_complete',
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          instanceId: step.instanceId,
          summary: 'Proyecto actualizado. Puedes seguir ajustando o continuar.',
          nextAgentId: firstNext?.agentId,
          nextAgentName: nextAgentConfig?.name ?? firstNext?.agentId,
          nextInstanceId: firstNext?.instanceId,
          nextTask: firstNext?.task,
          stepIndex: completedCount - 1,
          totalSteps: totalCount,
          conversationId,
        })
      } else {
        broadcast(conversationId, {
          type: 'step_complete',
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          instanceId: step.instanceId,
          summary: 'Proyecto actualizado. Puedes seguir ajustando o finalizar.',
          stepIndex: completedCount - 1,
          totalSteps: totalCount,
          conversationId,
        })
      }
      return
    } catch (parseErr) {
      console.error(`[Logic:${step.instanceId}] Refine JSON parse error, falling back:`, parseErr)
    }
  }

  // Create new deliverable with refined content
  const htmlBlock = extractHtmlBlock(agentFullText)
  const deliverableTypeMap: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video'> = {
    seo: 'report', web: 'design', ads: 'copy', video: 'video', logic: 'code',
  }
  const deliverableType = deliverableTypeMap[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 50)} (refinado)`

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

  const refineVersionInfo = await getNextVersionInfo(conversationId, step.instanceId)
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
      version: refineVersionInfo.version,
      parentId: refineVersionInfo.parentId,
    },
  })

  // Update kanban task to point to latest version
  const refineKanban = await prisma.kanbanTask.findFirst({
    where: { conversationId, instanceId: step.instanceId },
  })
  if (refineKanban) {
    await prisma.kanbanTask.update({
      where: { id: refineKanban.id },
      data: { deliverableId },
    })
  }

  broadcast(conversationId, {
    type: 'deliverable',
    deliverable: {
      id: deliverable.id,
      title: deliverable.title,
      type: deliverable.type as typeof deliverableType,
      content: deliverable.content,
      agent: deliverable.agent,
      botType: deliverable.botType,
      version: refineVersionInfo.version,
      versionCount: refineVersionInfo.version,
    },
  })

  // Save agent message
  let messageText = agentFullText
  if (isVisualAgent && htmlBlock) {
    messageText = `${agentConfig.name} genero una version refinada. Ver en el canvas.`
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
    creditsCost: refineCreditsCost,
  })

  // Update plan and re-send step_complete
  await setExecutingPlan(conversationId, plan)

  const nextGroupIndex = plan.currentGroupIndex + 1
  const nextGroup = plan.executionGroups[nextGroupIndex]
  const completedCount = plan.completedInstances.length
  const totalCount = plan.steps.length

  if (nextGroup) {
    const nextSteps = nextGroup.instanceIds
      .map(iid => plan.steps.find(s => s.instanceId === iid))
      .filter((s): s is OrchestratorStep => !!s)
    const firstNext = nextSteps[0]
    const nextAgentConfig = firstNext ? getAgentConfig(firstNext.agentId) : null

    broadcast(conversationId, {
      type: 'step_complete',
      agentId: agentConfig.id,
      agentName: agentConfig.name,
      instanceId: step.instanceId,
      summary: 'Version refinada lista. Puedes seguir ajustando o continuar.',
      nextAgentId: firstNext?.agentId,
      nextAgentName: nextAgentConfig?.name ?? firstNext?.agentId,
      nextInstanceId: firstNext?.instanceId,
      nextTask: firstNext?.task,
      stepIndex: completedCount - 1,
      totalSteps: totalCount,
      conversationId,
    })
  } else {
    broadcast(conversationId, {
      type: 'step_complete',
      agentId: agentConfig.id,
      agentName: agentConfig.name,
      instanceId: step.instanceId,
      summary: 'Version refinada lista. Puedes seguir ajustando o finalizar.',
      stepIndex: completedCount - 1,
      totalSteps: totalCount,
      conversationId,
    })
  }
}
