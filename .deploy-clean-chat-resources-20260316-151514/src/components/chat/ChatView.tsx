import { useState, useEffect, type FormEvent, type RefObject } from 'react'
import type { Agent, Message, QuickAction, Deliverable, KanbanTask, QuickReply } from '../../types'
import type { ProposedPlan, StepApproval, ThinkingStep, CoordinationAgent, ActiveAgent, ConversationItem, ProjectItem } from '../../hooks/useChat'
import { Zap, UserCircle, FolderPlus, FolderOpen, ChevronRight, Clock3 } from 'lucide-react'
import WelcomeScreen from './WelcomeScreen'
import MessageBubble, { StepApprovalCard } from './MessageBubble'
import ChatInput from './ChatInput'

interface ChatViewProps {
  messages: Message[]
  agents: Agent[]
  quickActions: QuickAction[]
  showWelcome: boolean
  isCoordinating: boolean
  inputText: string
  setInputText: (text: string) => void
  onSubmit: (e: FormEvent, imageFile?: File) => void
  chatEndRef: RefObject<HTMLDivElement>
  onApprove?: (id: string, selectedAgents?: string[]) => void
  onReject?: (id: string) => void
  onOpenDeliverable?: (d: Deliverable, clickedImageUrl?: string) => void
  pendingApproval?: string | null
  streamingText?: string
  streamingAgent?: string | null
  proposedPlan?: ProposedPlan | null
  pendingStepApproval?: StepApproval | null
  onApproveStep?: (conversationId: string, approved: boolean) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  thinkingSteps?: ThinkingStep[]
  coordinationAgents?: CoordinationAgent[]
  isRefineMode?: boolean
  onOpenMarketplace?: () => void
  assignedHumanAgent?: { name: string; role: string; specialty?: string; specialtyColor?: string; avatarUrl?: string } | null
  onRequestHuman?: () => void
  humanRequested?: boolean
  creditsExhausted?: boolean
  onUpgrade?: () => void
  disabledProviders?: string[]
  onAbort?: () => void
  activeAgents?: ActiveAgent[]
  onLoadTemplate?: (templateId: string) => void
  conversations?: ConversationItem[]
  onLoadConversation?: (id: string) => void
  isRefining?: boolean
  refiningAgentName?: string | null
  kanbanTasks?: KanbanTask[]
  activeDeliverable?: Deliverable | null
  quickReplies?: QuickReply[]
  onQuickReply?: (value: string) => void
  projectSuggest?: { conversationId: string; title: string } | null
  onCreateProject?: (name: string, convId?: string) => Promise<string | null>
  onAddToProject?: (projectId: string, convId: string) => Promise<void>
  onDismissProjectSuggest?: () => void
  projects?: ProjectItem[]
}

const agentMeta: Record<string, { name: string; color: string; initial: string }> = {
  seo: { name: 'Lupa', color: '#3b82f6', initial: 'L' },
  web: { name: 'Pixel', color: '#a855f7', initial: 'P' },
  voxel: { name: 'Voxel', color: '#06b6d4', initial: 'V' },
  content: { name: 'Pluma', color: '#f97316', initial: 'C' },
  ads: { name: 'Metric', color: '#10b981', initial: 'M' },
  video: { name: 'Reel', color: '#ef4444', initial: 'R' },
  dev: { name: 'Code', color: '#f59e0b', initial: 'D' },
  base: { name: 'Pluria', color: '#a78bfa', initial: 'P' },
  human: { name: 'Agente Humano', color: '#8b5cf6', initial: 'H' },
  system: { name: 'Sistema', color: '#6b7280', initial: 'S' },
}

// Visual agents whose streaming output is HTML code (don't show in chat)
const VISUAL_AGENTS = new Set(['web', 'voxel', 'dev', 'video'])

