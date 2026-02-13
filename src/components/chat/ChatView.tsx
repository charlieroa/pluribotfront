import type { FormEvent, RefObject } from 'react'
import type { Agent, Message, QuickAction, Deliverable } from '../../types'
import type { ProposedPlan, StepApproval, ThinkingStep, InactiveBotPrompt } from '../../hooks/useChat'
import { Zap, X, UserCircle } from 'lucide-react'
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
  isRefineMode?: boolean
  onOpenMarketplace?: () => void
  inactiveBotPrompt?: InactiveBotPrompt | null
  onActivateBot?: (botId: string) => void
  onDismissInactiveBot?: () => void
  assignedHumanAgent?: { name: string; role: string; specialty?: string; specialtyColor?: string } | null
}

const agentMeta: Record<string, { name: string; color: string }> = {
  seo: { name: 'Lupa', color: '#3b82f6' },
  web: { name: 'Pixel', color: '#a855f7' },
  ads: { name: 'Metric', color: '#10b981' },
  dev: { name: 'Logic', color: '#f59e0b' },
  video: { name: 'Reel', color: '#ef4444' },
  base: { name: 'Pluria', color: '#2563eb' },
  human: { name: 'Agente Humano', color: '#8b5cf6' },
  system: { name: 'Sistema', color: '#6b7280' },
}

const ChatView = ({ messages, agents, quickActions, showWelcome, isCoordinating, inputText, setInputText, onSubmit, chatEndRef, onApprove, onReject, onOpenDeliverable, pendingApproval, streamingText, streamingAgent, proposedPlan, pendingStepApproval, onApproveStep, selectedModel, onModelChange, thinkingSteps, isRefineMode, onOpenMarketplace, inactiveBotPrompt, onActivateBot, onDismissInactiveBot, assignedHumanAgent }: ChatViewProps) => (
  <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
    {/* Human agent banner */}
    {assignedHumanAgent && (() => {
      const bannerColor = assignedHumanAgent.specialtyColor || '#8b5cf6'
      return (
        <div className="px-6 py-2 border-b flex items-center gap-2" style={{ backgroundColor: `${bannerColor}10`, borderColor: `${bannerColor}30` }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: bannerColor }}>
            <UserCircle size={14} />
          </div>
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
    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-page min-h-0">
      {showWelcome && (
        <WelcomeScreen quickActions={quickActions} setInputText={setInputText} onOpenMarketplace={onOpenMarketplace} />
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
        />
      ))}

      {/* Thinking box — shows what the agent is doing before streaming */}
      {thinkingSteps && thinkingSteps.length > 0 && !streamingText && (
        <ThinkingBox steps={thinkingSteps} />
      )}

      {/* Streaming bubble — shows text as it arrives from the LLM */}
      {streamingAgent && streamingText && (
        <div className="flex gap-4 max-w-2xl">
          <BotAvatar3D
            color={agentMeta[streamingAgent]?.color ?? '#2563eb'}
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
        <StepApprovalCard step={pendingStepApproval} onApproveStep={onApproveStep} />
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
        <div className="flex gap-4 max-w-2xl">
          <div className="w-8 h-8 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center text-primary-fg">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="bg-surface p-4 rounded-2xl rounded-tl-none border border-edge shadow-sm flex gap-3 items-center">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-xs font-medium text-ink-faint">Coordinando agentes...</span>
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>

    <ChatInput
      inputText={inputText}
      setInputText={setInputText}
      isCoordinating={(isCoordinating && !isRefineMode) || !!pendingApproval}
      onSubmit={onSubmit}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      refineMode={isRefineMode}
      refineAgentName={pendingStepApproval?.agentName}
    />
  </div>
)

export default ChatView
