import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { getAgentConfig, VISUAL_AGENT_IDS } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { consumeCredits } from './credit-tracker.js'
import { setExecutingPlan, type ExecutingPlan, type OrchestratorStep } from './plan-cache.js'
import type { LLMMessage, LLMUsage } from './llm/types.js'
import { extractHtmlBlock, wrapTextAsHtml, VISUAL_EDITOR_SCRIPT, LOGO_SELECTION_SCRIPT } from './html-utils.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { executeToolCall } from './tools/executor.js'
import { getNextVersionInfo } from './deliverable-versioning.js'
import { parseProjectFilesFromText } from './project-files.js'
import { DEV_API_CLIENT } from '../config/dev-api-client.js'
import { writeProjectFiles, readAllProjectFiles } from './project-storage.js'
import { trackFiles } from './project-file-tracker.js'
import { readAndEncodeImage } from './image-utils.js'
import { buildVisualTaskBrief } from './visual-task-brief.js'
const DELIVERABLE_TYPE_MAP: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video'> = {
  seo: 'report',
  brand: 'design',
  web: 'design',
  voxel: 'design',
  social: 'design',
  ads: 'copy',
  video: 'video',
  dev: 'code',
}

function getRefineLoadingStep(agentId: string): string {
  if (agentId === 'dev') return 'Revisando tus cambios y reconstruyendo el proyecto sobre la version actual.'
  if (agentId === 'web') return 'Aplicando ajustes visuales y reorganizando la propuesta.'
  if (agentId === 'brand') return 'Refinando identidad visual, estilo y direccion creativa.'
  if (agentId === 'video') return 'Reordenando escenas, ritmo y narrativa visual.'
  return 'Aplicando tus indicaciones sobre la ultima entrega.'
}

function classifyProjectAssetCategory(title: string, botType: string, type: string): string {
  const tl = title.toLowerCase()
  const isBranding = ['logo', 'marca', 'brand', 'paleta', 'identidad', 'logotipo', 'isotipo'].some(k => tl.includes(k))
  const isGraphicPiece = ['flyer', 'flayer', 'banner', 'post', 'story', 'storie', 'carrusel', 'afiche', 'volante', 'pieza grafica'].some(k => tl.includes(k))
  if (isBranding) return 'logo'
  if (isGraphicPiece && type === 'design') return 'graphic'
  if (type === 'video') return 'video'
  if (type === 'code') return 'app'
  if (type === 'report') return 'seo'
  if (botType === 'ads') return 'ads'
  if (botType === 'content') return 'copy'
  if (type === 'design') return 'web'
  return 'other'
}

