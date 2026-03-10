import { useState, useEffect, type FormEvent, type RefObject } from 'react'
import type { Agent, Message, QuickAction, Deliverable, KanbanTask, QuickReply } from '../../types'
import type { ProposedPlan, StepApproval, ThinkingStep, CoordinationAgent, ActiveAgent, ConversationItem, ProjectItem } from '../../hooks/useChat'
import { Zap, UserCircle, FolderPlus, FolderOpen, ChevronRight } from 'lucide-react'
import WelcomeScreen from './WelcomeScreen'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import ThinkingBox from './ThinkingBox'

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
  content: { name: 'Pluma', color: '#f97316', initial: 'C' },
  ads: { name: 'Metric', color: '#10b981', initial: 'M' },
  video: { name: 'Reel', color: '#ef4444', initial: 'R' },
  dev: { name: 'Code', color: '#f59e0b', initial: 'D' },
  base: { name: 'Pluria', color: '#a78bfa', initial: 'P' },
  human: { name: 'Agente Humano', color: '#8b5cf6', initial: 'H' },
  system: { name: 'Sistema', color: '#6b7280', initial: 'S' },
}

// Visual agents whose streaming output is HTML code (don't show in chat)
const VISUAL_AGENTS = new Set(['web', 'dev', 'video'])

