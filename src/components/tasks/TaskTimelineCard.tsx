import { ExternalLink } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import type { Agent, KanbanTask, Deliverable } from '../../types'

interface TaskTimelineCardProps {
  task: KanbanTask
  agents: Agent[]
  isToday: boolean
  onTaskClick: (d: Deliverable) => void
}

const statusConfig = {
  todo: { label: 'Pendiente', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  doing: { label: 'En Proceso', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  done: { label: 'Completado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

const agentColorMap: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
}

function formatTime(dateStr: string, isToday: boolean): string {
  const date = new Date(dateStr)
  if (isToday) {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'ahora'
    if (diffMin < 60) return `hace ${diffMin}m`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `hace ${diffH}h`
  }
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const TaskTimelineCard = ({ task, agents, isToday, onTaskClick }: TaskTimelineCardProps) => {
  const agent = agents.find(a => a.id === task.botType)
  const status = statusConfig[task.status]
  const hasDeliverable = !!task.deliverable

  return (
    <button
      onClick={() => task.deliverable && onTaskClick(task.deliverable)}
      disabled={!hasDeliverable}
      className={`w-full text-left p-4 bg-surface border border-edge rounded-xl shadow-sm transition-all group ${
        hasDeliverable ? 'hover:border-primary hover:shadow-md cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Agent avatar */}
        <BotAvatar3D
          seed={agent?.name || task.agent}
          color={agent?.color || agentColorMap[task.botType] || '#6b7280'}
          isActive={task.status === 'doing'}
          size="sm"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-ink truncate group-hover:text-primary transition-colors">
              {task.title}
            </p>
            {hasDeliverable && (
              <ExternalLink size={12} className="text-ink-faint group-hover:text-primary transition-colors flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>

            {/* Agent name */}
            <span className="text-[10px] text-ink-faint">{task.agent}</span>

            {/* Time */}
            {task.createdAt && (
              <span className="text-[10px] text-ink-faint ml-auto flex-shrink-0">
                {formatTime(task.createdAt, isToday)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default TaskTimelineCard