async function syncProjectAsset(conversationId: string, deliverableId: string, instanceId: string | undefined, title: string, botType: string, type: string): Promise<void> {
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { projectId: true } })
    if (!conv?.projectId) return
    const category = classifyProjectAssetCategory(title, botType, type)
    const existing = instanceId
      ? await prisma.projectAsset.findFirst({
          where: {
            projectId: conv.projectId,
            conversationId,
            deliverable: { instanceId },
          },
        })
      : null
    if (existing) {
      await prisma.projectAsset.update({
        where: { id: existing.id },
        data: { deliverableId, category, name: title },
      })
      return
    }
    await prisma.projectAsset.create({
      data: { projectId: conv.projectId, conversationId, deliverableId, category, name: title },
    })
  } catch (err) {
    console.error('[ProjectAsset] Refine sync failed:', err)
  }
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
    step: getRefineLoadingStep(agentConfig.id),
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

  const isDevAgent = agentConfig.id === 'dev'

  const refinePrompt = isDevAgent
    ? `El cliente ha revisado tu proyecto y pide los siguientes cambios:\n\n${userFeedback}\n\nMODO EXTENSION: solo incluye los archivos NUEVOS o MODIFICADOS en tu respuesta JSON. Mantene el mismo formato: array de {path, content}. No incluyas archivos que no cambian.`
    : `El cliente ha revisado tu propuesta y pide los siguientes cambios:\n\n${userFeedback}\n\nGenera una nueva version completa incorporando estos cambios. Recuerda: responde SOLO con el HTML completo, sin texto adicional.`

  // Build conversation: original task → previous output → refinement request
  const baseTaskContent = `${step.task}${contextBlock}${agentConfig.id === 'web' ? buildVisualTaskBrief(`${step.task}\n${userFeedback}`, { hasReferenceImage: !!plan.imageUrl, isRefinement: true }) : ''}`
  const baseTaskMessage: LLMMessage = { role: 'user' as const, content: baseTaskContent }
  if (plan.imageUrl) {
    const encoded = await readAndEncodeImage(plan.imageUrl)
    if (encoded) {
      baseTaskMessage.images = [{ type: 'image', source: encoded.source, mediaType: encoded.mediaType }]
    }
  }

  const messages: LLMMessage[] = [
    baseTaskMessage,
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
      await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
      const creditResult = await consumeCredits(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens, conversationId)
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
    const toolDefs = await getToolDefinitions(agentConfig.tools, userId)

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
        return await executeToolCall(toolCall, conversationId, agentConfig, userId, step.instanceId)
      },
    })
  } else {
    await provider.stream(agentConfig.systemPrompt, messages, refineCallbacks)
  }

  if (!agentFullText) return

  // Create new deliverable with refined content
  const deliverableType = DELIVERABLE_TYPE_MAP[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 50)} (refinado)`

  let deliverableContent: string
  let messageText: string

  // Dev agent: parse multi-file JSON and merge with previous deliverable
  if (isDevAgent) {
    try {
      let newFiles = parseProjectFilesFromText(agentFullText).files
      broadcast(conversationId, {
        type: 'agent_thinking',
        agentId: agentConfig.id,
        agentName: agentConfig.name,
        instanceId: step.instanceId,
        step: 'Integrando cambios, modulos y archivos afectados.',
      })

      // Merge with previous files — try disk first, fallback to legacy JSON
      let prevFiles: { path: string; content: string }[] = []
      const diskFiles = await readAllProjectFiles(conversationId)
      if (diskFiles.length > 0) {
        prevFiles = diskFiles
        console.log(`[${agentConfig.name}:${step.instanceId}] Refine merge: loaded ${prevFiles.length} files from disk`)
      } else {
        const prevDeliverable = await prisma.deliverable.findFirst({
          where: { conversationId, instanceId: step.instanceId },
          orderBy: { createdAt: 'desc' },
        })
        if (prevDeliverable) {
          try {
            const parsed = JSON.parse(prevDeliverable.content)
            if (Array.isArray(parsed)) prevFiles = parsed
          } catch { /* ignore */ }
        }
      }
      if (prevFiles.length > 0) {
        const newFilePaths = new Set(newFiles.map((f: any) => f.path))
        const merged = [
          ...prevFiles.filter((f: any) => !newFilePaths.has(f.path)),
          ...newFiles,
        ]
        console.log(`[${agentConfig.name}:${step.instanceId}] Refine merge: ${newFiles.length} new/modified + ${prevFiles.length} existing = ${merged.length} total`)
        newFiles = merged
      }

      // Auto-inject API client SDK with real config
      const apiBase = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`
      const apiClientContent = DEV_API_CLIENT
        .replace('%%API_BASE%%', apiBase)
        .replace('%%PROJECT_ID%%', conversationId)
      const apiFileIndex = newFiles.findIndex((f: any) => f.path === 'src/lib/api.js')
      if (apiFileIndex >= 0) {
        newFiles[apiFileIndex].content = apiClientContent
      } else {
        newFiles.push({ path: 'src/lib/api.js', content: apiClientContent })
      }

      // Auto-fix api import paths
      for (const f of newFiles as any[]) {
        if (f.path === 'src/lib/api.js' || !f.content) continue
        const fileParts = f.path.split('/')
        if (fileParts[0] !== 'src') continue
        const fileDir = fileParts.slice(0, -1)
        const apiDir = ['src', 'lib']
        let common = 0
        while (common < fileDir.length && common < apiDir.length && fileDir[common] === apiDir[common]) common++
        const ups = fileDir.length - common
        const correctPath = (ups === 0 ? './' : '../'.repeat(ups)) + apiDir.slice(common).concat(['api']).join('/')
        f.content = f.content.replace(
          /from\s+['"](\.\.?\/)+lib\/api(\.js)?['"]/g,
          `from '${correctPath}'`
        )
      }

      deliverableContent = JSON.stringify(newFiles)
      messageText = `${agentConfig.name} refino el proyecto con ${newFiles.length} archivos. Ver en el canvas.`
    } catch (err) {
      console.error(`[${agentConfig.name}:${step.instanceId}] Failed to parse refined multi-file JSON:`, err)
      broadcast(conversationId, { type: 'error', message: `Error al refinar proyecto: ${(err as Error).message}` })
      return
    }
  } else {
    // Non-dev agents: HTML processing
    const htmlBlock = extractHtmlBlock(agentFullText)
    let deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)

    // Inject error-catching script and visual editor for visual agents
    if (htmlBlock && VISUAL_AGENT_IDS.includes(agentConfig.id)) {
      const errorScript = `<script>window.onerror=function(msg,url,line,col){window.parent.postMessage({type:'iframe-error',error:String(msg),line:line},'*');}</script>`
      deliverableContentRaw = deliverableContentRaw.replace('</head>', `${errorScript}\n</head>`)
      deliverableContentRaw = deliverableContentRaw.replace('</body>', `${VISUAL_EDITOR_SCRIPT}\n</body>`)

      // Inject logo selection script for brand agent
      if (agentConfig.id === 'brand') {
        deliverableContentRaw = deliverableContentRaw.replace('</body>', `${LOGO_SELECTION_SCRIPT}\n</body>`)
      }
    }

    const cdnBase = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`
    deliverableContent = deliverableContentRaw
      .replace(/src="\/uploads\//g, `src="${cdnBase}/uploads/`)
      .replace(/src='\/uploads\//g, `src='${cdnBase}/uploads/`)

    messageText = isVisualAgent && htmlBlock
      ? `${agentConfig.name} genero una version refinada. Ver en el canvas.`
      : agentFullText
  }

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

  await syncProjectAsset(conversationId, deliverable.id, step.instanceId, deliverableTitle, deliverable.botType, deliverableType)

  // Persist dev agent files to disk and track in DB
  if (isDevAgent && deliverableContent.startsWith('[')) {
    try {
      const finalFiles = JSON.parse(deliverableContent) as { path: string; content: string }[]
      broadcast(conversationId, {
        type: 'agent_thinking',
        agentId: agentConfig.id,
        agentName: agentConfig.name,
        instanceId: step.instanceId,
        step: 'Guardando la version refinada y preparando el workspace.',
      })
      await writeProjectFiles(conversationId, finalFiles)
      await trackFiles(conversationId, deliverableId, finalFiles)
      console.log(`[${agentConfig.name}:${step.instanceId}] Refine: persisted ${finalFiles.length} files to disk and DB`)
    } catch (storageErr) {
      console.error(`[${agentConfig.name}:${step.instanceId}] Refine file persistence error (non-fatal):`, storageErr)
    }
  }

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

  // Save agent message (messageText already set above for dev and non-dev agents)
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
