import { useState, useMemo } from 'react'
import { Check, X, FileText, ExternalLink, KanbanSquare, Play, Square, ChevronRight, Pencil, Layers, UserCircle } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import type { Agent, Message, Deliverable, PlanStep } from '../../types'
import type { ProposedPlan, StepApproval } from '../../hooks/useChat'

interface MessageBubbleProps {
  message: Message
  agents: Agent[]
  onApprove?: (id: string, selectedAgents?: string[]) => void
  onReject?: (id: string) => void
  onOpenDeliverable?: (d: Deliverable) => void
  proposedPlan?: ProposedPlan | null
  pendingStepApproval?: StepApproval | null
  onApproveStep?: (conversationId: string, approved: boolean) => void
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
  base: '#2563eb',
  human: '#8b5cf6',
  system: '#6b7280',
}

const MessageBubble = ({ message: m, agents, onApprove, onReject, onOpenDeliverable, proposedPlan }: MessageBubbleProps) => {
  const agent = agents.find(a => a.id === m.botType)

  // Plan proposal card with checkboxes
  if (m.type === 'approval' && proposedPlan && proposedPlan.messageId === m.id && m.approved === undefined) {
    return (
      <PlanProposalCard
        plan={proposedPlan}
        agent={agent}
        botType={m.botType}
        sender={m.sender}
        onApprove={onApprove}
        onReject={onReject}
      />
    )
  }

  // Approval card (legacy or post-decision)
  if (m.type === 'approval') {
    const isPending = m.approved === undefined
    return (
      <div className="flex gap-4 max-w-2xl">
        <BotAvatar3D
          color={agent?.color || '#2563eb'}
          seed={agent?.name || m.botType || 'base'}
          isActive={true}
          size="sm"
        />
        <div className="bg-surface rounded-2xl rounded-tl-none border border-edge shadow-sm overflow-hidden flex-1">
          <div className="p-4">
            <p className="text-xs font-bold text-primary mb-1">{m.sender}</p>
            <p className="text-sm leading-relaxed text-ink">{m.text}</p>
          </div>
          <div className="border-t border-edge px-4 py-3 bg-subtle">
            {isPending ? (
              <div className="flex gap-3">
                <button
                  onClick={() => onApprove?.(m.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Check size={14} />
                  Aprobar
                </button>
                <button
                  onClick={() => onReject?.(m.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-edge text-ink-light text-xs font-semibold rounded-lg hover:bg-subtle transition-colors"
                >
                  <X size={14} />
                  Rechazar
                </button>
              </div>
            ) : m.approved ? (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                <Check size={14} />
                Proceso aprobado
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500 text-xs font-semibold">
                <X size={14} />
                Proceso rechazado
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-4 max-w-2xl ${m.type === 'user' ? 'flex-row-reverse' : ''}`}>
        {m.type === 'user' ? (
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">YO</div>
        ) : m.sender === 'human_agent' || m.botType === 'human' ? (
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: m.specialtyColor || '#8b5cf6' }}>
            <UserCircle size={18} />
          </div>
        ) : (
          <BotAvatar3D
            color={agent?.color || agentColors[m.botType || ''] || '#2563eb'}
            seed={agent?.name || m.botType || 'base'}
            isActive={true}
            size="sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <div
            className={`p-4 shadow-sm ${
              m.type === 'user'
                ? 'bg-primary rounded-2xl rounded-tr-none text-primary-fg'
                : (m.sender === 'human_agent' || m.botType === 'human')
                  ? `rounded-2xl rounded-tl-none border text-ink ${m.specialtyColor ? 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-700' : 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800'}`
                  : 'bg-surface rounded-2xl rounded-tl-none border border-edge text-ink'
            }`}
          >
            {m.type === 'agent' && (m.sender === 'human_agent' || m.botType === 'human') && (
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs font-bold" style={{ color: m.specialtyColor || '#8b5cf6' }}>{m.sender === 'human_agent' ? (m.specialty ? m.sender : 'Agente Humano') : m.sender}</p>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: m.specialtyColor || '#8b5cf6' }}>
                  {m.specialty || 'Agente Humano'}
                </span>
              </div>
            )}
            {m.type === 'agent' && m.sender !== 'human_agent' && m.botType !== 'human' && (
              <p className="text-xs font-bold text-primary mb-1">{m.sender}</p>
            )}
            {m.imageUrl && (
              <img src={m.imageUrl} alt="Adjunto" className="max-w-xs max-h-48 rounded-lg mb-2 object-cover" />
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
          </div>

          {/* Attachment: code block */}
          {m.attachment?.type === 'code' && (
            <div className="mt-2 bg-surface border border-edge rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-subtle border-b border-edge flex items-center gap-2">
                <FileText size={13} className="text-ink-faint" />
                <span className="text-xs font-semibold text-ink-light">{m.attachment.title}</span>
              </div>
              <pre className="px-4 py-3 text-xs text-ink-light font-mono leading-relaxed whitespace-pre-wrap">
                {m.attachment.content}
              </pre>
            </div>
          )}

          {/* Attachment: deliverable preview */}
          {m.attachment?.type === 'preview' && m.attachment.deliverable && (
            <button
              onClick={() => onOpenDeliverable?.(m.attachment!.deliverable!)}
              className="mt-2 w-full text-left bg-surface border border-edge rounded-xl p-4 shadow-sm hover:border-primary transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{m.attachment.title}</p>
                  <p className="text-xs text-ink-faint mt-1">{m.attachment.content}</p>
                </div>
                <ExternalLink size={16} className="text-ink-faint group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </button>
          )}

          {/* Attachment: task update */}
          {m.attachment?.type === 'task' && (
            <div className="mt-2 bg-surface border border-edge rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center">
                  <KanbanSquare size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{m.attachment.title}</p>
                  <p className="text-xs text-ink-faint">{m.attachment.content}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Compute execution groups client-side for visual grouping ───

function computeExecutionGroups(steps: PlanStep[]): PlanStep[][] {
  const stepMap = new Map(steps.map(s => [s.instanceId, s]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const step of steps) {
    inDegree.set(step.instanceId, 0)
    dependents.set(step.instanceId, [])
  }

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

  const groups: PlanStep[][] = []
  let queue = steps
    .filter(s => (inDegree.get(s.instanceId) ?? 0) === 0)
    .map(s => s.instanceId)

  while (queue.length > 0) {
    const group = queue.map(id => stepMap.get(id)!).filter(Boolean)
    groups.push(group)
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

// ─── Plan Proposal Card with Phases + Cascade Deselection ───

interface PlanProposalCardProps {
  plan: ProposedPlan
  agent?: Agent
  botType?: string
  sender: string
  onApprove?: (id: string, selectedAgents?: string[]) => void
  onReject?: (id: string) => void
}

const PlanProposalCard = ({ plan, agent, botType, sender, onApprove, onReject }: PlanProposalCardProps) => {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(plan.steps.map(s => [s.instanceId, true]))
  )

  // Compute execution groups for visual phasing
  const groups = useMemo(() => computeExecutionGroups(plan.steps), [plan.steps])

  // Build a map of instanceId → all instanceIds that transitively depend on it
  const getDependentsOf = (instanceId: string): string[] => {
    const result: string[] = []
    const queue = [instanceId]
    const visited = new Set<string>()
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const step of plan.steps) {
        if (step.dependsOn?.includes(current) && !visited.has(step.instanceId)) {
          visited.add(step.instanceId)
          result.push(step.instanceId)
          queue.push(step.instanceId)
        }
      }
    }
    return result
  }

  const toggleInstance = (instanceId: string) => {
    setSelected(prev => {
      const newSelected = { ...prev }
      const willDeselect = prev[instanceId]

      if (willDeselect) {
        // Cascade: deselect this + all transitive dependents
        newSelected[instanceId] = false
        for (const depId of getDependentsOf(instanceId)) {
          newSelected[depId] = false
        }
      } else {
        // Select this. Also ensure its dependencies are selected
        newSelected[instanceId] = true
        const step = plan.steps.find(s => s.instanceId === instanceId)
        if (step?.dependsOn) {
          for (const depId of step.dependsOn) {
            newSelected[depId] = true
          }
        }
      }

      return newSelected
    })
  }

  const selectedInstances = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
  const hasSelected = selectedInstances.length > 0

  return (
    <div className="flex gap-4 max-w-2xl">
      <BotAvatar3D
        color={agent?.color || '#2563eb'}
        seed={agent?.name || botType || 'base'}
        isActive={true}
        size="sm"
      />
      <div className="bg-surface rounded-2xl rounded-tl-none border border-edge shadow-sm overflow-hidden flex-1">
        <div className="p-4">
          <p className="text-xs font-bold text-primary mb-2">{sender}</p>
          <p className="text-sm leading-relaxed text-ink mb-4">{plan.text}</p>

          {/* Execution phases */}
          <div className="space-y-4">
            {groups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Phase header */}
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={12} className="text-ink-faint" />
                  <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">
                    Fase {groupIdx + 1} {group.length > 1 ? '(paralelo)' : ''}
                    {groupIdx > 0 && ' — depende de fase anterior'}
                  </p>
                </div>

                {/* Steps in this phase */}
                <div className="space-y-2">
                  {group.map((step) => {
                    const agentColor = agentColors[step.agentId] ?? '#6b7280'
                    const isSelected = selected[step.instanceId]

                    return (
                      <label
                        key={step.instanceId}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-soft'
                            : 'border-edge bg-subtle opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInstance(step.instanceId)}
                          className="w-4 h-4 rounded border-edge text-primary focus:ring-primary accent-[var(--color-primary)]"
                        />
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: agentColor }}
                        >
                          {step.agentName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-ink">{step.agentName}</p>
                            <span className="text-[9px] text-ink-faint bg-subtle px-1.5 py-0.5 rounded font-mono">
                              {step.instanceId}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-faint mt-0.5">{step.userDescription || step.task}</p>
                        </div>
                        {step.dependsOn && step.dependsOn.length > 0 && (
                          <span className="text-[9px] text-ink-faint bg-subtle px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            necesita {step.dependsOn.join(', ')}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-edge px-4 py-3 bg-subtle flex gap-3">
          <button
            onClick={() => onApprove?.(plan.messageId, selectedInstances)}
            disabled={!hasSelected}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            Iniciar ({selectedInstances.length})
          </button>
          <button
            onClick={() => onReject?.(plan.messageId)}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-edge text-ink-light text-xs font-semibold rounded-lg hover:bg-subtle transition-colors"
          >
            <X size={14} />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step Approval Card ───

export interface StepApprovalCardProps {
  step: StepApproval
  onApproveStep: (conversationId: string, approved: boolean) => void
}

export const StepApprovalCard = ({ step, onApproveStep }: StepApprovalCardProps) => {
  const isVisualAgent = ['web', 'dev', 'video'].includes(step.agentId)

  return (
    <div className="flex gap-4 max-w-2xl">
      <div
        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: agentColors[step.agentId] ?? '#6b7280' }}
      >
        {step.agentName.charAt(0)}
      </div>
      <div className="bg-surface rounded-2xl rounded-tl-none border border-edge shadow-sm overflow-hidden flex-1">
        <div className="p-4">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-subtle h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${((step.stepIndex + 1) / step.totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-ink-faint">
              {step.stepIndex + 1}/{step.totalSteps}
            </span>
          </div>

          <p className="text-xs font-bold text-emerald-600 mb-1">
            {step.agentName} termino su trabajo
          </p>
          <p className="text-[11px] text-ink-faint mb-3 line-clamp-2">{step.summary}</p>

          {/* Refine hint for visual agents */}
          {isVisualAgent && (
            <div className="flex items-center gap-2 p-2.5 mb-3 bg-purple-50 border border-purple-200 rounded-xl">
              <Pencil size={14} className="text-purple-500 flex-shrink-0" />
              <p className="text-[11px] text-purple-700">
                Escribe en el chat para pedir cambios al diseno (ej: "me gusta la opcion A pero mas oscuro"). Cuando estes conforme, haz clic en {step.nextAgentName ? `pasar a ${step.nextAgentName}` : 'finalizar'}.
              </p>
            </div>
          )}

          {step.nextAgentName && (
            <div className="flex items-center gap-2 p-2.5 bg-subtle rounded-xl">
              <ChevronRight size={14} className="text-primary flex-shrink-0" />
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                style={{ backgroundColor: agentColors[step.nextAgentId ?? ''] ?? '#6b7280' }}
              >
                {step.nextAgentName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink">Siguiente: {step.nextAgentName}</p>
                <p className="text-[10px] text-ink-faint truncate">{step.nextTask}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-edge px-4 py-3 bg-subtle flex gap-3">
          <button
            onClick={() => onApproveStep(step.conversationId, true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Play size={14} />
            {isVisualAgent ? (step.nextAgentName ? `Pasar a ${step.nextAgentName}` : 'Finalizar') : 'Continuar'}
          </button>
          <button
            onClick={() => onApproveStep(step.conversationId, false)}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-edge text-ink-light text-xs font-semibold rounded-lg hover:bg-subtle transition-colors"
          >
            <Square size={14} />
            Detener
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