const ChatView = ({ messages, agents, quickActions, showWelcome, isCoordinating, inputText, setInputText, onSubmit, chatEndRef, onApprove, onReject, onOpenDeliverable, pendingApproval, streamingText, streamingAgent, proposedPlan, pendingStepApproval, onApproveStep, selectedModel, onModelChange, thinkingSteps, coordinationAgents, isRefineMode, onOpenMarketplace, assignedHumanAgent, onRequestHuman, humanRequested, creditsExhausted, onUpgrade, disabledProviders, onAbort, activeAgents, onLoadTemplate, conversations: _conversations, onLoadConversation: _onLoadConversation, isRefining, refiningAgentName, kanbanTasks: _kanbanTasks, activeDeliverable, quickReplies, onQuickReply, projectSuggest, onCreateProject, onAddToProject, onDismissProjectSuggest, projects }: ChatViewProps) => {
  const hasVisualStreaming = !!(streamingAgent && VISUAL_AGENTS.has(streamingAgent))
  const showUnifiedProgress = ((isCoordinating || isRefining || (activeAgents?.length ?? 0) > 0 || !!streamingAgent || hasVisualStreaming) && !(pendingStepApproval && !isRefining))
  const hasVisibleResult = !!activeDeliverable || !!pendingStepApproval

  return (
  <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
    {/* Human agent banner */}
    {assignedHumanAgent && (() => {
      const bannerColor = assignedHumanAgent.specialtyColor || '#8b5cf6'
      return (
        <div className="px-6 py-2 border-b flex items-center gap-2" style={{ backgroundColor: `${bannerColor}10`, borderColor: `${bannerColor}30` }}>
          {assignedHumanAgent.avatarUrl ? (
            <img src={assignedHumanAgent.avatarUrl} alt={assignedHumanAgent.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: bannerColor }}>
              <UserCircle size={14} />
            </div>
          )}
          <span className="text-xs font-semibold text-ink">
            {assignedHumanAgent.name} ({assignedHumanAgent.specialty || assignedHumanAgent.role}) esta en el chat
          </span>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: bannerColor }} />
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: bannerColor, backgroundColor: `${bannerColor}15` }}>
            IA pausada
          </span>
        </div>
      )
    })()}
    {/* Human assistance — subtle dot indicator, not a big banner */}

    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5 custom-scrollbar bg-surface min-h-0">
      {showWelcome && (
        <WelcomeScreen quickActions={quickActions} inputText={inputText} setInputText={setInputText} onSubmit={onSubmit} onOpenMarketplace={onOpenMarketplace} onLoadTemplate={onLoadTemplate} />
      )}

      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          agents={agents}
          onApprove={onApprove}
          onReject={onReject}
          onOpenDeliverable={onOpenDeliverable}
          proposedPlan={proposedPlan}
          pendingStepApproval={pendingStepApproval}
          onApproveStep={onApproveStep}
          onRequestHuman={onRequestHuman}
          humanRequested={humanRequested}
        />
      ))}

      {pendingStepApproval && onApproveStep && (
        <StepApprovalCard
          step={pendingStepApproval}
          onApproveStep={onApproveStep}
          onRequestHuman={onRequestHuman}
          humanRequested={humanRequested}
        />
      )}

      {/* Streaming bubble — only for NON-visual agents (visual agents stream HTML code) */}
      {streamingAgent && streamingText && !VISUAL_AGENTS.has(streamingAgent) && !showUnifiedProgress && (() => {
        const meta = agentMeta[streamingAgent]
        const color = meta?.color ?? '#6366f1'
        return (
          <div className="flex items-start gap-3 max-w-2xl">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
              style={{ backgroundColor: color }}
            >
              {meta?.initial ?? '?'}
            </div>
            <div className="pt-0.5">
              <span className="text-sm font-semibold text-ink">{meta?.name ?? streamingAgent}</span>
              <p className="text-sm leading-relaxed text-ink-light mt-1 whitespace-pre-wrap">{streamingText}<span className="animate-pulse text-ink-faint">|</span></p>
            </div>
          </div>
        )
      })()}

      {showUnifiedProgress && (
        <WorkstreamCard
          isRefining={!!isRefining}
          refiningAgentName={refiningAgentName || null}
          agents={coordinationAgents || []}
          thinkingSteps={thinkingSteps || []}
          activeAgents={activeAgents || []}
          streamingText={streamingText}
          streamingAgent={streamingAgent}
        />
      )}

      {/* Quick reply buttons */}
      {quickReplies && quickReplies.length > 0 && !isCoordinating && !streamingAgent && !hasVisibleResult && (
        <div className="max-w-2xl pl-10 flex flex-wrap gap-2 animate-[fadeSlideIn_0.3s_ease-out]">
          {quickReplies.map((qr, i) => (
            <button
              key={i}
              onClick={() => onQuickReply?.(qr.value)}
              className="px-4 py-2 bg-surface-alt border border-primary/20 text-sm font-medium text-primary rounded-xl hover:bg-primary/10 hover:border-primary/40 transition-all"
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Project suggestion card */}
      {projectSuggest && !isCoordinating && !streamingAgent && !hasVisibleResult && (
        <ProjectSuggestCard
          title={projectSuggest.title}
          conversationId={projectSuggest.conversationId}
          projects={projects || []}
          onCreateProject={onCreateProject}
          onAddToProject={onAddToProject}
          onDismiss={onDismissProjectSuggest}
        />
      )}

      <div ref={chatEndRef} />
    </div>

    {creditsExhausted && (
      <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 flex items-center gap-3">
        <Zap size={16} className="text-red-400 flex-shrink-0" />
        <p className="text-xs text-red-400 flex-1">
          <span className="font-bold">Creditos agotados.</span> Mejora tu plan para seguir usando los agentes.
        </p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Mejorar plan
          </button>
        )}
      </div>
    )}

    {!showWelcome && (
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        isCoordinating={(isCoordinating && !isRefineMode) || !!pendingApproval || !!creditsExhausted}
        onSubmit={onSubmit}
        onAbort={onAbort}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        refineMode={isRefineMode}
        refineAgentName={pendingStepApproval?.agentName}
        disabledProviders={disabledProviders}
      />
    )}
  </div>
  )
}

