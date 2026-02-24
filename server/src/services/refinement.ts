import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { getAgentConfig, VISUAL_AGENT_IDS, PROJECT_AGENT_IDS } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { consumeCredits } from './credit-tracker.js'
import { setExecutingPlan, type ExecutingPlan, type OrchestratorStep } from './plan-cache.js'
import type { LLMMessage, LLMUsage } from './llm/types.js'
import { extractDesignContext, extractHtmlBlock, wrapTextAsHtml, VISUAL_EDITOR_SCRIPT } from './html-utils.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { executeToolCall } from './tools/executor.js'
import { parseArtifact, bundleToHtml } from './artifact-parser.js'
import { mergeArtifacts, formatArtifactAsContext } from './artifact-merger.js'
import { ArtifactStreamer } from './artifact-streamer.js'

// Refine a completed step by re-running the agent with user feedback
export async function refineStep(plan: ExecutingPlan, step: OrchestratorStep, userFeedback: string, userId: string): Promise<void> {
  const { conversationId, modelOverride } = plan
  const agentConfig = getAgentConfig(step.agentId)
  if (!agentConfig) return

  const isVisualAgent = VISUAL_AGENT_IDS.includes(agentConfig.id)
  const isProjectAgent = PROJECT_AGENT_IDS.includes(agentConfig.id)

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

        // When Pixel→Logic, prepend structured design context for better integration
        if (['brand', 'web', 'social'].includes(depStep.agentId) && step.agentId === 'dev') {
          const designContext = extractDesignContext(depOutput)
          if (designContext) {
            contextBlock += `\n\n--- Resumen de Diseno de ${depAgent?.name ?? 'Pixel'} [${depInstanceId}] ---\n${designContext}\n--- Fin resumen de diseno ---`
          }
        }

        contextBlock += `\n\n--- Contexto de ${depAgent?.name ?? depStep.agentId} (${depAgent?.role ?? 'agente'}) ---\n${depOutput}\n--- Fin contexto ---`
      }
    }
  }

  const previousOutput = plan.agentOutputs[step.instanceId] || ''

  // For project agents, parse previous artifact and build smarter context
  let previousArtifact = isProjectAgent ? parseArtifact(previousOutput) : null
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

  let refinePrompt: string

  if (previousArtifact) {
    // Project agent: pass structured artifact context and ask for partial updates
    const artifactContext = formatArtifactAsContext(previousArtifact)
    refinePrompt = `El cliente ha revisado tu proyecto y pide los siguientes cambios:\n\n${userFeedback}\n\nProyecto actual:\n${artifactContext}\n\nGenera un nuevo <logicArtifact> con SOLO los archivos que necesitan cambios. Los archivos que no cambien no los incluyas. Cada archivo incluido debe tener su contenido COMPLETO (no diffs parciales).`
  } else {
    refinePrompt = `El cliente ha revisado tu propuesta y pide los siguientes cambios:\n\n${userFeedback}\n\nGenera una nueva version completa incorporando estos cambios. Recuerda: responde SOLO con el HTML completo, sin texto adicional.`
  }

  // Build conversation: original task → previous output → refinement request
  const messages: LLMMessage[] = [
    { role: 'user' as const, content: `${step.task}${contextBlock}${supabaseBlock}` },
    { role: 'assistant' as const, content: previousOutput },
    { role: 'user' as const, content: `${refinePrompt}${supabaseBlock}` },
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

  // Set up artifact streamer for project agents
  const artifactStreamer = isProjectAgent ? new ArtifactStreamer() : null

  const refineCallbacks = {
    onToken: (token: string) => {
      if (!isVisualAgent) {
        broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
      }
      // Stream file_update events for project agents
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

  // Parse artifact from refined output and merge with previous if available
  let refinedArtifact = isProjectAgent ? parseArtifact(agentFullText) : null
  if (refinedArtifact && previousArtifact) {
    refinedArtifact = mergeArtifacts(previousArtifact, refinedArtifact)
    console.log(`[${agentConfig.name}:${step.instanceId}] Artifact merged: ${refinedArtifact.files.length} files total`)
  }

  // Create new deliverable with refined content
  const htmlBlock = extractHtmlBlock(agentFullText)
  const deliverableTypeMap: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video' | 'project'> = {
    seo: 'report', brand: 'design', web: 'design', social: 'design', ads: 'copy', dev: 'project', video: 'video',
  }
  let deliverableType = deliverableTypeMap[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 50)} (refinado)`

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

  let deliverableContentRaw: string
  if (refinedArtifact) {
    deliverableContentRaw = bundleToHtml(refinedArtifact, supabaseConfig)
    deliverableType = 'project'
  } else {
    deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)
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
      ...(refinedArtifact ? { artifact: refinedArtifact } : {}),
    },
  })

  // Save agent message
  let messageText = agentFullText
  if (isVisualAgent && htmlBlock) {
    messageText = `${agentConfig.name} genero una version refinada. Ver en el canvas.`
  } else if (refinedArtifact) {
    const artifactIdx = agentFullText.indexOf('<logicArtifact')
    messageText = artifactIdx > 0
      ? agentFullText.substring(0, artifactIdx).trim()
      : `${agentConfig.name} genero una version refinada con ${refinedArtifact.files.length} archivos. Ver en el workspace.`
    if (!messageText) {
      messageText = `${agentConfig.name} genero una version refinada con ${refinedArtifact.files.length} archivos. Ver en el workspace.`
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
