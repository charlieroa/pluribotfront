import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { addConnection, broadcast } from '../services/sse.js'
import { getProvider } from '../services/llm/router.js'
import { getAgentConfig, orchestratorConfig, VISUAL_AGENT_IDS, REFINE_AGENT_IDS } from '../config/agents.js'
import { trackUsage } from '../services/token-tracker.js'
import { checkCredits, consumeCredits } from '../services/credit-tracker.js'
import {
  getPendingPlan, removePendingPlan,
  getExecutingPlan, setExecutingPlan, removeExecutingPlan,
  type OrchestratorStep,
} from '../services/plan-cache.js'
import type { SendMessageRequest, SendMessageResponse, ApprovalRequest, StepApprovalRequest, RefineStepRequest } from '../../../shared/types.js'
import type { LLMMessage } from '../services/llm/types.js'
import { readAndEncodeImage } from '../services/image-utils.js'
import { handleAnonymousMessage } from '../services/anonymous-handler.js'
import { resolveModelConfig, resolveAvailableConfig } from '../services/model-resolver.js'
import { createTodoKanbanTask, startParallelExecution, executeCurrentGroup, executeSingleStep } from '../services/execution-engine.js'
import { refineStep } from '../services/refinement.js'

const router = Router()

// Helper: sleep for typing effect
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Create a new conversation (client calls this first, then connects SSE)
router.post('/conversation', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const { title } = req.body as { title?: string }

  try {
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId, email: `${userId}@anonymous`, passwordHash: '', name: 'Anonimo' },
      })
    }

    const conversation = await prisma.conversation.create({
      data: { userId: user.id, title: title ?? 'Nueva conversacion' },
    })

    res.json({ conversationId: conversation.id })
  } catch (err) {
    console.error('[Chat] Error creating conversation:', err)
    res.status(500).json({ error: 'Error al crear conversacion' })
  }
})

// SSE stream for a conversation
router.get('/:conversationId/stream', optionalAuth, (req, res) => {
  const conversationId = req.params.conversationId as string
  const userId = req.auth?.userId ?? 'anonymous'
  addConnection(conversationId, res, userId)
})