const WorkstreamCard = ({
  isRefining,
  refiningAgentName,
  agents,
  thinkingSteps,
  activeAgents,
  streamingText,
  streamingAgent,
}: {
  isRefining: boolean
  refiningAgentName: string | null
  agents: CoordinationAgent[]
  thinkingSteps: ThinkingStep[]
  activeAgents: ActiveAgent[]
  streamingText?: string
  streamingAgent?: string | null
}) => {
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)

  const totalAgents = activeAgents.length || agents.length
  const doneAgents = activeAgents.filter(a => a.status === 'done').length
  const allDone = doneAgents === totalAgents && totalAgents > 0

  useEffect(() => {
    if (allDone) return
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [allDone, startTime])

  const formatTime = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  const inferredRefineAgentId = Object.entries(agentMeta).find(([, meta]) => meta.name === refiningAgentName)?.[0] ?? 'dev'

  let planItems = agents.length > 0
    ? agents.map(ca => {
        const active = activeAgents.find(a => a.agentId === ca.agentId)
        return { ...ca, status: active?.status ?? 'waiting' as const, instanceId: active?.instanceId ?? ca.agentId, model: active?.model }
      })
    : activeAgents.map(a => ({ agentId: a.agentId, agentName: a.agentName, task: a.task, status: a.status, instanceId: a.instanceId, model: a.model }))

  if (isRefining && planItems.length === 0) {
    planItems = [{
      agentId: inferredRefineAgentId,
      agentName: refiningAgentName || agentMeta[inferredRefineAgentId]?.name || 'Code',
      task: 'Aplicando cambios sobre el resultado actual',
      status: 'working' as const,
      instanceId: `refine-${inferredRefineAgentId}`,
      model: undefined,
    }]
  }

  const workingItem = planItems.find(i => i.status === 'working') ?? planItems.find(i => i.status === 'waiting') ?? null
  const latestThought = thinkingSteps[thinkingSteps.length - 1] ?? null
  const workingThought = workingItem
    ? (() => {
        const arr = thinkingSteps.filter(s => s.instanceId === workingItem.instanceId || s.agentId === workingItem.agentId)
        return arr[arr.length - 1] ?? null
      })()
    : null
  const completedItems = planItems.filter(i => i.status === 'done').slice(-3)
  const currentStepIndex = workingItem ? Math.max(planItems.findIndex(i => i.instanceId === workingItem.instanceId), 0) + 1 : 1
  const isVisualStreaming = !!(streamingAgent && VISUAL_AGENTS.has(streamingAgent))
  const streamSize = streamingText?.length ?? 0
  const getItemThoughts = (item: { instanceId: string; agentId: string }) =>
    thinkingSteps.filter(s => s.instanceId === item.instanceId || s.agentId === item.agentId)
  const getItemProgress = (item: { instanceId: string; agentId: string; status: 'working' | 'waiting' | 'done' }) => {
    if (item.status === 'done') return 100

    const itemThoughts = getItemThoughts(item)
    const latestItemThought = itemThoughts[itemThoughts.length - 1]
    const thoughtBoost = Math.min(42, itemThoughts.length * 11)
    const recentThoughtBoost = latestItemThought && Date.now() - latestItemThought.timestamp < 12000 ? 8 : 0
    const isThisStreaming = streamingAgent === item.instanceId || streamingAgent === item.agentId
    const streamBoost = isThisStreaming && streamingText
      ? Math.min(26, 8 + Math.round(Math.log10((streamingText.length || 0) + 10) * 9))
      : 0
    const timeBoost = Math.min(20, Math.round(elapsed * 0.45))

    if (item.status === 'working') {
      return Math.min(94, 22 + thoughtBoost + recentThoughtBoost + streamBoost + timeBoost)
    }

    if (itemThoughts.length > 0) {
      return Math.min(38, 10 + thoughtBoost)
    }

    return 6
  }
  const itemProgressMap = new Map(planItems.map(item => [item.instanceId, getItemProgress(item)]))
  const estimatedProgress = (() => {
    if (planItems.length > 1) {
      const total = planItems.reduce((sum, item) => sum + (itemProgressMap.get(item.instanceId) ?? 0), 0)
      return Math.round(total / Math.max(planItems.length, 1))
    }
    if (doneAgents >= totalAgents && totalAgents > 0) return 100
    if (!isVisualStreaming && !latestThought) return 0

    const charProgress = streamSize > 0
      ? Math.min(88, 12 + Math.round(Math.log10(streamSize + 10) * 26))
      : 8
    const timeProgress = Math.min(82, Math.round(elapsed * 1.4))
    return Math.max(charProgress, timeProgress)
  })()

  const liveStage = (() => {
    if (workingThought?.step) return workingThought.step
    if (latestThought?.step) return latestThought.step
    if (isRefining) return 'Leyendo tus indicaciones, aplicando cambios y reconstruyendo la version refinada.'
    if (!isVisualStreaming) return 'Organizando estructura, datos y modulos base.'
    if (streamSize < 120) return 'Preparando estructura inicial y archivos base.'
    if (streamSize < 1200) return 'Construyendo layout y estructura principal.'
    if (streamSize < 4000) return 'Conectando modulos, componentes y flujos visibles.'
    if (streamSize < 9000) return 'Afinando detalles visuales y comportamiento.'
    return 'Cerrando entrega y empaquetando resultado final.'
  })()
  const stageLabel = (() => {
    if (isRefining) {
      if (estimatedProgress < 35) return 'Aplicando tus cambios'
      if (estimatedProgress < 80) return 'Reconstruyendo la version'
      return 'Preparando la entrega refinada'
    }
    if (estimatedProgress < 20) return 'Preparando el trabajo'
    if (estimatedProgress < 55) return 'Construyendo tu resultado'
    if (estimatedProgress < 85) return 'Afinando detalles'
    return 'Preparando la entrega'
  })()
  const remainingCount = Math.max(planItems.filter(item => item.status !== 'done').length - (workingItem ? 1 : 0), 0)

  return (
    <div className="max-w-3xl animate-[fadeSlideIn_0.3s_ease-out]">
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="rounded-3xl border border-edge bg-surface-alt/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 border-b border-edge bg-gradient-to-r from-primary/8 via-transparent to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/12 flex items-center justify-center flex-shrink-0">
              <div className="w-5 h-5 rounded-full animate-spin border-2 border-primary border-t-transparent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
                {isRefining ? 'Aplicando cambios' : 'Trabajando en tu resultado'}
              </p>
              <h3 className="text-base font-bold text-ink mt-1">{stageLabel}</h3>
              <p className="text-sm text-ink-faint mt-1">{liveStage}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-faint rounded-full bg-surface/80 px-3 py-1.5 border border-edge">
              <Clock3 size={14} />
              <span>{formatTime(elapsed)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {agents.length === 0 && activeAgents.length === 0 && (
            <div className="rounded-2xl bg-surface px-4 py-3 border border-edge text-sm font-medium text-ink-faint">
              Preparando plan de trabajo...
            </div>
          )}

          {workingItem && (
            <div className="rounded-2xl border border-primary/20 bg-surface px-4 py-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">
                    {isRefining ? 'Estado actual' : 'Progreso actual'}
                  </p>
                  <p className="text-sm font-semibold text-ink mt-1">{stageLabel}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {estimatedProgress}%
                </span>
              </div>
              <p className="text-sm text-ink-light">{workingThought?.step || liveStage}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!isRefining && totalAgents > 1 && (
                  <span className="px-3 py-1.5 rounded-full bg-subtle text-xs font-semibold text-ink-faint">
                    {currentStepIndex} de {totalAgents} etapas activas
                  </span>
                )}
                {!isRefining && remainingCount > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-subtle text-xs font-semibold text-ink-faint">
                    Quedan {remainingCount} paso{remainingCount > 1 ? 's' : ''}
                  </span>
                )}
                {completedItems.length > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/8 text-xs font-semibold text-emerald-700">
                    {completedItems.length} bloque{completedItems.length > 1 ? 's' : ''} completado{completedItems.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {totalAgents > 0 && (
          <div className="px-5 py-4 border-t border-edge bg-surface/70">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${estimatedProgress}%` }}
                />
              </div>
              <span className={`text-[11px] font-semibold flex-shrink-0 ${allDone ? 'text-emerald-600' : 'text-ink-faint'}`}>
                {allDone
                  ? `Listo en ${formatTime(elapsed)}`
                  : isRefining
                    ? `Refinando ${formatTime(elapsed)}`
                    : `${doneAgents}/${totalAgents} completado`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Project suggestion card — modal-style with explanation + community sharing
const ProjectSuggestCard = ({ title, conversationId, projects, onCreateProject, onAddToProject, onDismiss }: {
  title: string
  conversationId: string
  projects: ProjectItem[]
  onCreateProject?: (name: string, convId?: string) => Promise<string | null>
  onAddToProject?: (projectId: string, convId: string) => Promise<void>
  onDismiss?: () => void
}) => {
  const [mode, setMode] = useState<'initial' | 'new' | 'existing'>('initial')
  const [projectName, setProjectName] = useState(title)

  if (mode === 'new') {
    return (
      <div className="max-w-lg pl-10 animate-[fadeSlideIn_0.2s_ease-out]">
        <div className="rounded-2xl border border-primary/20 bg-surface-alt p-5 shadow-lg">
          <p className="text-sm font-bold text-ink mb-3">Nombre del proyecto</p>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-surface border border-edge rounded-lg mb-4 focus:outline-none focus:border-primary"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && projectName.trim() && onCreateProject?.(projectName.trim(), conversationId)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => projectName.trim() && onCreateProject?.(projectName.trim(), conversationId)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary text-primary-fg text-xs font-bold rounded-lg hover:opacity-90 transition-all"
            >
              <FolderPlus size={14} />
              Guardar proyecto
            </button>
            <button onClick={() => setMode('initial')} className="px-3 py-2 text-xs text-ink-faint hover:text-ink transition-colors">
              Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'existing' && projects.length > 0) {
    return (
      <div className="max-w-lg pl-10 animate-[fadeSlideIn_0.2s_ease-out]">
        <div className="rounded-2xl border border-primary/20 bg-surface-alt p-5 shadow-lg">
          <p className="text-sm font-bold text-ink mb-3">Agregar a proyecto existente</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onAddToProject?.(p.id, conversationId)}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left hover:bg-subtle transition-colors"
              >
                <FolderOpen size={14} className="text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                  <p className="text-[10px] text-ink-faint">{p.conversationCount} conversaciones</p>
                </div>
                <ChevronRight size={14} className="text-ink-faint flex-shrink-0" />
              </button>
            ))}
          </div>
          <button onClick={() => setMode('initial')} className="mt-2 text-xs text-ink-faint hover:text-ink transition-colors">
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg pl-10 animate-[fadeSlideIn_0.3s_ease-out]">
      <div className="rounded-2xl border border-primary/15 bg-surface-alt p-5 shadow-lg">
        {/* Header with icon */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderPlus size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Guardar como proyecto</p>
            <p className="text-xs text-ink-faint mt-0.5">
              Un proyecto agrupa todo tu trabajo: web, logo, video, pauta, contenido.
              Podras seguir iterando y agregar mas assets en el futuro.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => setMode('new')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-primary text-primary-fg text-sm font-bold rounded-xl hover:opacity-90 transition-all"
          >
            <FolderPlus size={16} />
            <div className="text-left flex-1">
              <span>Nuevo proyecto</span>
              <p className="text-[10px] font-normal opacity-80">Crea un espacio para organizar este y futuros trabajos</p>
            </div>
          </button>

          {projects.length > 0 && (
            <button
              onClick={() => setMode('existing')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-edge text-sm font-semibold text-ink-light rounded-xl hover:bg-subtle transition-all"
            >
              <FolderOpen size={16} />
              <div className="text-left flex-1">
                <span>Agregar a proyecto existente</span>
                <p className="text-[10px] font-normal text-ink-faint">{projects.length} proyecto{projects.length > 1 ? 's' : ''} disponible{projects.length > 1 ? 's' : ''}</p>
              </div>
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="w-full mt-3 text-xs text-ink-faint hover:text-ink text-center py-1 transition-colors"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}

export default ChatView

