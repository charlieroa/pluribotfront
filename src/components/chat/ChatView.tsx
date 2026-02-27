import { useState, type FormEvent, type RefObject } from 'react'
import type { Agent, Message, QuickAction, Deliverable } from '../../types'
import type { ProposedPlan, StepApproval, ThinkingStep, InactiveBotPrompt, CoordinationAgent, ActiveAgent } from '../../hooks/useChat'
import { Zap, X, UserCircle, Sparkles, ChevronDown } from 'lucide-react'
import WelcomeScreen from './WelcomeScreen'
import MessageBubble, { StepApprovalCard } from './MessageBubble'
import ChatInput from './ChatInput'
import BotAvatar3D from '../avatars/BotAvatar3D'
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
  onOpenDeliverable?: (d: Deliverable) => void
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
  inactiveBotPrompt?: InactiveBotPrompt | null
  onActivateBot?: (botId: string) => void
  onDismissInactiveBot?: () => void
  assignedHumanAgent?: { name: string; role: string; specialty?: string; specialtyColor?: string; avatarUrl?: string } | null
  onRequestHuman?: () => void
  humanRequested?: boolean
  creditsExhausted?: boolean
  onUpgrade?: () => void
  disabledProviders?: string[]
  onAbort?: () => void
  activeAgents?: ActiveAgent[]
  onLoadTemplate?: (templateId: string) => void
}

const agentMeta: Record<string, { name: string; color: string }> = {
  seo: { name: 'Lupa', color: '#3b82f6' },
  brand: { name: 'Nova', color: '#ec4899' },
  web: { name: 'Pixel', color: '#a855f7' },
  social: { name: 'Spark', color: '#f97316' },
  ads: { name: 'Metric', color: '#10b981' },
  video: { name: 'Reel', color: '#ef4444' },
  logic: { name: 'Logic', color: '#6366f1' },
  base: { name: 'Pluria', color: '#6366f1' },
  human: { name: 'Agente Humano', color: '#8b5cf6' },
  system: { name: 'Sistema', color: '#6b7280' },
}