const ChatView = ({ messages, agents, quickActions, showWelcome, isCoordinating, inputText, setInputText, onSubmit, chatEndRef, onApprove, onReject, onOpenDeliverable, pendingApproval, streamingText, streamingAgent, proposedPlan, pendingStepApproval, onApproveStep, selectedModel, onModelChange, thinkingSteps, coordinationAgents, isRefineMode, onOpenMarketplace, assignedHumanAgent, onRequestHuman, humanRequested, creditsExhausted, onUpgrade, disabledProviders, onAbort, activeAgents, onLoadTemplate, conversations: _conversations, onLoadConversation: _onLoadConversation, isRefining, refiningAgentName, kanbanTasks: _kanbanTasks, activeDeliverable: _activeDeliverable, quickReplies, onQuickReply, projectSuggest, onCreateProject, onAddToProject, onDismissProjectSuggest, projects }: ChatViewProps) => {

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

      {/* Thinking box — only shown outside coordination (e.g. refine mode) */}
      {thinkingSteps && thinkingSteps.length > 0 && !streamingText && !isCoordinating && (
        <ThinkingBox steps={thinkingSteps} />
      )}

      {/* Streaming bubble — only for NON-visual agents (visual agents stream HTML code) */}
      {streamingAgent && streamingText && !VISUAL_AGENTS.has(streamingAgent) && (() => {
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

      {/* Visual agent streaming indicator — just shows "working" instead of raw code */}
      {streamingAgent && streamingText && VISUAL_AGENTS.has(streamingAgent) && (() => {
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
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{meta?.name ?? streamingAgent}</span>
                <span className="text-xs text-ink-faint">generando...</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-32 h-1 bg-subtle rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-transparent animate-shimmer" style={{ backgroundColor: color, opacity: 0.5 }} />
                </div>
                <span className="text-[10px] text-ink-faint font-mono">{Math.round(streamingText.length / 1000)}k chars</span>
              </div>
            </div>
          </div>
        )
      })()}


      {/* Refining indicator */}
      {isRefining && !isCoordinating && !pendingStepApproval && !streamingAgent && (
        <RefiningIndicator agentName={refiningAgentName || 'Pluria'} thinkingSteps={thinkingSteps || []} />
      )}

      {isCoordinating && !pendingStepApproval && (
        <WorkingChecklist
          agents={coordinationAgents || []}
          thinkingSteps={thinkingSteps || []}
          activeAgents={activeAgents || []}
        />
      )}

      {/* Quick reply buttons */}
      {quickReplies && quickReplies.length > 0 && !isCoordinating && !streamingAgent && (
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
      {projectSuggest && !isCoordinating && !streamingAgent && (
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

// Refining indicator — minimal, just avatar + status
const RefiningIndicator = ({ agentName, thinkingSteps }: { agentName: string; thinkingSteps: ThinkingStep[] }) => {
  const agentId = Object.keys(agentMeta).find(k => agentMeta[k].name === agentName) || 'web'
  const meta = agentMeta[agentId]
  const color = meta?.color ?? '#6366f1'
  const latestStep = thinkingSteps.length > 0 ? thinkingSteps[thinkingSteps.length - 1] : null

  return (
    <div className="flex items-start gap-3 max-w-2xl">
      <div className="relative flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
          style={{ backgroundColor: color }}
        >
          {meta?.initial ?? '?'}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface" style={{ backgroundColor: color }}>
          <div className="w-full h-full rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.4 }} />
        </div>
      </div>
      <div className="pt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{agentName}</span>
          <span className="text-xs text-ink-faint">refinando...</span>
        </div>
        {latestStep && (
          <p className="text-xs text-ink-faint mt-0.5">{latestStep.step}</p>
        )}
      </div>
    </div>
  )
}

// Working checklist — clean Lovable-style progress list with avatars
const WorkingChecklist = ({ agents, thinkingSteps, activeAgents }: { agents: CoordinationAgent[]; thinkingSteps: ThinkingStep[]; activeAgents: ActiveAgent[] }) => {
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

  // Build unified plan items
  const planItems = agents.length > 0
    ? agents.map(ca => {
        const active = activeAgents.find(a => a.agentId === ca.agentId)
        return { ...ca, status: active?.status ?? 'waiting' as const, instanceId: active?.instanceId ?? ca.agentId, model: active?.model }
      })
    : activeAgents.map(a => ({ agentId: a.agentId, agentName: a.agentName, task: a.task, status: a.status, instanceId: a.instanceId, model: a.model }))

  const workingItem = planItems.find(i => i.status === 'working')
  const workingMeta = workingItem ? agentMeta[workingItem.agentId] : null
  const workingThought = workingItem
    ? (() => { const arr = thinkingSteps.filter(s => s.instanceId === workingItem.instanceId || s.agentId === workingItem.agentId); return arr[arr.length - 1] ?? null })()
    : null

  return (
    <div className="max-w-2xl space-y-2 animate-[fadeSlideIn_0.3s_ease-out]">
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes checkPop { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
.check-pop { animation: checkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }`}</style>

      {/* Fallback when no agents yet */}
      {agents.length === 0 && activeAgents.length === 0 && (
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <div className="w-4 h-4 rounded-full animate-spin border-2 border-primary border-t-transparent" />
          </div>
          <span className="text-sm font-semibold text-ink">Preparando plan de trabajo...</span>
        </div>
      )}

      {/* Plan checklist — compact items */}
      {planItems.map((item, idx) => {
        const isDone = item.status === 'done'
        const isWorking = item.status === 'working'
        const meta = agentMeta[item.agentId]
        const color = meta?.color ?? '#6b7280'

        return (
          <div
            key={item.instanceId}
            className={`flex items-center gap-3 py-1.5 transition-opacity duration-300 ${isDone ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Avatar — always visible */}
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold transition-all duration-300"
                style={{ backgroundColor: isDone ? `${color}90` : color }}
              >
                {meta?.initial ?? '?'}
              </div>
              {/* Check badge overlay */}
              {isDone && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-surface check-pop">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
              {/* Working pulse ring */}
              {isWorking && (
                <div className="absolute inset-[-3px] rounded-full border-2 animate-ping opacity-30" style={{ borderColor: color }} />
              )}
            </div>

            {/* Task text */}
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] leading-snug ${isDone ? 'text-ink-faint line-through' : 'text-ink-light'}`}>
                {item.task}
              </p>
            </div>

            {/* Status badge */}
            {isDone && (
              <svg className="flex-shrink-0 check-pop" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="#10b981"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </div>
        )
      })}

      {/* Active agent working indicator — prominent */}
      {workingItem && workingMeta && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-surface-alt rounded-xl border border-edge">
          <div className="relative flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
              style={{ backgroundColor: workingMeta.color }}
            >
              {workingMeta.initial}
            </div>
            <div className="absolute inset-[-2px] rounded-full border-2 animate-spin" style={{ borderColor: 'transparent', borderTopColor: workingMeta.color, animationDuration: '1.5s' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {workingItem.agentName} <span className="font-normal text-ink-faint">trabajando en</span>
            </p>
            <p className="text-xs text-ink-light truncate">{workingThought?.step || workingItem.task}</p>
          </div>
          <div className="w-24 h-1.5 bg-subtle rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full animate-[shimmer_1.5s_infinite]" style={{ backgroundColor: workingMeta.color, opacity: 0.6, width: '60%' }} />
          </div>
        </div>
      )}

      {/* Progress footer */}
      {totalAgents > 0 && (
        <div className="flex items-center gap-3 pt-1">
          {/* Mini progress bar */}
          <div className="flex-1 h-1 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(doneAgents / totalAgents) * 100}%` }}
            />
          </div>
          <span className={`text-[10px] font-medium flex-shrink-0 ${allDone ? 'text-emerald-500' : 'text-ink-faint'}`}>
            {allDone ? `Listo en ${formatTime(elapsed)}` : `${doneAgents}/${totalAgents} · ${formatTime(elapsed)}`}
          </span>
        </div>
      )}
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