// Send a message — SSE must be connected BEFORE calling this
router.post('/send', optionalAuth, async (req, res) => {
  const { conversationId, text, modelOverride, imageUrl } = req.body as SendMessageRequest
  const userId = req.auth?.userId ?? 'anonymous'

  if (!conversationId) {
    res.status(400).json({ error: 'conversationId requerido. Crea conversacion primero con POST /conversation' })
    return
  }

  try {
    // Check if user is an assigned agent on this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { assignedAgentId: true, needsHumanReview: true, userId: true },
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada. Inicia una nueva.' })
      return
    }

    const senderFull = userId !== 'anonymous'
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, specialty: true, specialtyColor: true, avatarUrl: true } })
      : null
    const isAssignedAgent = conversation?.assignedAgentId === userId && senderFull && ['superadmin', 'org_admin', 'agent'].includes(senderFull.role)
    const isHumanConversation = conversation?.needsHumanReview

    // ─── Case 1: Admin/agent writes in assigned conversation → human agent message, no AI ───
    if (isAssignedAgent && senderFull) {
      const message = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: 'human_agent',
          text,
          type: 'agent',
          botType: userId,
        },
      })

      broadcast(conversationId, {
        type: 'human_message',
        agentName: senderFull.name,
        agentRole: senderFull.specialty || (senderFull.role === 'superadmin' ? 'Supervisor' : senderFull.role === 'org_admin' ? 'Administrador' : 'Agente'),
        text,
        messageId: message.id,
        specialty: senderFull.specialty ?? undefined,
        specialtyColor: senderFull.specialtyColor ?? undefined,
        avatarUrl: senderFull.avatarUrl ?? undefined,
      })

      res.json({ conversationId, messageId: message.id } as SendMessageResponse)
      return
    }

    // ─── Normal user message ───
    const userMessage = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Tu',
        text,
        type: 'user',
      },
    })

    // Update conversation title from first message
    const msgCount = await prisma.message.count({ where: { conversationId } })
    if (msgCount === 1) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: text.slice(0, 50) },
      })
    }

    const response: SendMessageResponse = {
      conversationId,
      messageId: userMessage.id,
    }
    res.json(response)

    // Detect human assistance requests
    const HUMAN_PATTERNS = [/asistencia humana/i, /ayuda humana/i, /hablar con.*(persona|humano|agente)/i, /soporte humano/i, /necesito.*humano/i, /agente humano/i]
    const needsHuman = HUMAN_PATTERNS.some(p => p.test(text))
    if (needsHuman) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { needsHumanReview: true },
      })
      const sysMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: 'Sistema',
          text: 'Tu solicitud de asistencia humana ha sido registrada. Un agente se pondrá en contacto pronto.',
          type: 'agent',
          botType: 'system',
        },
      })
      broadcast(conversationId, { type: 'human_review_requested', conversationId })
      broadcast(conversationId, {
        type: 'agent_end',
        agentId: 'system',
        messageId: sysMsg.id,
        fullText: sysMsg.text,
      })

      // Auto-assign specialist by keywords
      try {
        const chatUser = await prisma.user.findUnique({ where: { id: userId !== 'anonymous' ? userId : '' } })
        const orgId = chatUser?.organizationId

        const specialists = await prisma.user.findMany({
          where: {
            role: 'agent',
            specialty: { not: null },
            ...(orgId ? { organizationId: orgId } : {}),
          },
        })

        if (specialists.length > 0) {
          const lowerText = text.toLowerCase()
          const allMessages = await prisma.message.findMany({ where: { conversationId }, take: 10 })
          const conversationContext = allMessages.map((m: { text: string }) => m.text).join(' ').toLowerCase()

          let bestMatch: { specialist: typeof specialists[0]; score: number } | null = null
          for (const spec of specialists) {
            const keywords = (spec.specialtyKeywords || spec.specialty || '').toLowerCase().split(',').map((k: string) => k.trim())
            const matchScore = keywords.filter((k: string) => k && (lowerText.includes(k) || conversationContext.includes(k))).length
            if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
              bestMatch = { specialist: spec, score: matchScore }
            }
          }

          if (bestMatch) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { assignedAgentId: bestMatch.specialist.id },
            })
            broadcast(conversationId, {
              type: 'human_agent_joined',
              agentName: bestMatch.specialist.name,
              agentRole: bestMatch.specialist.specialty || 'Especialista',
              specialty: bestMatch.specialist.specialty ?? undefined,
              specialtyColor: bestMatch.specialist.specialtyColor ?? undefined,
              avatarUrl: bestMatch.specialist.avatarUrl ?? undefined,
            })
          }
        }
      } catch (autoErr) {
        console.error('[Chat] Auto-assign specialist error:', autoErr)
      }
    }

    // ─── Case 2: Client replies in a human-supervised conversation → no AI ───
    if (isHumanConversation || needsHuman) {
      if (!needsHuman) {
        // Only broadcast user echo for already-flagged conversations (not freshly detected)
        broadcast(conversationId, {
          type: 'agent_end',
          agentId: 'system',
          messageId: userMessage.id,
          fullText: text,
        })
      }
      return
    }

    // ─── Case 3: Normal flow → trigger AI ───
    processMessage(conversationId, text, userId, modelOverride, imageUrl).catch(err => {
      console.error('[Chat] Error processing message:', err)
      broadcast(conversationId, { type: 'error', message: 'Error procesando mensaje' })
    })

  } catch (err) {
    console.error('[Chat] Error:', err)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
})

// Approve or reject a plan (with optional instance selection)
router.post('/approve', optionalAuth, async (req, res) => {
  const { messageId, approved, selectedAgents } = req.body as ApprovalRequest
  const userId = req.auth?.userId ?? 'anonymous'

  try {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { approved },
    })

    const conversationId = message.conversationId

    if (approved) {
      const plan = await getPendingPlan(messageId)
      if (plan) {
        await removePendingPlan(messageId)

        // selectedAgents now contains instanceIds
        let steps = plan.steps
        if (selectedAgents && selectedAgents.length > 0) {
          const selectedSet = new Set(selectedAgents)
          steps = steps.filter(s => selectedSet.has(s.instanceId))
          // Clean up dependsOn references to removed instances
          steps = steps.map(s => ({
            ...s,
            dependsOn: s.dependsOn?.filter(dep => selectedSet.has(dep)),
          }))
        }

        // Create 'todo' kanban tasks for each step
        for (const step of steps) {
          await createTodoKanbanTask(conversationId, step)
        }

        // Start parallel execution
        startParallelExecution(conversationId, steps, userId).catch(err => {
          console.error('[Chat] Error executing plan:', err)
          broadcast(conversationId, { type: 'error', message: 'Error ejecutando el plan' })
        })
      }
    } else {
      const rejectMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: 'Pluria',
          text: 'Proceso cancelado. En que mas puedo ayudarte?',
          type: 'agent',
          botType: 'base',
        },
      })
      broadcast(conversationId, {
        type: 'agent_end',
        agentId: 'base',
        messageId: rejectMsg.id,
        fullText: rejectMsg.text,
      })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[Chat] Approve error:', err)
    res.status(500).json({ error: 'Error al procesar aprobacion' })
  }
})

// Approve or stop — advances to next execution group
router.post('/approve-step', optionalAuth, async (req, res) => {
  const { conversationId, approved } = req.body as StepApprovalRequest

  try {
    if (!approved) {
      // User stopped the plan
      await removeExecutingPlan(conversationId)
      broadcast(conversationId, { type: 'coordination_end' })

      const stopMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: 'Pluria',
          text: 'Ejecucion detenida por el usuario. Los resultados generados hasta ahora se conservan.',
          type: 'agent',
          botType: 'base',
        },
      })
      broadcast(conversationId, {
        type: 'agent_end',
        agentId: 'base',
        messageId: stopMsg.id,
        fullText: stopMsg.text,
      })

      res.json({ ok: true })
      return
    }

    // Continue to next group
    const plan = await getExecutingPlan(conversationId)
    if (!plan) {
      res.status(404).json({ error: 'No hay plan en ejecucion para esta conversacion' })
      return
    }

    // Advance to next group
    plan.currentGroupIndex++
    await setExecutingPlan(conversationId, plan)

    if (plan.currentGroupIndex >= plan.executionGroups.length) {
      // All groups done — user clicked "Finalizar" after refining
      await removeExecutingPlan(conversationId)
      broadcast(conversationId, { type: 'coordination_end' })
      res.json({ ok: true })
      return
    }

    res.json({ ok: true })

    // Execute next group
    executeCurrentGroup(plan).catch(err => {
      console.error('[Chat] Error executing next group:', err)
      broadcast(conversationId, { type: 'error', message: 'Error ejecutando el siguiente paso' })
    })
  } catch (err) {
    console.error('[Chat] Approve-step error:', err)
    res.status(500).json({ error: 'Error al procesar aprobacion de paso' })
  }
})

// Refine a visual agent's output with user feedback
router.post('/refine-step', optionalAuth, async (req, res) => {
  const { conversationId, text, instanceId } = req.body as RefineStepRequest
  const userId = req.auth?.userId ?? 'anonymous'

  try {
    const plan = await getExecutingPlan(conversationId)
    if (!plan) {
      res.status(404).json({ error: 'No hay plan en ejecucion' })
      return
    }

    // Find the step to refine — by instanceId or fallback to last completed visual agent
    let stepToRefine: OrchestratorStep | undefined
    if (instanceId) {
      stepToRefine = plan.steps.find(s => s.instanceId === instanceId)
    } else {
      // Fallback: find the last completed refine-capable agent in the current group
      const currentGroup = plan.executionGroups[plan.currentGroupIndex]
      if (currentGroup) {
        for (let i = currentGroup.instanceIds.length - 1; i >= 0; i--) {
          const iid = currentGroup.instanceIds[i]
          const step = plan.steps.find(s => s.instanceId === iid)
          if (step && REFINE_AGENT_IDS.includes(step.agentId) && plan.completedInstances.includes(iid)) {
            stepToRefine = step
            break
          }
        }
      }
    }

    if (!stepToRefine) {
      res.status(400).json({ error: 'No hay paso para refinar' })
      return
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Tu',
        text,
        type: 'user',
      },
    })

    res.json({ ok: true, messageId: userMessage.id })

    // Execute refinement async
    refineStep(plan, stepToRefine, text, userId).catch(err => {
      console.error('[Chat] Error refining step:', err)
      broadcast(conversationId, { type: 'error', message: 'Error al refinar el paso' })
    })
  } catch (err) {
    console.error('[Chat] Refine-step error:', err)
    res.status(500).json({ error: 'Error al refinar paso' })
  }
})