const ChatView = ({ messages, agents, quickActions, showWelcome, isCoordinating, inputText, setInputText, onSubmit, chatEndRef, onApprove, onReject, onOpenDeliverable, pendingApproval, streamingText, streamingAgent, proposedPlan, pendingStepApproval, onApproveStep, selectedModel, onModelChange, thinkingSteps, coordinationAgents, isRefineMode, onOpenMarketplace, inactiveBotPrompt, onActivateBot, onDismissInactiveBot, assignedHumanAgent, onRequestHuman, humanRequested, creditsExhausted, onUpgrade, disabledProviders, onAbort, activeAgents, onLoadTemplate }: ChatViewProps) => (
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
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 custom-scrollbar bg-page min-h-0">
      {showWelcome && (
        <WelcomeScreen quickActions={quickActions} setInputText={setInputText} onOpenMarketplace={onOpenMarketplace} onLoadTemplate={onLoadTemplate} />
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

      {/* Streaming bubble — shows text as it arrives from the LLM */}
      {streamingAgent && streamingText && (
        <div className="flex gap-4 max-w-2xl">
          <BotAvatar3D
            color={agentMeta[streamingAgent]?.color ?? '#6366f1'}
            seed={agentMeta[streamingAgent]?.name ?? 'base'}
            isActive={true}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-surface p-4 rounded-2xl rounded-tl-none border border-edge shadow-sm text-ink">
              <p className="text-xs font-bold text-primary mb-1">
                {agentMeta[streamingAgent]?.name ?? streamingAgent}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingText}<span className="animate-pulse">|</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Step approval card */}
      {pendingStepApproval && onApproveStep && (
        <StepApprovalCard step={pendingStepApproval} onApproveStep={onApproveStep} onRequestHuman={onRequestHuman} humanRequested={humanRequested} />
      )}

      {/* Inactive bot activation card */}
      {inactiveBotPrompt && onActivateBot && onDismissInactiveBot && (
        <div className="flex gap-4 max-w-2xl">
          <BotAvatar3D
            color={agentMeta[inactiveBotPrompt.botId]?.color ?? '#6b7280'}
            seed={inactiveBotPrompt.botName}
            isActive={false}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-amber-800">
                  Bot inactivo: {inactiveBotPrompt.botName}
                </p>
                <button onClick={onDismissInactiveBot} className="text-amber-400 hover:text-amber-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                Esta tarea necesita a <strong>{inactiveBotPrompt.botName}</strong>: "{inactiveBotPrompt.stepTask}"
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onActivateBot(inactiveBotPrompt.botId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all"
                >
                  <Zap size={12} />
                  Activar y continuar
                </button>
                <button
                  onClick={onDismissInactiveBot}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-600 hover:text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200 transition-all"
                >
                  Omitir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCoordinating && !pendingStepApproval && (
        <WorkingCard
          agents={coordinationAgents || []}
          thinkingSteps={thinkingSteps || []}
          activeAgents={activeAgents || []}
        />
      )}
      <div ref={chatEndRef} />
    </div>

    {creditsExhausted && (
      <div className="px-4 py-3 bg-red-50 border-t border-red-200 flex items-center gap-3">
        <Zap size={16} className="text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 flex-1">
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
  </div>
)

// Working card — shows agents working with progress bar
const WorkingCard = ({ agents, thinkingSteps, activeAgents }: { agents: CoordinationAgent[]; thinkingSteps: ThinkingStep[]; activeAgents: ActiveAgent[] }) => {
  const [expanded, setExpanded] = useState(false)

  const latestStep = thinkingSteps.length > 0 ? thinkingSteps[thinkingSteps.length - 1] : null
  const totalAgents = activeAgents.length
  const doneAgents = activeAgents.filter(a => a.status === 'done').length
  const progressPercent = totalAgents > 0 ? Math.round((doneAgents / totalAgents) * 100) : 0

  return (
    <div className="flex gap-3 max-w-2xl">
      {/* Stacked avatars */}
      <div className="flex flex-col gap-1 flex-shrink-0 pt-1">
        {agents.length > 0 ? (
          agents.slice(0, 3).map((agent, i) => (
            <BotAvatar3D
              key={`${agent.agentId}-${i}`}
              color={agentMeta[agent.agentId]?.color ?? '#6b7280'}
              seed={agent.agentName}
              isActive={true}
              size="sm"
            />
          ))
        ) : (
          <BotAvatar3D color="#6366f1" seed="Pluria" isActive={true} size="sm" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-none border border-indigo-200 shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50/80 to-purple-50/50">
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2.5">
            <Sparkles size={14} className="text-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-indigo-600">Trabajando en tu proyecto</span>
            {totalAgents > 0 && (
              <span className="text-[10px] font-semibold text-indigo-400 ml-auto">
                {doneAgents}/{totalAgents}
              </span>
            )}
            {totalAgents === 0 && (
              <div className="ml-auto flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}
          </div>

          {/* Progress bar */}
          {totalAgents > 0 && (
            <div className="px-4 pb-2">
              <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(progressPercent, doneAgents === 0 ? 8 : progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Agent steps list */}
          {activeAgents.length > 0 && (
            <div className="px-4 pb-2 space-y-1.5">
              {activeAgents.map(agent => {
                const isDone = agent.status === 'done'
                const isWorking = agent.status === 'working'
                const color = agentMeta[agent.agentId]?.color ?? '#6b7280'
                // Find latest thinking step for this agent
                const agentThinking = thinkingSteps.filter(s => s.instanceId === agent.instanceId || s.agentId === agent.agentId)
                const lastThought = agentThinking.length > 0 ? agentThinking[agentThinking.length - 1] : null

                return (
                  <div key={agent.instanceId} className="flex items-center gap-2">
                    {isDone ? (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    ) : isWorking ? (
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: color, borderTopColor: 'transparent' }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: `${color}40` }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-semibold ${isDone ? 'line-through opacity-50' : ''}`} style={{ color }}>
                          {agent.agentName}
                        </span>
                        {isWorking && lastThought && (
                          <span className="text-[10px] text-ink-faint truncate">{lastThought.step}</span>
                        )}
                        {isDone && (
                          <span className="text-[10px] text-emerald-500 font-medium">Listo</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Fallback when no agents yet */}
          {agents.length === 0 && activeAgents.length === 0 && !latestStep && (
            <div className="px-4 pb-3 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-ink-faint">Preparando agentes...</span>
            </div>
          )}

          {/* Expandable thinking history */}
          {thinkingSteps.length > 1 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-2 flex items-center gap-1.5 text-[10px] font-medium text-indigo-400 hover:text-indigo-600 transition-colors border-t border-indigo-100"
              >
                <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                {expanded ? 'Ocultar detalle' : 'Ver detalle'}
              </button>

              {expanded && (
                <div className="px-4 pb-3 border-t border-indigo-100">
                  <div className="space-y-1 pt-2">
                    {thinkingSteps.map((s, i) => {
                      const isLatest = i === thinkingSteps.length - 1
                      return (
                        <div
                          key={s.timestamp}
                          className={`flex items-center gap-2 ${isLatest ? 'opacity-100' : 'opacity-40'}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLatest ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: agentMeta[s.agentId]?.color ?? '#6b7280' }}
                          />
                          <span className={`text-[10px] ${isLatest ? 'font-medium text-ink-light' : 'text-ink-faint'}`}>
                            {s.agentName}: {s.step}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatView
