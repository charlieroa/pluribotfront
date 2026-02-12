import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { addConnection, broadcast } from '../services/sse.js'
import { getProvider } from '../services/llm/router.js'
import { getAgentConfig, orchestratorConfig, agentConfigs } from '../config/agents.js'
import { trackUsage } from '../services/token-tracker.js'
import {
  getPendingPlan, setPendingPlan, removePendingPlan,
  getExecutingPlan, setExecutingPlan, removeExecutingPlan,
  type ExecutingPlan, type OrchestratorStep,
} from '../services/plan-cache.js'
import type { SendMessageRequest, SendMessageResponse, ApprovalRequest, StepApprovalRequest, RefineStepRequest } from '../../../shared/types.js'
import type { LLMMessage, LLMProviderConfig } from '../services/llm/types.js'
import { executeToolCall } from '../services/tools/executor.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

    const senderUser = userId !== 'anonymous'
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } })
      : null

    const isAssignedAgent = conversation?.assignedAgentId === userId && senderUser && ['superadmin', 'org_admin', 'agent'].includes(senderUser.role)
    const isHumanConversation = conversation?.assignedAgentId && conversation?.needsHumanReview

    // ─── Case 1: Admin/agent writes in assigned conversation → human agent message, no AI ───
    if (isAssignedAgent && senderUser) {
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
        agentName: senderUser.name,
        agentRole: senderUser.role === 'superadmin' ? 'Supervisor' : senderUser.role === 'org_admin' ? 'Administrador' : 'Agente',
        text,
        messageId: message.id,
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
    }

    // ─── Case 2: Client replies in a human-supervised conversation → no AI ───
    if (isHumanConversation) {
      // Just broadcast the user message to the admin, don't trigger AI
      broadcast(conversationId, {
        type: 'agent_end',
        agentId: 'system',
        messageId: userMessage.id,
        fullText: text,
      })
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
      const plan = getPendingPlan(messageId)
      if (plan) {
        removePendingPlan(messageId)

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
      removeExecutingPlan(conversationId)
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
    const plan = getExecutingPlan(conversationId)
    if (!plan) {
      res.status(404).json({ error: 'No hay plan en ejecucion para esta conversacion' })
      return
    }

    // Advance to next group
    plan.currentGroupIndex++
    setExecutingPlan(conversationId, plan)

    if (plan.currentGroupIndex >= plan.executionGroups.length) {
      // All groups done — user clicked "Finalizar" after refining
      removeExecutingPlan(conversationId)
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
    const plan = getExecutingPlan(conversationId)
    if (!plan) {
      res.status(404).json({ error: 'No hay plan en ejecucion' })
      return
    }

    // Find the step to refine — by instanceId or fallback to last completed visual agent
    let stepToRefine: OrchestratorStep | undefined
    if (instanceId) {
      stepToRefine = plan.steps.find(s => s.instanceId === instanceId)
    } else {
      // Fallback: find the last completed visual agent in the current group
      const currentGroup = plan.executionGroups[plan.currentGroupIndex]
      if (currentGroup) {
        for (let i = currentGroup.instanceIds.length - 1; i >= 0; i--) {
          const iid = currentGroup.instanceIds[i]
          const step = plan.steps.find(s => s.instanceId === iid)
          if (step && (step.agentId === 'web' || step.agentId === 'dev' || step.agentId === 'video') && plan.completedInstances.includes(iid)) {
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
    const plan = getExecutingPlan(conversationId)
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
  requiresApproval: boolean
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

// Supported media types by Anthropic API
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

// Detect real MIME type from file magic bytes (not extension)
function detectImageMimeType(buffer: Buffer): string {
  if (buffer.length < 4) return 'unknown'
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png'
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif'
  // WebP: RIFF....WEBP
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp'
  // Fallback: unknown (will be converted)
  return 'unknown'
}

// Read a local file, convert if needed, and encode as base64
async function readAndEncodeImage(imageUrl: string): Promise<{ source: string; mediaType: string } | null> {
  try {
    const filePath = path.resolve(__dirname, '../..', imageUrl.replace(/^\//, ''))
    if (!fs.existsSync(filePath)) return null
    const data = fs.readFileSync(filePath)
    let mediaType = detectImageMimeType(data)
    console.log(`[Image] ${imageUrl} → detected: ${mediaType} (${data.length} bytes)`)

    // If the format is not supported by LLM APIs (e.g. AVIF, BMP, TIFF), convert to PNG
    if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) {
      console.log(`[Image] Converting unsupported format to PNG...`)
      const converted = await sharp(data).png().toBuffer()
      console.log(`[Image] Converted to PNG: ${converted.length} bytes`)
      return { source: converted.toString('base64'), mediaType: 'image/png' }
    }

    return { source: data.toString('base64'), mediaType }
  } catch (err) {
    console.error('[Image] Error reading/converting image:', err)
    return null
  }
}

// ─── Anonymous user handler: Pluria only explains the platform ───
async function handleAnonymousMessage(conversationId: string, userText: string): Promise<void> {
  const lowerText = userText.toLowerCase()

  // Contextual responses based on what the user asks
  let responseText: string

  if (lowerText.includes('precio') || lowerText.includes('costo') || lowerText.includes('plan') || lowerText.includes('gratis')) {
    responseText = `Pluribots tiene un plan gratuito para que pruebes la plataforma. Para ver los planes y acceder a los agentes, solo necesitas crear una cuenta. Es gratis y toma menos de 30 segundos.\n\nRegistrate para comenzar a usar los bots.`
  } else if (lowerText.includes('que es') || lowerText.includes('como funciona') || lowerText.includes('que hace') || lowerText.includes('hola') || lowerText.includes('hey') || lowerText.includes('hi')) {
    responseText = `Hola! Soy Pluria, el orquestador de Pluribots.\n\nPluribots es una plataforma con agentes de IA especializados que trabajan por ti:\n\n• **Lupa** — Estratega SEO: auditorias, keywords y posicionamiento en Google\n• **Pixel** — Disenador Visual: logos, banners, landing pages y graficas con IA\n• **Metric** — Ads Specialist: campanas de Meta Ads y Google Ads optimizadas\n• **Logic** — Full-Stack Dev: paginas web funcionales con codigo real\n• **Reel** — Creador de Video: reels y videos con IA generativa\n\nYo me encargo de coordinar a los agentes segun tu proyecto. Describis lo que necesitas y yo activo al equipo correcto.\n\nPara empezar a usarlos, registrate gratis. Es rapido!`
  } else if (lowerText.includes('seo') || lowerText.includes('keyword') || lowerText.includes('google') || lowerText.includes('posicion')) {
    responseText = `Para tareas de SEO tenemos a **Lupa**, nuestro estratega SEO. Puede hacer auditorias completas, investigacion de keywords, analisis de backlinks y estrategias de posicionamiento.\n\nPero para activar a Lupa necesitas una cuenta. Registrate gratis y podras usarlo de inmediato!`
  } else if (lowerText.includes('diseno') || lowerText.includes('logo') || lowerText.includes('banner') || lowerText.includes('landing') || lowerText.includes('imagen')) {
    responseText = `Para diseno tenemos a **Pixel**, nuestro disenador visual con IA. Crea logos, banners, landing pages, posts para redes y cualquier pieza grafica.\n\nPara activar a Pixel, solo necesitas registrarte. Es gratis!`
  } else if (lowerText.includes('video') || lowerText.includes('reel') || lowerText.includes('clip')) {
    responseText = `Para video tenemos a **Reel**, nuestro creador de video con IA generativa (Veo 3). Hace reels promocionales, clips de producto y contenido audiovisual.\n\nRegistrate gratis para activar a Reel y crear tu primer video!`
  } else if (lowerText.includes('ads') || lowerText.includes('publicidad') || lowerText.includes('campana') || lowerText.includes('meta') || lowerText.includes('facebook')) {
    responseText = `Para publicidad tenemos a **Metric**, nuestro especialista en ads. Crea campanas de Meta Ads y Google Ads optimizadas, con copywriting y segmentacion.\n\nPara usar a Metric, registrate gratis. Toma menos de 30 segundos!`
  } else if (lowerText.includes('web') || lowerText.includes('pagina') || lowerText.includes('codigo') || lowerText.includes('programar') || lowerText.includes('desarrollo')) {
    responseText = `Para desarrollo web tenemos a **Logic**, nuestro full-stack dev. Construye paginas web completas, funcionales y responsivas con codigo real.\n\nRegistrate gratis para activar a Logic y construir tu primera pagina!`
  } else {
    responseText = `Eso suena como un gran proyecto! En Pluribots tengo 5 agentes especializados que pueden ayudarte:\n\n• **Lupa** (SEO) • **Pixel** (Diseno) • **Metric** (Ads) • **Logic** (Dev) • **Reel** (Video)\n\nPuedo coordinarlos automaticamente segun lo que necesites. Pero primero necesitas crear una cuenta para activar a los bots.\n\nRegistrate gratis y empezamos!`
  }

  // Save and stream the response
  const directMsg = await prisma.message.create({
    data: {
      id: uuid(),
      conversationId,
      sender: 'Pluria',
      text: responseText,
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
  await sleep(400)
  broadcast(conversationId, { type: 'agent_start', agentId: 'base', agentName: 'Pluria' })

  // Stream words for typing effect
  const words = responseText.split(' ')
  const chunkSize = 3
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    const prefix = i === 0 ? '' : ' '
    broadcast(conversationId, { type: 'token', content: prefix + chunk, agentId: 'base' })
    await sleep(25)
  }

  broadcast(conversationId, {
    type: 'agent_end',
    agentId: 'base',
    messageId: directMsg.id,
    fullText: responseText,
  })
}

async function processMessage(conversationId: string, text: string, userId: string, modelOverride?: string, imageUrl?: string): Promise<void> {
  console.log('[processMessage] Start for:', conversationId)

  // ─── Anonymous users: only Pluria responds about the platform, no bots ───
  if (userId === 'anonymous') {
    await handleAnonymousMessage(conversationId, text)
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
    ? resolveModelConfig(modelOverride) ?? orchestratorConfig.modelConfig
    : orchestratorConfig.modelConfig
  const provider = getProvider(orchConfig)

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
          requiresApproval: false,
          directResponse: fullText,
          steps: [],
        }
      }
      trackUsage(userId, 'base', orchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error)
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

  if (output.requiresApproval && output.steps.length > 0) {
    broadcast(conversationId, { type: 'coordination_start' })

    const approvalMsg = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'Pluria',
        text: output.approvalMessage ?? 'Se activara la coordinacion de agentes. Deseas continuar?',
        type: 'approval',
        botType: 'base',
      },
    })

    // Convert to OrchestratorStep format for storage
    const stepsForCache: OrchestratorStep[] = output.steps.map(s => ({
      agentId: s.agentId,
      instanceId: s.instanceId!,
      task: s.task,
      userDescription: s.userDescription!,
      dependsOn: s.dependsOn,
    }))

    setPendingPlan(approvalMsg.id, { steps: stepsForCache })

    // Build plan steps with agent names for the frontend
    const planSteps = stepsForCache.map((s) => {
      const agentConfig = getAgentConfig(s.agentId)
      return {
        agentId: s.agentId,
        agentName: agentConfig?.name ?? s.agentId,
        instanceId: s.instanceId,
        task: s.task,
        userDescription: s.userDescription,
        dependsOn: s.dependsOn,
      }
    })

    // Send plan_proposal instead of simple approval_request
    broadcast(conversationId, {
      type: 'plan_proposal',
      messageId: approvalMsg.id,
      text: output.approvalMessage ?? '',
      steps: planSteps,
    })

    broadcast(conversationId, { type: 'coordination_end' })
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
    await sleep(600)
    broadcast(conversationId, { type: 'agent_start', agentId: 'base', agentName: 'Pluria' })

    const words = output.directResponse.split(' ')
    const chunkSize = 3
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ')
      const prefix = i === 0 ? '' : ' '
      broadcast(conversationId, { type: 'token', content: prefix + chunk, agentId: 'base' })
      await sleep(30)
    }

    broadcast(conversationId, {
      type: 'agent_end',
      agentId: 'base',
      messageId: directMsg.id,
      fullText: output.directResponse,
    })
  } else if (output.steps.length > 0 && !output.requiresApproval) {
    const stepsForExec: OrchestratorStep[] = output.steps.map(s => ({
      agentId: s.agentId,
      instanceId: s.instanceId!,
      task: s.task,
      userDescription: s.userDescription!,
      dependsOn: s.dependsOn,
    }))
    await startParallelExecution(conversationId, stepsForExec, userId, modelOverride, imageUrl)
  }
}

// ─── Parallel Execution Engine ───

// Start parallel execution: compute groups and run first group
async function startParallelExecution(
  conversationId: string,
  steps: OrchestratorStep[],
  userId: string,
  modelOverride?: string,
  imageUrl?: string
): Promise<void> {
  broadcast(conversationId, { type: 'coordination_start' })

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

  setExecutingPlan(conversationId, plan)
  await executeCurrentGroup(plan)
}

// Execute ALL steps in the current group in parallel
async function executeCurrentGroup(plan: ExecutingPlan): Promise<void> {
  const { conversationId } = plan
  const group = plan.executionGroups[plan.currentGroupIndex]

  if (!group) {
    // All groups done
    removeExecutingPlan(conversationId)
    broadcast(conversationId, { type: 'coordination_end' })
    return
  }

  const stepsInGroup = group.instanceIds
    .map(iid => plan.steps.find(s => s.instanceId === iid))
    .filter((s): s is OrchestratorStep => !!s)

  if (stepsInGroup.length === 0) {
    // Empty group, skip
    plan.currentGroupIndex++
    setExecutingPlan(conversationId, plan)
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
  setExecutingPlan(conversationId, plan)

  // Check if any visual agents were in this group (for refine mode)
  const visualSteps = stepsInGroup.filter(s => s.agentId === 'web' || s.agentId === 'dev' || s.agentId === 'video')
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
    removeExecutingPlan(conversationId)
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
  setExecutingPlan(conversationId, plan)
  await executeCurrentGroup(plan)
}

// Execute a single step (one specific instance)
async function executeSingleStep(plan: ExecutingPlan, step: OrchestratorStep): Promise<void> {
  const { conversationId, userId, modelOverride } = plan

  const agentConfig = getAgentConfig(step.agentId)
  if (!agentConfig) {
    console.warn(`[executeSingleStep] Agent config not found for ${step.agentId}`)
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
        contextBlock += `\n\n--- Contexto de ${depAgent?.name ?? depStep.agentId} (${depAgent?.role ?? 'agente'}) [${depInstanceId}] ---\n${plan.agentOutputs[depInstanceId]}\n--- Fin contexto ---`
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

  await sleep(500)

  // Visual agents (Pixel, Logic, Reel) work silently — no token streaming
  const isVisualAgent = agentConfig.id === 'web' || agentConfig.id === 'dev' || agentConfig.id === 'video'

  if (!isVisualAgent) {
    broadcast(conversationId, {
      type: 'agent_start',
      agentId: agentConfig.id,
      agentName: agentConfig.name,
      instanceId: step.instanceId,
      task: step.task,
    })
  }

  // Use modelOverride if provided, otherwise agent's default
  const agentModelConfig = modelOverride
    ? resolveModelConfig(modelOverride) ?? agentConfig.modelConfig
    : agentConfig.modelConfig
  const provider = getProvider(agentModelConfig)
  let agentFullText = ''
  let thinkingSent = false

  const agentTools = agentConfig.tools
  if (agentTools.length > 0) {
    const { getToolDefinitions } = await import('../services/tools/executor.js')
    const toolDefs = getToolDefinitions(agentTools)

    await provider.streamWithTools(agentConfig.systemPrompt, messages, toolDefs, {
      onToken: (token) => {
        if (!isVisualAgent) {
          broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
        } else if (!thinkingSent) {
          thinkingSent = true
          broadcast(conversationId, {
            type: 'agent_thinking',
            agentId: agentConfig.id,
            agentName: agentConfig.name,
            instanceId: step.instanceId,
            step: agentConfig.id === 'web' ? 'Disenando maqueta visual...' : 'Construyendo pagina funcional...',
          })
        }
      },
      onComplete: async (fullText, usage) => {
        agentFullText = fullText
        plan.agentOutputs[step.instanceId] = fullText
        await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
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
        } else if (!thinkingSent) {
          thinkingSent = true
          broadcast(conversationId, {
            type: 'agent_thinking',
            agentId: agentConfig.id,
            agentName: agentConfig.name,
            instanceId: step.instanceId,
            step: agentConfig.id === 'web' ? 'Disenando maqueta visual...' : 'Construyendo pagina funcional...',
          })
        }
      },
      onComplete: async (fullText, usage) => {
        agentFullText = fullText
        plan.agentOutputs[step.instanceId] = fullText
        await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
      },
      onError: (err) => {
        console.error(`[${agentConfig.name}:${step.instanceId}] Error:`, err)
        broadcast(conversationId, { type: 'error', message: `Error en ${agentConfig.name}` })
      },
    })
  }

  // Create deliverable
  console.log(`[${agentConfig.name}:${step.instanceId}] Response length: ${agentFullText.length} chars`)
  const htmlBlock = extractHtmlBlock(agentFullText)
  console.log(`[${agentConfig.name}:${step.instanceId}] HTML block: ${htmlBlock ? `YES (${htmlBlock.length} chars)` : 'NO - using text wrapper'}`)

  const deliverableTypeMap: Record<string, 'report' | 'code' | 'design' | 'copy' | 'video'> = {
    seo: 'report',
    web: 'design',
    ads: 'copy',
    dev: 'code',
    video: 'video',
  }
  const deliverableType = deliverableTypeMap[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 60)}`
  const deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)
  const _port = process.env.PORT ?? '3001'
  const deliverableContent = deliverableContentRaw
    .replace(/src="\/uploads\//g, `src="http://localhost:${_port}/uploads/`)
    .replace(/src='\/uploads\//g, `src='http://localhost:${_port}/uploads/`)

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

  const taskId = uuid()
  const kanbanTask = await prisma.kanbanTask.create({
    data: {
      id: taskId,
      conversationId,
      title: deliverableTitle,
      agent: agentConfig.name,
      status: 'doing',
      botType: agentConfig.botType,
      deliverableId,
      instanceId: step.instanceId,
    },
  })

  broadcast(conversationId, {
    type: 'kanban_update',
    task: {
      id: taskId,
      title: deliverableTitle,
      agent: agentConfig.name,
      status: 'doing' as const,
      botType: agentConfig.botType,
      deliverableId,
      instanceId: step.instanceId,
      createdAt: kanbanTask.createdAt.toISOString(),
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
  })
}

// Refine a completed step by re-running the agent with user feedback
async function refineStep(plan: ExecutingPlan, step: OrchestratorStep, userFeedback: string, userId: string): Promise<void> {
  const { conversationId, modelOverride } = plan
  const agentConfig = getAgentConfig(step.agentId)
  if (!agentConfig) return

  const isVisualAgent = agentConfig.id === 'web' || agentConfig.id === 'dev' || agentConfig.id === 'video'

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
        contextBlock += `\n\n--- Contexto de ${depAgent?.name ?? depStep.agentId} (${depAgent?.role ?? 'agente'}) ---\n${plan.agentOutputs[depInstanceId]}\n--- Fin contexto ---`
      }
    }
  }

  const previousOutput = plan.agentOutputs[step.instanceId] || ''

  // Build conversation: original task → previous output → refinement request
  const messages: LLMMessage[] = [
    { role: 'user' as const, content: `${step.task}${contextBlock}` },
    { role: 'assistant' as const, content: previousOutput },
    { role: 'user' as const, content: `El cliente ha revisado tu propuesta y pide los siguientes cambios:\n\n${userFeedback}\n\nGenera una nueva version completa incorporando estos cambios. Recuerda: responde SOLO con el HTML completo, sin texto adicional.` },
  ]

  const agentModelConfig = modelOverride
    ? resolveModelConfig(modelOverride) ?? agentConfig.modelConfig
    : agentConfig.modelConfig
  const provider = getProvider(agentModelConfig)

  let agentFullText = ''
  let thinkingSent = false

  await provider.stream(agentConfig.systemPrompt, messages, {
    onToken: (token) => {
      if (!isVisualAgent) {
        broadcast(conversationId, { type: 'token', content: token, agentId: agentConfig.id, instanceId: step.instanceId })
      } else if (!thinkingSent) {
        thinkingSent = true
        broadcast(conversationId, {
          type: 'agent_thinking',
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          instanceId: step.instanceId,
          step: 'Aplicando cambios al diseno...',
        })
      }
    },
    onComplete: async (fullText, usage) => {
      agentFullText = fullText
      plan.agentOutputs[step.instanceId] = fullText
      await trackUsage(userId, agentConfig.id, agentModelConfig.model, usage.inputTokens, usage.outputTokens)
    },
    onError: (err) => {
      console.error(`[${agentConfig.name}:${step.instanceId}] Refine error:`, err)
      broadcast(conversationId, { type: 'error', message: `Error al refinar con ${agentConfig.name}` })
    },
  })

  if (!agentFullText) return

  // Create new deliverable with refined content
  const htmlBlock = extractHtmlBlock(agentFullText)
  const deliverableTypeMap: Record<string, 'report' | 'code' | 'design' | 'copy'> = {
    seo: 'report', web: 'design', ads: 'copy', dev: 'code',
  }
  const deliverableType = deliverableTypeMap[agentConfig.id] ?? 'report'
  const deliverableTitle = `${agentConfig.name}: ${step.task.slice(0, 50)} (refinado)`
  const deliverableContentRaw = htmlBlock ?? wrapTextAsHtml(agentFullText, agentConfig.name, agentConfig.role)
  const _port = process.env.PORT ?? '3001'
  const deliverableContent = deliverableContentRaw
    .replace(/src="\/uploads\//g, `src="http://localhost:${_port}/uploads/`)
    .replace(/src='\/uploads\//g, `src='http://localhost:${_port}/uploads/`)

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
  })

  // Update plan and re-send step_complete
  setExecutingPlan(conversationId, plan)

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

// ─── Utility functions ───

// Resolve a model override string to a provider config
function resolveModelConfig(modelId: string): LLMProviderConfig | null {
  const models: Record<string, LLMProviderConfig> = {
    'claude-opus': { provider: 'anthropic', model: 'claude-opus-4-6' },
    'claude-sonnet': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    'claude-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
    'gpt-4.5': { provider: 'openai', model: 'gpt-4.5-preview' },
    'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
    'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
    'gemini-2.5-pro': { provider: 'google', model: 'gemini-2.5-pro' },
    'gemini-2.5-flash': { provider: 'google', model: 'gemini-2.5-flash' },
  }
  return models[modelId] ?? null
}

// Post-process groups: ensure each visual agent (Pixel/Logic) gets its own group
// so the user can approve/refine each output before the next one starts.
// Non-visual agents stay parallel as before.
function ensureSequentialVisualAgents(
  groups: { instanceIds: string[] }[],
  steps: OrchestratorStep[]
): { instanceIds: string[] }[] {
  const result: { instanceIds: string[] }[] = []

  for (const group of groups) {
    const visual: string[] = []
    const nonVisual: string[] = []

    for (const iid of group.instanceIds) {
      const step = steps.find(s => s.instanceId === iid)
      if (step && (step.agentId === 'web' || step.agentId === 'dev' || step.agentId === 'video')) {
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
function topologicalSortGroups(steps: OrchestratorStep[]): { instanceIds: string[] }[] {
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

// Extract HTML content from agent output
function extractHtmlBlock(text: string): string | null {
  const docTypeIdx = text.indexOf('<!DOCTYPE')
  const htmlTagIdx = text.indexOf('<html')
  const startIdx = docTypeIdx >= 0 ? docTypeIdx : htmlTagIdx

  if (startIdx >= 0) {
    const endIdx = text.lastIndexOf('</html>')
    if (endIdx > startIdx) {
      const html = text.substring(startIdx, endIdx + 7).trim()
      return html
    }
  }

  return null
}

const agentColorMap: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
}

// Wrap plain text/markdown into a styled HTML document for iframe rendering
function wrapTextAsHtml(text: string, agentName: string, agentRole: string): string {
  const color = agentColorMap[agentName.toLowerCase()] ?? '#6b7280'
  const bodyHtml = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background: #ffffff;
    padding: 2rem;
    line-height: 1.7;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid ${color}20;
  }
  .header .badge {
    background: ${color}15;
    color: ${color};
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .header .role {
    font-size: 0.8rem;
    color: #64748b;
  }
  h1 { font-size: 1.5rem; color: #0f172a; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.25rem; color: #0f172a; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem; }
  h3 { font-size: 1.05rem; color: #334155; margin: 1.25rem 0 0.4rem; }
  p { margin: 0.5rem 0; color: #334155; }
  ul { margin: 0.5rem 0 0.5rem 1.5rem; }
  li { margin: 0.25rem 0; color: #475569; }
  strong { color: #0f172a; }
  code {
    background: #f1f5f9;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85em;
    color: ${color};
  }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.9rem; }
  th { background: #f8fafc; font-weight: 600; color: #0f172a; }
  td { color: #475569; }
</style>
</head>
<body>
  <div class="header">
    <span class="badge">${agentName}</span>
    <span class="role">${agentRole}</span>
  </div>
  <div class="content">
    <p>${bodyHtml}</p>
  </div>
</body>
</html>`
}

export default router