// Abort current execution — user clicked "Stop"
router.post('/abort', optionalAuth, async (req, res) => {
  const { conversationId } = req.body as { conversationId: string }

  try {
    const plan = await getExecutingPlan(conversationId)
    if (plan) {
      await removeExecutingPlan(conversationId)
    }

    broadcast(conversationId, { type: 'coordination_end' })

    const stopMsg = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Sistema',
        text: 'Ejecucion detenida por el usuario.',
        type: 'agent',
        botType: 'system',
      },
    })
    broadcast(conversationId, {
      type: 'agent_end',
      agentId: 'system',
      messageId: stopMsg.id,
      fullText: stopMsg.text,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Chat] Abort error:', err)
    res.status(500).json({ error: 'Error al detener ejecucion' })
  }
})

// Activate a bot and continue execution
router.post('/activate-and-continue', optionalAuth, async (req, res) => {
  const { conversationId, botId } = req.body as { conversationId: string; botId: string }
  const userId = req.auth?.userId ?? 'anonymous'

  try {
    // Activate the bot
    if (userId !== 'anonymous') {
      await prisma.userBot.upsert({
        where: { userId_botId: { userId, botId } },
        update: { isActive: true },
        create: { userId, botId, isActive: true },
      })
    }

    // Re-execute the current plan if available
    const plan = await getExecutingPlan(conversationId)
    if (plan) {
      const step = plan.steps.find(s => s.agentId === botId && !plan.completedInstances.includes(s.instanceId))
      if (step) {
        res.json({ ok: true })
        executeSingleStep(plan, step).catch(err => {
          console.error('[Chat] Error re-executing step:', err)
          broadcast(conversationId, { type: 'error', message: `Error al ejecutar ${botId}` })
        })
        return
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[Chat] Activate-and-continue error:', err)
    res.status(500).json({ error: 'Error al activar bot' })
  }
})

// ─── Internal functions ───

interface OrchestratorOutput {
  requiresApproval?: boolean  // deprecated, ignored — agents auto-execute
  approvalMessage?: string    // deprecated
  directResponse?: string
  steps: Array<{
    agentId: string
    instanceId?: string
    task: string
    userDescription?: string
    dependsOn?: string[]
  }>
}

async function processMessage(conversationId: string, text: string, userId: string, modelOverride?: string, imageUrl?: string): Promise<void> {
  console.log('[processMessage] Start for:', conversationId)

  // ─── Anonymous users: only Pluria responds about the platform, no bots ───
  if (userId === 'anonymous') {
    await handleAnonymousMessage(conversationId, text)
    return
  }

  // ─── Credit check before processing ───
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

  // Attach image to the last user message if provided
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

  // Use modelOverride for orchestrator if provided
  const orchConfig = modelOverride
    ? resolveModelConfig(modelOverride, orchestratorConfig.modelConfig) ?? orchestratorConfig.modelConfig
    : orchestratorConfig.modelConfig

  // Check if the orchestrator's provider is available, try fallback if not
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
      trackUsage(userId, 'base', orchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error)
      consumeCredits(userId, 'base', orchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error)
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

  // Ensure all steps have instanceId and userDescription
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
    // Auto-execute: no approval needed, start working immediately
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

    // Typing effect for direct responses
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

export default router
