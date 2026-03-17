import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { broadcast } from './sse.js'
import { getProvider } from './llm/router.js'
import { orchestratorConfig } from '../config/agents.js'
import { trackUsage } from './token-tracker.js'
import { checkCredits, consumeCredits } from './credit-tracker.js'
import { setPendingPlan, type OrchestratorStep } from './plan-cache.js'
import { agentConfigs } from '../config/agents.js'
import type { LLMMessage } from './llm/types.js'
import { readAndEncodeImage } from './image-utils.js'
import { handleAnonymousMessage } from './anonymous-handler.js'
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js'
import { startParallelExecution } from './execution-engine.js'
import { getToolDefinitions, executeToolCall } from './tools/executor.js'
import { buildProjectAppExecutionBrief, inferProjectAppType, type ProjectAppType } from './project-apps.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface OrchestratorOutput {
  requiresApproval?: boolean
  approvalMessage?: string
  directResponse?: string
  quickReplies?: Array<{ label: string; value: string; icon?: string }>
  steps: Array<{
    agentId: string
    instanceId?: string
    task: string
    userDescription?: string
    dependsOn?: string[]
    phaseIndex?: number
    phaseTotal?: number
    phaseTitle?: string
  }>
}

const PHASE_DESC_RE = /^fase\s+(\d+)\s*\/\s*(\d+)\s*:\s*(.+)$/i

function stripCodeFences(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
}

function tryParseJson(text: string): OrchestratorOutput | null {
  try {
    return JSON.parse(text) as OrchestratorOutput
  } catch {
    return null
  }
}

function extractJsonStringField(text: string, fieldName: string): string | null {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 's')
  const match = text.match(pattern)
  if (!match) return null

  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return match[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
  }
}

function salvageJsonLikeOutput(text: string): OrchestratorOutput | null {
  if (!text.includes('"directResponse"') && !text.includes('"quickReplies"') && !text.includes('"steps"')) {
    return null
  }

  const directResponse = extractJsonStringField(text, 'directResponse') ?? undefined
  const quickReplyMatches = [...text.matchAll(/"label"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"value"\s*:\s*"((?:\\.|[^"\\])*)"/g)]
  const quickReplies = quickReplyMatches.map(([, rawLabel, rawValue]) => ({
    label: (() => {
      try { return JSON.parse(`"${rawLabel}"`) as string } catch { return rawLabel }
    })(),
    value: (() => {
      try { return JSON.parse(`"${rawValue}"`) as string } catch { return rawValue }
    })(),
  }))

  if (!directResponse && quickReplies.length === 0) {
    return null
  }

  return {
    directResponse,
    quickReplies,
    steps: [],
  }
}

function normalizeOrchestratorOutput(output: Partial<OrchestratorOutput>, fallbackText: string): OrchestratorOutput {
  const quickReplies = Array.isArray(output.quickReplies)
    ? output.quickReplies
        .filter((item): item is { label: string; value: string; icon?: string } => {
          return !!item && typeof item.label === 'string' && typeof item.value === 'string'
        })
        .map(item => ({
          label: item.label.trim(),
          value: item.value.trim(),
          ...(item.icon ? { icon: item.icon } : {}),
        }))
        .filter(item => item.label && item.value)
    : []

  const steps = Array.isArray(output.steps)
    ? output.steps
        .filter((step): step is OrchestratorOutput['steps'][number] => {
          return !!step && typeof step.agentId === 'string' && typeof step.task === 'string'
        })
        .map(step => ({
          agentId: step.agentId,
          task: step.task,
          ...(step.instanceId ? { instanceId: step.instanceId } : {}),
          ...(step.userDescription ? { userDescription: step.userDescription } : {}),
          ...(Array.isArray(step.dependsOn) ? { dependsOn: step.dependsOn.filter(dep => typeof dep === 'string') } : {}),
          ...(typeof step.phaseIndex === 'number' && Number.isFinite(step.phaseIndex) ? { phaseIndex: Math.max(1, Math.floor(step.phaseIndex)) } : {}),
          ...(typeof step.phaseTotal === 'number' && Number.isFinite(step.phaseTotal) ? { phaseTotal: Math.max(1, Math.floor(step.phaseTotal)) } : {}),
          ...(typeof step.phaseTitle === 'string' && step.phaseTitle.trim() ? { phaseTitle: step.phaseTitle.trim() } : {}),
        }))
    : []

  const directResponse = typeof output.directResponse === 'string'
    ? output.directResponse.trim()
    : ''

  return {
    directResponse: directResponse || (steps.length === 0 ? (quickReplies.length > 0 ? '¿Qué tipo de proyecto prefieres?' : stripCodeFences(fallbackText)) : undefined),
    quickReplies,
    steps,
  }
}

