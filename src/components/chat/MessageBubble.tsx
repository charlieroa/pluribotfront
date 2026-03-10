import { useState, useMemo } from 'react'
import { Check, X, FileText, ExternalLink, KanbanSquare, Play, ChevronRight, Pencil, Layers, UserCircle, FolderPlus, Star, Crown } from 'lucide-react'
import type { Agent, Message, Deliverable, PlanStep } from '../../types'
import type { ProposedPlan, StepApproval } from '../../hooks/useChat'

interface MessageBubbleProps {
  message: Message
  agents: Agent[]
  onApprove?: (id: string, selectedAgents?: string[]) => void
  onReject?: (id: string) => void
  onOpenDeliverable?: (d: Deliverable, clickedImageUrl?: string) => void
  proposedPlan?: ProposedPlan | null
  pendingStepApproval?: StepApproval | null
  onApproveStep?: (conversationId: string, approved: boolean) => void
  onRequestHuman?: () => void
  humanRequested?: boolean
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  brand: '#ec4899',
  web: '#a855f7',
  content: '#f97316',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
  base: '#a78bfa',
  human: '#8b5cf6',
  system: '#6b7280',
}

const agentInitials: Record<string, string> = {
  seo: 'L',
  brand: 'B',
  web: 'P',
  content: 'C',
  ads: 'M',
  dev: 'D',
  video: 'R',
  base: 'P',
  human: 'H',
  system: 'S',
}

