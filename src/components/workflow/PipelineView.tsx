import { memo, useMemo } from 'react'
import { Background, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bot, Check, ChevronRight, Loader2, MessageSquareText, Target } from 'lucide-react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

// ─── Types ───

interface PipelineStep {
  agentId: string
  agentName?: string
  instanceId?: string
  task: string
  userDescription?: string
  dependsOn?: string[]
  phaseIndex?: number
  phaseTotal?: number
  phaseTitle?: string
  status?: 'pending' | 'running' | 'complete' | 'error'
  output?: string
}

interface PipelineViewProps {
  steps: PipelineStep[]
  activeAgents?: Array<{ agentId: string; status: string }>
  compact?: boolean
}

// ─── Custom Nodes ───

interface UserNodeData extends Record<string, unknown> {
  prompt: string
}

const UserInputNode = memo(({ data }: NodeProps) => {
  const d = data as UserNodeData
  return (
    <div className="w-56 rounded-2xl border border-amber-500/20 bg-[#1a1815] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/[0.06] border-b border-white/[0.06]">
        <MessageSquareText size={13} className="text-amber-400" />
        <span className="text-[11px] font-semibold text-white/70">Tu mensaje</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-white/55 line-clamp-3 leading-relaxed">{d.prompt}</p>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-[#0a0a1a]" />
    </div>
  )
})

UserInputNode.displayName = 'UserInputNode'

interface AgentNodeData extends Record<string, unknown> {
  agentId: string
  agentName: string
  task: string
  userDescription?: string
  status: 'pending' | 'running' | 'complete' | 'error'
}

const AGENT_COLORS: Record<string, { border: string; bg: string; accent: string }> = {
  web: { border: 'border-[#a78bfa]/30', bg: 'bg-[#16141f]', accent: 'text-[#a78bfa]' },
  dev: { border: 'border-emerald-500/30', bg: 'bg-[#111a15]', accent: 'text-emerald-400' },
  seo: { border: 'border-blue-500/30', bg: 'bg-[#111520]', accent: 'text-blue-400' },
  content: { border: 'border-amber-500/30', bg: 'bg-[#1a1815]', accent: 'text-amber-400' },
  ads: { border: 'border-rose-500/30', bg: 'bg-[#1a1115]', accent: 'text-rose-400' },
  video: { border: 'border-pink-500/30', bg: 'bg-[#1a1118]', accent: 'text-pink-400' },
}

const DEFAULT_COLOR = { border: 'border-white/10', bg: 'bg-[#151520]', accent: 'text-white/60' }