function parsePhaseFromDescription(userDescription?: string): Pick<OrchestratorStep, 'phaseIndex' | 'phaseTotal' | 'phaseTitle'> {
  if (!userDescription) return {}
  const match = userDescription.trim().match(PHASE_DESC_RE)
  if (!match) return {}

  const phaseIndex = Number.parseInt(match[1], 10)
  const phaseTotal = Number.parseInt(match[2], 10)
  const phaseTitle = match[3]?.trim()

  return {
    ...(Number.isFinite(phaseIndex) && phaseIndex > 0 ? { phaseIndex } : {}),
    ...(Number.isFinite(phaseTotal) && phaseTotal > 0 ? { phaseTotal } : {}),
    ...(phaseTitle ? { phaseTitle } : {}),
  }
}

function computeDerivedPhaseIndices(steps: Array<Pick<OrchestratorStep, 'instanceId' | 'dependsOn'>>): Map<string, number> {
  const stepMap = new Map(steps.map(step => [step.instanceId, step]))
  const memo = new Map<string, number>()
  const visiting = new Set<string>()

  const visit = (instanceId: string): number => {
    if (memo.has(instanceId)) return memo.get(instanceId)!
    if (visiting.has(instanceId)) return 1

    visiting.add(instanceId)
    const step = stepMap.get(instanceId)
    const depDepths = (step?.dependsOn ?? [])
      .filter(dep => stepMap.has(dep))
      .map(dep => visit(dep))
    visiting.delete(instanceId)

    const depth = depDepths.length > 0 ? Math.max(...depDepths) + 1 : 1
    memo.set(instanceId, depth)
    return depth
  }

  for (const step of steps) visit(step.instanceId)
  return memo
}

export function enrichPhaseMetadata<T extends OrchestratorStep>(steps: T[]): T[] {
  if (steps.length === 0) return steps

  const derivedPhaseIndices = computeDerivedPhaseIndices(steps)
  const describedPhases = steps.map(step => parsePhaseFromDescription(step.userDescription))
  const explicitTotals = steps
    .flatMap(step => [step.phaseTotal, parsePhaseFromDescription(step.userDescription).phaseTotal])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  const derivedTotal = Math.max(...Array.from(derivedPhaseIndices.values()), 1)
  const globalPhaseTotal = Math.max(...explicitTotals, derivedTotal)
  const shouldAnnotate = globalPhaseTotal > 1 || steps.some(step => typeof step.phaseIndex === 'number' || typeof step.phaseTitle === 'string')

  return steps.map((step, index) => {
    const described = describedPhases[index]
    const phaseIndex = step.phaseIndex ?? described.phaseIndex ?? (shouldAnnotate ? derivedPhaseIndices.get(step.instanceId) : undefined)
    const phaseTotal = step.phaseTotal ?? described.phaseTotal ?? (phaseIndex ? globalPhaseTotal : undefined)
    const phaseTitle = step.phaseTitle?.trim() || described.phaseTitle || undefined

    return {
      ...step,
      ...(phaseIndex ? { phaseIndex } : {}),
      ...(phaseTotal ? { phaseTotal: Math.max(phaseIndex ?? 1, phaseTotal) } : {}),
      ...(phaseTitle ? { phaseTitle } : {}),
    }
  })
}

function parseOrchestratorOutput(fullText: string): OrchestratorOutput {
  const cleaned = stripCodeFences(fullText)
  const directParse = tryParseJson(cleaned)
  if (directParse) return normalizeOrchestratorOutput(directParse, fullText)

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1)
    const substringParse = tryParseJson(candidate)
    if (substringParse) return normalizeOrchestratorOutput(substringParse, fullText)

    const repairedParse = tryParseJson(candidate.replace(/,\s*([}\]])/g, '$1'))
    if (repairedParse) return normalizeOrchestratorOutput(repairedParse, fullText)
  }

  const salvaged = salvageJsonLikeOutput(cleaned)
  if (salvaged) return normalizeOrchestratorOutput(salvaged, fullText)

  return {
    directResponse: cleaned || fullText,
    quickReplies: [],
    steps: [],
  }
}

