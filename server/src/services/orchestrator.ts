import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { orchestratorConfig } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { checkCredits, consumeCredits } from './credit-tracker.js'
import type { OrchestratorStep } from './plan-cache.js'
import type { LLMMessage } from './llm/types.js'
import { readAndEncodeImage } from './image-utils.js'
import { handleAnonymousMessage } from './anonymous-handler.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { startParallelExecution } from './execution-engine.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface OrchestratorOutput {
  requiresApproval?: boolean
  approvalMessage?: string
  directResponse?: string
  steps: Array<{
    agentId: string
    instanceId?: string
    task: string
    userDescription?: string
    dependsOn?: string[]
  }>
}

export async function processMessage(conversationId: string, text: string, userId: string, modelOverride?: string, imageUrl?: string): Promise<void> {
  console.log('[processMessage] Start for:', conversationId)

  if (userId === 'anonymous') {
    await handleAnonymousMessage(conversationId, text)
    return
  }

  const creditCheck = await checkCredits(userId)
  if (!creditCheck.allowed) {
    broadcast(conversationId, {
      type: 'credits_exhausted',
      balance: creditCheck.balance,
      planId: creditCheck.planId,
    })
    const exhaustedMsg = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Sistema',
        text: 'Tus creditos se han agotado. Actualiza tu plan para seguir usando los agentes.',
        type: 'agent',
        botType: 'system',
      },
    })
    broadcast(conversationId, {
      type: 'agent_end',
      agentId: 'system',
      messageId: exhaustedMsg.id,
      fullText: exhaustedMsg.text,
    })
    return
  }

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: 'base',
    agentName: 'Pluria',
    step: 'Analizando tu solicitud...',
  })

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const messages: LLMMessage[] = history.map(m => ({
    role: m.type === 'user' ? 'user' as const : 'assistant' as const,
    content: m.text,
  }))

  if (imageUrl) {
    const encoded = await readAndEncodeImage(imageUrl)
    if (encoded) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMsg) {
        lastUserMsg.images = [{ type: 'image', source: encoded.source, mediaType: encoded.mediaType }]
      }
    }
  }

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: 'base',
    agentName: 'Pluria',
    step: 'Decidiendo que agentes activar...',
  })

  console.log('[processMessage] Calling orchestrator LLM...')

  const orchConfig = modelOverride
    ? resolveModelConfig(modelOverride, orchestratorConfig.modelConfig) ?? orchestratorConfig.modelConfig
    : orchestratorConfig.modelConfig

  const resolvedOrchConfig = await resolveAvailableConfig(orchConfig)
  if (!resolvedOrchConfig) {
    broadcast(conversationId, {
      type: 'error',
      message: 'Ningun proveedor de IA esta disponible en este momento. Verifica las API keys en el panel de administracion.',
    })
    return
  }
  const provider = getProvider(resolvedOrchConfig)

  let orchestratorOutput: OrchestratorOutput | null = null

  await provider.stream(orchestratorConfig.systemPrompt, messages, {
    onToken: () => {},
    onComplete: (fullText, usage) => {
      console.log('[processMessage] LLM complete:', fullText.substring(0, 100))
      try {
        const cleanText = fullText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        orchestratorOutput = JSON.parse(cleanText) as OrchestratorOutput
      } catch {
        orchestratorOutput = {
          directResponse: fullText,
          steps: [],
        }
      }
      trackUsage(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error)
      consumeCredits(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens).catch(console.error)
    },
    onError: (err) => {
      console.error('[Orchestrator] Error:', err)
      broadcast(conversationId, { type: 'error', message: 'Error al analizar el mensaje' })
    },
  })

  console.log('[processMessage] Output:', orchestratorOutput ? 'ready' : 'null')
  if (!orchestratorOutput) return

  broadcast(conversationId, {
    type: 'agent_thinking',
    agentId: 'base',
    agentName: 'Pluria',
    step: 'Preparando plan de ejecucion...',
  })

  const output = orchestratorOutput as OrchestratorOutput

  const instanceCounts: Record<string, number> = {}
  for (const s of output.steps) {
    if (!s.instanceId) {
      instanceCounts[s.agentId] = (instanceCounts[s.agentId] || 0) + 1
      s.instanceId = `${s.agentId}-${instanceCounts[s.agentId]}`
    }
    if (!s.userDescription) {
      s.userDescription = s.task
    }
  }

  if (output.steps.length > 0) {
    const stepsForExec: OrchestratorStep[] = output.steps.map(s => ({
      agentId: s.agentId,
      instanceId: s.instanceId!,
      task: s.task,
      userDescription: s.userDescription!,
      dependsOn: s.dependsOn,
    }))
    await startParallelExecution(conversationId, stepsForExec, userId, modelOverride, imageUrl)
  } else if (output.directResponse) {
    const directMsg = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Pluria',
        text: output.directResponse,
        type: 'agent',
        botType: 'base',
      },
    })

    broadcast(conversationId, {
      type: 'agent_thinking',
      agentId: 'base',
      agentName: 'Pluria',
      step: 'Escribiendo respuesta...',
    })
    await sleep(150)
    broadcast(conversationId, { type: 'agent_start', agentId: 'base', agentName: 'Pluria' })

    const words = output.directResponse.split(' ')
    const chunkSize = 5
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ')
      const prefix = i === 0 ? '' : ' '
      broadcast(conversationId, { type: 'token', content: prefix + chunk, agentId: 'base' })
      await sleep(10)
    }

    broadcast(conversationId, {
      type: 'agent_end',
      agentId: 'base',
      messageId: directMsg.id,
      fullText: output.directResponse,
    })
  }
}