const AgentStepNode = memo(({ data }: NodeProps) => {
  const d = data as AgentNodeData
  const color = AGENT_COLORS[d.agentId] || DEFAULT_COLOR

  const statusIcon = {
    pending: <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10" />,
    running: <Loader2 size={16} className={`animate-spin ${color.accent}`} />,
    complete: <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center"><Check size={11} className="text-emerald-400" /></div>,
    error: <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center text-[10px] text-red-400">!</div>,
  }

  return (
    <div className={`w-60 rounded-2xl border ${d.status === 'running' ? color.border + ' shadow-lg' : d.status === 'complete' ? 'border-emerald-500/20' : 'border-white/[0.08]'} ${color.bg} overflow-hidden transition-all duration-300`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-[#8b5cf6] !border-2 !border-[#0a0a1a]" />

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {statusIcon[d.status]}
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${d.status === 'running' ? color.accent : 'text-white/80'}`}>
            {d.agentName}
          </p>
          <p className="text-[10px] text-white/35 capitalize">{d.agentId}</p>
        </div>
      </div>

      <div className="px-3 pb-3 border-t border-white/[0.04] pt-2">
        <p className="text-[11px] text-white/50 leading-relaxed line-clamp-3">
          {d.userDescription || d.task}
        </p>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[#8b5cf6] !border-2 !border-[#0a0a1a]" />
    </div>
  )
})

AgentStepNode.displayName = 'AgentStepNode'

interface ResultNodeData extends Record<string, unknown> {
  allComplete: boolean
  totalSteps: number
}

const ResultNode = memo(({ data }: NodeProps) => {
  const d = data as ResultNodeData
  return (
    <div className={`w-48 rounded-2xl border ${d.allComplete ? 'border-emerald-500/30 bg-[#0f1a15]' : 'border-white/[0.08] bg-[#151520]'} overflow-hidden transition-all duration-300`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-[#0a0a1a]" />
      <div className="flex items-center gap-2 px-3 py-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${d.allComplete ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
          {d.allComplete ? (
            <Check size={14} className="text-emerald-400" />
          ) : (
            <Target size={14} className="text-white/30" />
          )}
        </div>
        <div>
          <p className={`text-xs font-semibold ${d.allComplete ? 'text-emerald-400' : 'text-white/60'}`}>
            {d.allComplete ? 'Completado' : 'Resultado'}
          </p>
          <p className="text-[10px] text-white/30">{d.totalSteps} paso{d.totalSteps !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  )
})

ResultNode.displayName = 'ResultNode'

// ─── Node type registry ───
const nodeTypes = {
  userInput: UserInputNode,
  agentStep: AgentStepNode,
  result: ResultNode,
}

// ─── Compact inline view (for chat) ───
function CompactPipeline({ steps, activeAgents }: { steps: PipelineStep[]; activeAgents?: PipelineViewProps['activeAgents'] }) {
  const getStatus = (step: PipelineStep) => {
    if (step.status) return step.status
    const active = activeAgents?.find((a) => a.agentId === step.agentId)
    if (active?.status === 'streaming') return 'running'
    if (active?.status === 'complete') return 'complete'
    return 'pending'
  }

  // Count how many steps share the same agentId to detect phases when explicit metadata is missing
  const agentCounts = steps.reduce((acc, s) => { acc[s.agentId] = (acc[s.agentId] || 0) + 1; return acc }, {} as Record<string, number>)

  // For multi-phase steps (same agent), track phase number
  const agentPhaseCounter: Record<string, number> = {}

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
      {steps.map((step, i) => {
        const status = getStatus(step)
        const color = AGENT_COLORS[step.agentId] || DEFAULT_COLOR
        const isMultiPhase = agentCounts[step.agentId] > 1

        // Track phase number for this agent
        if (isMultiPhase) {
          agentPhaseCounter[step.agentId] = (agentPhaseCounter[step.agentId] || 0) + 1
        }
        const phaseNum = agentPhaseCounter[step.agentId] || 1
        const totalPhases = agentCounts[step.agentId] || 1

        // Show phase label instead of repeating agent name
        const explicitPhaseLabel = step.phaseIndex && step.phaseTotal
          ? (step.phaseTitle || `Fase ${step.phaseIndex}/${step.phaseTotal}`)
          : null
        const label = explicitPhaseLabel
          || (isMultiPhase ? (step.task || `Fase ${phaseNum}/${totalPhases}`) : (step.agentName || step.agentId))

        return (
          <div key={step.instanceId || i} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-300 max-w-[180px] ${
                status === 'running'
                  ? `${color.border} ${color.bg}`
                  : status === 'complete'
                    ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              {status === 'running' ? (
                <Loader2 size={11} className={`animate-spin ${color.accent} flex-shrink-0`} />
              ) : status === 'complete' ? (
                <Check size={11} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Bot size={11} className="text-white/30 flex-shrink-0" />
              )}
              <span
                className={`text-[10px] font-medium truncate ${
                  status === 'running' ? color.accent : status === 'complete' ? 'text-emerald-400' : 'text-white/40'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <ChevronRight size={12} className="text-white/15 flex-shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───
export default function PipelineView({ steps, activeAgents, compact = false }: PipelineViewProps) {
  if (compact || steps.length <= 3) {
    return <CompactPipeline steps={steps} activeAgents={activeAgents} />
  }

  // Full canvas view for complex plans
  const { graphNodes, graphEdges } = useMemo(() => {
    const gNodes: Node[] = []
    const gEdges: Edge[] = []

    // Group steps by dependency level
    const levels: PipelineStep[][] = []
    const placed = new Set<string>()

    // First pass: steps with no dependencies
    const noDeps = steps.filter((s) => !s.dependsOn?.length)
    if (noDeps.length) levels.push(noDeps)
    noDeps.forEach((s) => placed.add(s.instanceId || s.agentId))

    // Subsequent passes
    let safety = 10
    while (placed.size < steps.length && safety-- > 0) {
      const nextLevel = steps.filter(
        (s) => !placed.has(s.instanceId || s.agentId) && s.dependsOn?.every((dep) => placed.has(dep)),
      )
      if (nextLevel.length === 0) break
      levels.push(nextLevel)
      nextLevel.forEach((s) => placed.add(s.instanceId || s.agentId))
    }

    // User input node
    const totalHeight = Math.max(...levels.map((l) => l.length)) * 140
    gNodes.push({
      id: 'user-input',
      type: 'userInput',
      position: { x: 0, y: totalHeight / 2 - 40 },
      data: { prompt: steps[0]?.task || '' },
    })

    // Agent step nodes
    levels.forEach((level, li) => {
      level.forEach((step, si) => {
        const getStatus = () => {
          if (step.status) return step.status
          const active = activeAgents?.find((a) => a.agentId === step.agentId)
          if (active?.status === 'streaming') return 'running'
          if (active?.status === 'complete') return 'complete'
          return 'pending'
        }

        const nodeId = step.instanceId || `${step.agentId}-${li}-${si}`
        gNodes.push({
          id: nodeId,
          type: 'agentStep',
          position: { x: 300 + li * 320, y: si * 140 },
          data: {
            agentId: step.agentId,
            agentName: step.agentName || step.agentId,
            task: step.task,
            userDescription: step.userDescription,
            status: getStatus(),
          } satisfies AgentNodeData,
        })

        // Connect from dependencies or user input
        if (!step.dependsOn?.length) {
          gEdges.push({
            id: `e-input-${nodeId}`,
            source: 'user-input',
            target: nodeId,
            animated: true,
            style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
          })
        } else {
          step.dependsOn.forEach((dep) => {
            gEdges.push({
              id: `e-${dep}-${nodeId}`,
              source: dep,
              target: nodeId,
              animated: true,
              style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
            })
          })
        }

        // Connect to result if last level
        if (li === levels.length - 1) {
          gEdges.push({
            id: `e-${nodeId}-result`,
            source: nodeId,
            target: 'result-node',
            style: { stroke: '#22c55e', strokeWidth: 1.5 },
          })
        }
      })
    })

    // Result node
    const allComplete = steps.every((s) => {
      if (s.status === 'complete') return true
      const active = activeAgents?.find((a) => a.agentId === s.agentId)
      return active?.status === 'complete'
    })

    const lastLevelX = 300 + levels.length * 320
    gNodes.push({
      id: 'result-node',
      type: 'result',
      position: { x: lastLevelX, y: totalHeight / 2 - 30 },
      data: { allComplete, totalSteps: steps.length } satisfies ResultNodeData,
    })

    return { graphNodes: gNodes, graphEdges: gEdges }
  }, [steps, activeAgents])

  return (
    <div className="h-48 rounded-2xl border border-white/[0.08] bg-[#0a0a14] overflow-hidden">
      <ReactFlow
        nodes={graphNodes}
        edges={graphEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        panOnDrag={false}
        zoomOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.02)" gap={20} />
      </ReactFlow>
    </div>
  )
}

export { CompactPipeline }
export type { PipelineStep }