const FAST_TRACK_APP_TYPES: ProjectAppType[] = ['delivery', 'chatflow', 'mobility', 'saas', 'ecommerce', 'generic']
const VIDEO_DIRECT_REPLY_PREFIX = 'Quiero que me entregues el video directamente en el chat. Idea:'
const VIDEO_WORKFLOW_REPLY_PREFIX = 'Quiero ajustar los nodos de este video en el editor. Idea:'
const VIDEO_INTENT_RE = /\b(video|reel|clip|animacion|animación|audiovisual|story|stories|short)\b/i
const VIDEO_WORKFLOW_RE = /\b(nodos|workflow|editor visual|editor de video)\b/i
const VIDEO_DIRECT_RE = /\b(video directo|entregame el video|entrégame el video|entregar el video|directamente en el chat|dame el video en el chat)\b/i

function deriveProjectName(source: string): string {
  const cleaned = source
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.slice(0, 48) || 'Proyecto'
}

export function getVisualFastTrack(text: string): OrchestratorStep | null {
  const lower = text.toLowerCase()
  if (/https?:\/\//.test(lower)) return null

  const isLogo = /\b(logo|logotipo|isotipo|imagotipo|identidad visual|marca|branding|monograma)\b/.test(lower)
  const isCampaign = /\b(flyer|flayer|banner|post|story|stories|afiche|volante|pendon|pendón|anuncio|pieza grafica|pieza gráfica|carrusel)\b/.test(lower)

  if (!isLogo && !isCampaign) return null

  // If user wants a full app/system WITH visual, let orchestrator decide (e.g. "hazme una tienda con logo" = multi-agent)
  // But "logo para mi tienda" = just a logo
  const hasAppIntent = /\b(landing|pagina|página|web|sitio|app|saas|sistema|plataforma|dashboard|delivery|ecommerce|crm)\b/.test(lower)
  if (hasAppIntent && !isLogo && !isCampaign) return null

  return {
    agentId: 'web',
    instanceId: isLogo ? 'brand-1' : 'visual-1',
    task: text,
    userDescription: isLogo ? 'Creando propuestas de logo' : 'Creando pieza visual',
  }
}

export function getFastTrackProjectAppType(text: string, hasExistingDevProject = false): ProjectAppType | null {
  if (hasExistingDevProject) return null

  const lower = text.toLowerCase()
  if (/https?:\/\//.test(lower)) return null

  const type = inferProjectAppType(lower)
  if (!FAST_TRACK_APP_TYPES.includes(type)) return null

  const matchedVerticals = [
    /(delivery|domicilio|restaurante|pedido|repartidor)/.test(lower),
    /(chatflow|workflow|chatbot|nodos|builder)/.test(lower),
    /(uber|ride|movilidad|conductor|viaje)/.test(lower),
  ].filter(Boolean).length

  if (matchedVerticals > 1) return null

  if (['saas', 'ecommerce', 'generic'].includes(type)) {
    if (!/\b(saas|sistema|plataforma|crm|erp|dashboard|backoffice|panel|clinica|cl[ií]nica|consultorio|hospital|inventario|gestion|gesti[oó]n|ecommerce|tienda|checkout|carrito|marketplace|admin)\b/.test(lower)) {
      return null
    }
  }

  if (/\b(todo|completo|completa|fases|fase|multiapp|plataforma|saas|ademas|tambien|junto|paralelo|landing|web publica|dashboard y)\b/.test(lower)) {
    return null
  }

  return type
}

export function getVideoRequestMode(text: string): 'workflow' | 'direct' | 'prompt' | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (trimmed.startsWith(VIDEO_WORKFLOW_REPLY_PREFIX)) return 'workflow'
  if (trimmed.startsWith(VIDEO_DIRECT_REPLY_PREFIX)) return 'direct'

  if (!VIDEO_INTENT_RE.test(trimmed)) return null
  if (VIDEO_WORKFLOW_RE.test(trimmed)) return 'workflow'
  if (VIDEO_DIRECT_RE.test(trimmed)) return 'direct'
  return 'prompt'
}

function stripVideoReplyPrefix(text: string, prefix: string): string {
  return text.startsWith(prefix) ? text.slice(prefix.length).trim() : text.trim()
}

function buildVideoDirectStep(text: string): OrchestratorStep {
  const cleanText = stripVideoReplyPrefix(text, VIDEO_DIRECT_REPLY_PREFIX) || text.trim()
  return {
    agentId: 'video',
    instanceId: 'video-1',
    task: `[VIDEO_DIRECT_CHAT] ${cleanText}`,
    userDescription: cleanText,
  }
}

function buildVideoWorkflowStep(text: string): OrchestratorStep {
  const cleanText = stripVideoReplyPrefix(text, VIDEO_WORKFLOW_REPLY_PREFIX) || text.trim()
  return {
    agentId: 'video',
    instanceId: 'video-1',
    task: cleanText,
    userDescription: cleanText,
  }
}

async function sendDirectResponse(
  conversationId: string,
  text: string,
  quickReplies?: Array<{ label: string; value: string; icon?: string }>
): Promise<void> {
  const directMsg = await prisma.message.create({
    data: {
      id: uuid(),
      conversationId,
      sender: 'Pluria',
      text,
      type: 'agent',
      botType: 'base',
    },
  })

  broadcast(conversationId, {
    type: 'agent_end',
    agentId: 'base',
    messageId: directMsg.id,
    fullText: text,
  })

  if (quickReplies && quickReplies.length > 0) {
    broadcast(conversationId, {
      type: 'quick_replies',
      options: quickReplies,
    })
  }
}

function buildFastTrackStep(text: string, type: ProjectAppType): OrchestratorStep {
  const projectName = deriveProjectName(text)
  const brief = buildProjectAppExecutionBrief(type, projectName, 1)

  return {
    agentId: 'dev',
    instanceId: 'dev-1',
    task: `${brief.prompt} Requisitos especificos del usuario: ${text}.`,
    userDescription: `Fase ${brief.phaseIndex}/1: ${brief.title}`,
    phaseIndex: brief.phaseIndex,
    phaseTotal: 1,
    phaseTitle: brief.phaseTitle,
  }
}

function buildExistingProjectExtensionStep(text: string, instanceId: string): OrchestratorStep {
  const cleanText = text.trim()

  return {
    agentId: 'dev',
    instanceId,
    task: cleanText,
    userDescription: cleanText,
    phaseIndex: 1,
    phaseTotal: 1,
    phaseTitle: 'Extension',
  }
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

  // If no imageUrl provided directly, recover it from recent chat history (e.g. user sent image then replied to quickReplies)
  if (!imageUrl) {
    const recentWithImage = await prisma.message.findFirst({
      where: { conversationId, type: 'user', attachmentJson: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { attachmentJson: true },
    })
    if (recentWithImage?.attachmentJson) {
      try {
        const att = JSON.parse(recentWithImage.attachmentJson) as { imageUrl?: string }
        if (att.imageUrl) {
          imageUrl = att.imageUrl
          console.log(`[processMessage] Recovered imageUrl from DB: ${imageUrl}`)
        }
      } catch {}
    }
  }

  if (imageUrl) {
    const encoded = await readAndEncodeImage(imageUrl)
    if (encoded) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMsg) {
        lastUserMsg.images = [{ type: 'image', source: encoded.source, mediaType: encoded.mediaType }]
        // Append the image URL to the text so the orchestrator can pass it to agents (e.g. for remove_background tool)
        if (!lastUserMsg.content.includes('[Imagen adjunta por el usuario:')) {
          lastUserMsg.content += `\n\n[Imagen adjunta por el usuario: ${imageUrl}]`
        }
      }
    }
  }

  // Inject existing project context so the orchestrator knows about follow-up extensions
  const existingDevProject = await prisma.deliverable.findFirst({
    where: { conversationId, type: 'code' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, instanceId: true, title: true, content: true },
  })

  if (existingDevProject) {
    let fileList = ''
    try {
      const files = JSON.parse(existingDevProject.content)
      if (Array.isArray(files)) {
        fileList = files.map((f: any) => f.path).join(', ')
      }
    } catch {}

    const projectContext = `\n\n[SISTEMA: Esta conversacion tiene un proyecto dev existente (instanceId: ${existingDevProject.instanceId}). Archivos actuales: ${fileList}. Si el usuario pide cambios, modulos nuevos, o mejoras a este proyecto, usa modo EXTENSION con el mismo instanceId.]`

    // Append to the last user message
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'user') {
        lastMsg.content += projectContext
      }
    }
    console.log(`[processMessage] Existing dev project found: ${existingDevProject.instanceId}, injecting context`)
  }

  const videoMode = getVideoRequestMode(text)
  if (videoMode === 'workflow') {
    await startParallelExecution(conversationId, [buildVideoWorkflowStep(text)], userId, modelOverride, imageUrl)
    return
  }
  if (videoMode === 'direct') {
    await startParallelExecution(conversationId, [buildVideoDirectStep(text)], userId, modelOverride, imageUrl)
    return
  }
  if (videoMode === 'prompt') {
    const cleanIdea = text.trim()
    await sendDirectResponse(
      conversationId,
      'Quieres ajustar los nodos de tu video o prefieres que te lo entregue directo en el chat?',
      [
        { label: 'Entrega directa', value: `${VIDEO_DIRECT_REPLY_PREFIX} ${cleanIdea}` },
        { label: 'Ajustar nodos', value: `${VIDEO_WORKFLOW_REPLY_PREFIX} ${cleanIdea}` },
      ],
    )
    return
  }

  // If user selected an image model [IMAGE_MODEL: xxx], ALWAYS route to Pixel visual agent
  const imageModelTag = text.match(/\[IMAGE_MODEL:\s*(\S+)\]/)
  if (imageModelTag) {
    console.log(`[processMessage] IMAGE_MODEL detected: ${imageModelTag[1]} — forcing visual route`)
    broadcast(conversationId, {
      type: 'agent_thinking',
      agentId: 'base',
      agentName: 'Pluria',
      step: 'Generando imagen con ' + imageModelTag[1] + '...',
    })
    const visualStep: OrchestratorStep = {
      agentId: 'web',
      instanceId: 'visual-1',
      task: text,
      userDescription: 'Generando imagen',
    }
    await startParallelExecution(conversationId, [visualStep], userId, modelOverride, imageUrl)
    return
  }

  // Fast-track visual tasks (logo, flyer, banner, post) — skip orchestrator LLM, go direct to Pixel
  // MUST run before app fast-track to prevent "logo para mi tienda" being captured as ecommerce
  const visualFastTrack = getVisualFastTrack(text)
  if (visualFastTrack) {
    console.log(`[processMessage] Visual fast-track: ${visualFastTrack.instanceId}`)
    broadcast(conversationId, {
      type: 'agent_thinking',
      agentId: 'base',
      agentName: 'Pluria',
      step: 'Activando agente de diseno...',
    })
    await startParallelExecution(conversationId, [visualFastTrack], userId, modelOverride, imageUrl)
    return
  }

  const fastTrackType = getFastTrackProjectAppType(text, !!existingDevProject)
  if (fastTrackType) {
    const step = buildFastTrackStep(text, fastTrackType)
    console.log(`[processMessage] Fast-track app detected: ${fastTrackType}`)

    broadcast(conversationId, {
      type: 'agent_thinking',
      agentId: 'base',
      agentName: 'Pluria',
      step: `Activando ruta rapida para ${fastTrackType}...`,
    })

    await startParallelExecution(conversationId, [step], userId, modelOverride, imageUrl)
    return
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

  const orchTools = orchestratorConfig.tools
  if (orchTools.length > 0) {
    const toolDefs = await getToolDefinitions(orchTools, userId)
    await provider.streamWithTools(orchestratorConfig.systemPrompt, messages, toolDefs, {
      onToken: () => {},
      onToolCall: async (toolCall) => {
        broadcast(conversationId, {
          type: 'agent_thinking',
          agentId: 'base',
          agentName: 'Pluria',
          step: toolCall.name === 'web_fetch' ? 'Visitando sitio web de referencia...' : `Usando ${toolCall.name}...`,
        })
        return await executeToolCall(toolCall, conversationId, orchestratorConfig, userId)
      },
      onComplete: (fullText, usage) => {
        console.log('[processMessage] LLM complete:', fullText.substring(0, 100))
        orchestratorOutput = parseOrchestratorOutput(fullText)
        trackUsage(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error)
        consumeCredits(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens).catch(console.error)
      },
      onError: (err) => {
        console.error('[Orchestrator] Error:', err)
        broadcast(conversationId, { type: 'error', message: 'Error al analizar el mensaje' })
      },
    })
  } else {
    await provider.stream(orchestratorConfig.systemPrompt, messages, {
      onToken: () => {},
      onComplete: (fullText, usage) => {
        console.log('[processMessage] LLM complete:', fullText.substring(0, 100))
        orchestratorOutput = parseOrchestratorOutput(fullText)
        trackUsage(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error)
        consumeCredits(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens).catch(console.error)
      },
      onError: (err) => {
        console.error('[Orchestrator] Error:', err)
        broadcast(conversationId, { type: 'error', message: 'Error al analizar el mensaje' })
      },
    })
  }

  console.log('[processMessage] Output:', orchestratorOutput ? 'ready' : 'null')
  if (!orchestratorOutput) return

  const output = orchestratorOutput as OrchestratorOutput
  if (!Array.isArray(output.steps)) output.steps = []

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

  output.steps = enrichPhaseMetadata(output.steps as OrchestratorStep[]) as typeof output.steps

  if (output.steps.length === 0) {
    const directResponseLooksLikeAck = !!output.directResponse
      && output.directResponse.length < 280
      && !output.quickReplies?.length
      && /\b(voy a crear|voy a construir|tengo claro|excelente|perfecto|entiendo|veo que|necesitas)\b/i.test(output.directResponse)

    if (existingDevProject?.instanceId && directResponseLooksLikeAck) {
      console.log(`[processMessage] Fallback extension activated for existing dev project: ${existingDevProject.instanceId}`)
      broadcast(conversationId, {
        type: 'agent_thinking',
        agentId: 'base',
        agentName: 'Pluria',
        step: 'Convirtiendo tu pedido en cambios sobre el proyecto actual...',
      })
      await startParallelExecution(
        conversationId,
        [buildExistingProjectExtensionStep(text, existingDevProject.instanceId)],
        userId,
        modelOverride,
        imageUrl,
      )
      return
    }

    if (!existingDevProject) {
      const fallbackFastTrackType = getFastTrackProjectAppType(text, false)

      if (fallbackFastTrackType && directResponseLooksLikeAck) {
        console.log(`[processMessage] Fallback fast-track activated after non-structured reply: ${fallbackFastTrackType}`)
        broadcast(conversationId, {
          type: 'agent_thinking',
          agentId: 'base',
          agentName: 'Pluria',
          step: `Activando ejecucion directa para ${fallbackFastTrackType}...`,
        })
        await startParallelExecution(conversationId, [buildFastTrackStep(text, fallbackFastTrackType)], userId, modelOverride, imageUrl)
        return
      }
    }
  }

  if (output.steps.length > 0) {
    broadcast(conversationId, {
      type: 'agent_thinking',
      agentId: 'base',
      agentName: 'Pluria',
      step: 'Preparando plan de ejecucion...',
    })

    const stepsForExec: OrchestratorStep[] = output.steps.map(s => ({
      agentId: s.agentId,
      instanceId: s.instanceId!,
      task: s.task,
      userDescription: s.userDescription!,
      dependsOn: s.dependsOn,
      phaseIndex: s.phaseIndex,
      phaseTotal: s.phaseTotal,
      phaseTitle: s.phaseTitle,
    }))

    const getAgentName = (agentId: string) => agentConfigs.find(a => a.id === agentId)?.name ?? agentId

    if (stepsForExec.length >= 2) {
      // 2+ steps → show plan proposal for user approval
      const approvalMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: 'Pluria',
          text: 'He preparado un plan de trabajo para tu proyecto. Revisa los pasos y aprueba para comenzar.',
          type: 'approval',
          botType: 'base',
        },
      })

      await setPendingPlan(approvalMsg.id, { steps: stepsForExec, imageUrl })

      broadcast(conversationId, {
        type: 'plan_proposal',
        messageId: approvalMsg.id,
        text: approvalMsg.text,
        steps: stepsForExec.map(s => ({
          agentId: s.agentId,
          agentName: getAgentName(s.agentId),
          instanceId: s.instanceId,
          task: s.task,
          userDescription: s.userDescription,
          dependsOn: s.dependsOn,
          phaseIndex: s.phaseIndex,
          phaseTotal: s.phaseTotal,
          phaseTitle: s.phaseTitle,
        })),
      })
    } else {
      // Single step → execute directly (builder mode)
      await startParallelExecution(conversationId, stepsForExec, userId, modelOverride, imageUrl)
    }
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

    // Send quick replies if the orchestrator provided them
    if (output.quickReplies && output.quickReplies.length > 0) {
      broadcast(conversationId, {
        type: 'quick_replies',
        options: output.quickReplies,
      })
    }
  }
}