// ─── Image with skeleton loader ───
function ImageWithSkeleton({ url, index, onClick }: { url: string; index: number; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className="relative group cursor-pointer rounded-xl overflow-hidden border border-edge hover:border-primary/50 transition-all hover:shadow-lg"
      onClick={onClick}
    >
      {!loaded && (
        <div className="w-full aspect-square bg-subtle animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-edge/50 animate-pulse" />
        </div>
      )}
      <img
        src={url}
        alt={`Opcion ${index + 1}`}
        className={`w-full aspect-square object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
          <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">Opcion {index + 1}</span>
          <a href={url} download className="text-white bg-black/60 p-1 rounded-full hover:bg-black/80 transition-colors" onClick={e => e.stopPropagation()}>
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  )
}

const MessageBubble = ({ message: m, agents, onApprove, onReject, onOpenDeliverable, proposedPlan, onRequestHuman, humanRequested }: MessageBubbleProps) => {
  const agent = agents.find(a => a.id === m.botType)
  const agentColor = agent?.color || agentColors[m.botType || ''] || '#6366f1'

  // Plan proposal card with checkboxes
  if (m.type === 'approval' && proposedPlan && proposedPlan.messageId === m.id && m.approved === undefined) {
    return (
      <PlanProposalCard
        plan={proposedPlan}
        agentColor={agentColor}
        sender={m.sender}
        onApprove={onApprove}
        onReject={onReject}
      />
    )
  }

  // Approval card (legacy or post-decision)
  if (m.type === 'approval') {
    const isPending = m.approved === undefined
    const approvalInitial = agentInitials[m.botType || ''] || m.sender?.charAt(0)?.toUpperCase() || '?'
    return (
      <div className="flex items-start gap-3 max-w-2xl">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
          style={{ backgroundColor: agentColor }}
        >
          {approvalInitial}
        </div>
        <div className="flex-1">
          <div className="rounded-xl border border-edge overflow-hidden bg-surface-alt">
            <div className="p-4">
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
                    className="flex items-center gap-2 px-4 py-2 bg-surface-alt border border-edge text-ink-light text-xs font-semibold rounded-lg hover:bg-subtle transition-colors"
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
      </div>
    )
  }

  // ─── User message ───
  if (m.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-md">
          {m.imageUrl && (
            <div className="flex justify-end mb-1.5">
              <img src={m.imageUrl} alt="Adjunto" className="max-w-xs max-h-48 rounded-xl object-cover" />
            </div>
          )}
          <div className="bg-primary text-primary-fg px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            {m.text}
          </div>
        </div>
      </div>
    )
  }

  // ─── Human agent message ───
  if (m.sender === 'human_agent' || m.botType === 'human') {
    const humanColor = m.specialtyColor || '#8b5cf6'
    return (
      <div className="max-w-2xl space-y-1">
        <div className="flex items-center gap-2">
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt={m.sender} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: humanColor }}>
              <UserCircle size={12} />
            </div>
          )}
          <span className="text-xs font-bold" style={{ color: humanColor }}>{m.sender}</span>
          {m.specialty && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: humanColor }}>
              {m.specialty}
            </span>
          )}
        </div>
        <div className="pl-7">
          {m.imageUrl && (
            <img src={m.imageUrl} alt="Adjunto" className="max-w-xs max-h-48 rounded-xl mb-2 object-cover" />
          )}
          <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">{m.text}</p>
        </div>
      </div>
    )
  }

  // ─── AI Agent message ───
  const initial = agentInitials[m.botType || ''] || m.sender?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="flex items-start gap-3 max-w-2xl">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ backgroundColor: agentColor }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <span className="text-sm font-semibold text-ink">{m.sender}</span>
        {m.imageUrl && (
          <img src={m.imageUrl} alt="Adjunto" className="max-w-xs max-h-48 rounded-xl object-cover" />
        )}
        <p className="text-sm leading-relaxed text-ink-light whitespace-pre-wrap">{m.text}</p>

        {/* Attachment: code block */}
        {m.attachment?.type === 'code' && (
          <div className="bg-surface-alt border border-edge rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-subtle border-b border-edge flex items-center gap-2">
              <FileText size={13} className="text-ink-faint" />
              <span className="text-xs font-semibold text-ink-light">{m.attachment.title}</span>
            </div>
            <pre className="px-4 py-3 text-xs text-ink-light font-mono leading-relaxed whitespace-pre-wrap">
              {m.attachment.content}
            </pre>
          </div>
        )}

        {/* Attachment: image grid */}
        {m.attachment?.type === 'image_grid' && m.attachment.images && (
          <div>
            <div className={`grid gap-2 ${m.attachment.images.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 max-w-md'}`}>
              {m.attachment.images.map((url, i) => (
                <ImageWithSkeleton
                  key={i}
                  url={url}
                  index={i}
                  onClick={() => m.attachment?.deliverable && onOpenDeliverable?.(m.attachment.deliverable, url)}
                />
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-2">
              {m.attachment.images.length > 1
                ? `Haz clic en la que mas te guste para verla en grande. Puedes pedir ajustes desde el chat.`
                : `Haz clic para verla en grande. Puedes pedir cambios desde el chat.`}
            </p>
          </div>
        )}

        {/* Attachment: deliverable preview */}
        {m.attachment?.type === 'preview' && m.attachment.deliverable && (
          <button
            onClick={() => onOpenDeliverable?.(m.attachment!.deliverable!)}
            className="w-full text-left bg-surface-alt border border-edge rounded-xl p-4 hover:border-primary/40 transition-colors group"
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

        {/* Action buttons after deliverable */}
        {m.attachment?.type === 'preview' && m.attachment.deliverable && (
          <DeliverableActions onRequestHuman={onRequestHuman} humanRequested={humanRequested} />
        )}

        {/* Attachment: task update */}
        {m.attachment?.type === 'task' && (
          <div className="bg-surface-alt border border-edge rounded-xl p-4">
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
  agentColor: string
  sender: string
  onApprove?: (id: string, selectedAgents?: string[]) => void
  onReject?: (id: string) => void
}

const PlanProposalCard = ({ plan, agentColor, sender: _sender, onApprove, onReject }: PlanProposalCardProps) => {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(plan.steps.map(s => [s.instanceId, true]))
  )

  const groups = useMemo(() => computeExecutionGroups(plan.steps), [plan.steps])

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
        newSelected[instanceId] = false
        for (const depId of getDependentsOf(instanceId)) {
          newSelected[depId] = false
        }
      } else {
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
    <div className="flex items-start gap-3 max-w-2xl">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ backgroundColor: agentColor }}
      >
        P
      </div>
      <div className="flex-1">
        <div className="rounded-xl border border-edge overflow-hidden bg-surface-alt">
          <div className="p-4">
            <p className="text-sm leading-relaxed text-ink mb-4">{plan.text}</p>

            {/* Execution phases */}
            <div className="space-y-4">
              {groups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={12} className="text-ink-faint" />
                    <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">
                      Fase {groupIdx + 1} {group.length > 1 ? '(paralelo)' : ''}
                      {groupIdx > 0 && ' — depende de fase anterior'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {group.map((step) => {
                      const stepColor = agentColors[step.agentId] ?? '#6b7280'
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
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stepColor }}
                          />
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
              className="flex items-center gap-2 px-4 py-2 bg-surface-alt border border-edge text-ink-light text-xs font-semibold rounded-lg hover:bg-subtle transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step Approval Card ───

export interface StepApprovalCardProps {
  step: StepApproval
  onApproveStep: (conversationId: string, approved: boolean) => void
  onRequestHuman?: () => void
  humanRequested?: boolean
}

export const StepApprovalCard = ({ step, onApproveStep, onRequestHuman, humanRequested }: StepApprovalCardProps) => {
  const isVisualAgent = ['web', 'dev'].includes(step.agentId)
  const color = agentColors[step.agentId] ?? '#6b7280'

  const stepInitial = agentInitials[step.agentId] || step.agentName?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="flex items-start gap-3 max-w-2xl">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      >
        {stepInitial}
      </div>
      <div className="flex-1">
        <div className="rounded-xl border border-edge overflow-hidden bg-surface-alt">
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

            <p className="text-[11px] text-ink-faint mb-3 line-clamp-2">{step.summary}</p>

            {/* Refine hint for visual agents */}
            {isVisualAgent && (
              <div className="flex items-center gap-2 p-2.5 mb-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <Pencil size={14} className="text-purple-400 flex-shrink-0" />
                <p className="text-[11px] text-purple-300">
                  Escribe en el chat para pedir cambios. Cuando estes conforme, haz clic en {step.nextAgentName ? `pasar a ${step.nextAgentName}` : 'finalizar'}.
                </p>
              </div>
            )}

            {step.nextAgentName && (
              <div className="flex items-center gap-2 p-2.5 bg-subtle rounded-xl">
                <ChevronRight size={14} className="text-primary flex-shrink-0" />
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: agentColors[step.nextAgentId ?? ''] ?? '#6b7280' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink">Siguiente: {step.nextAgentName}</p>
                  <p className="text-[10px] text-ink-faint truncate">{step.nextTask}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-edge px-4 py-3 bg-subtle flex gap-3 flex-wrap">
            <button
              onClick={() => onApproveStep(step.conversationId, true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Play size={14} />
              {step.nextAgentName ? `Pasar a ${step.nextAgentName}` : 'Finalizar'}
            </button>
            {onRequestHuman && (
              <button
                onClick={onRequestHuman}
                disabled={humanRequested}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  humanRequested
                    ? 'bg-purple-500/10 text-purple-400 cursor-not-allowed'
                    : 'bg-surface border border-purple-500/20 text-purple-400 hover:bg-purple-500/10'
                }`}
              >
                <UserCircle size={14} />
                {humanRequested ? 'Ayuda solicitada' : 'Necesito ayuda humana'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Plans Modal (blur background, clean design) ───

const PlansModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null

  const plans = [
    {
      name: 'Starter',
      price: 'Gratis',
      color: '#6b7280',
      features: ['5 generaciones/mes', 'Agentes IA ilimitados', 'Preview en tiempo real', 'Soporte comunidad'],
      cta: 'Plan actual',
      current: true,
    },
    {
      name: 'Pro',
      price: '$29/mes',
      color: '#8b5cf6',
      features: ['100 generaciones/mes', 'Asistencia humana 24/7', 'Deploy a dominio propio', 'Proyectos ilimitados', 'Soporte prioritario'],
      cta: 'Comenzar Pro',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$99/mes',
      color: '#f59e0b',
      features: ['Generaciones ilimitadas', 'Equipo humano dedicado', 'API + integraciones', 'White-label', 'SLA garantizado'],
      cta: 'Contactar ventas',
    },
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-2xl border border-edge shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-[modalIn_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

        {/* Header */}
        <div className="p-6 pb-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center mx-auto mb-3">
            <Crown size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-ink">Asistencia Humana Profesional</h2>
          <p className="text-sm text-ink-faint mt-1.5 max-w-md mx-auto">
            Un experto humano revisa, ajusta y perfecciona tu proyecto. Disponible en planes Pro y Enterprise.
          </p>
        </div>

        {/* Plans grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 transition-all ${
                plan.popular
                  ? 'border-[#8b5cf6] bg-[#8b5cf6]/5 shadow-lg shadow-[#8b5cf6]/10 scale-[1.02]'
                  : 'border-edge bg-surface-alt'
              }`}
            >
              {plan.popular && (
                <div className="flex justify-center mb-2">
                  <span className="text-[10px] font-bold text-white bg-[#8b5cf6] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Mas popular
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
              <p className="text-2xl font-bold mt-1" style={{ color: plan.color }}>{plan.price}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-light">
                    <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full mt-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  plan.current
                    ? 'bg-subtle text-ink-faint cursor-default'
                    : plan.popular
                    ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-md'
                    : 'bg-surface border border-edge text-ink hover:bg-subtle'
                }`}
                disabled={plan.current}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-subtle hover:bg-edge flex items-center justify-center text-ink-faint hover:text-ink transition-all"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Deliverable Action Buttons ───

const DeliverableActions = ({ onRequestHuman, humanRequested }: { onRequestHuman?: () => void; humanRequested?: boolean }) => {
  const [showPlansModal, setShowPlansModal] = useState(false)

  return (
    <>
      <div className="flex flex-row gap-2 mt-1">
        {onRequestHuman && (
          <button
            onClick={() => setShowPlansModal(true)}
            disabled={humanRequested}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all whitespace-nowrap ${
              humanRequested
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 cursor-default'
                : 'border-[#8b5cf6]/20 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/40'
            }`}
          >
            <Star size={12} />
            {humanRequested ? 'Solicitada' : 'Asistencia'}
          </button>
        )}
        <button
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all whitespace-nowrap"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('plury:suggest-project'))
          }}
        >
          <FolderPlus size={12} />
          Guardar
        </button>
      </div>
      <PlansModal isOpen={showPlansModal} onClose={() => setShowPlansModal(false)} />
    </>
  )
}

export default MessageBubble
