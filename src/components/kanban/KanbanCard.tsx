import { Clock, FileText } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import type { Agent, KanbanTask, Deliverable } from '../../types'

interface KanbanCardProps {
  task: KanbanTask
  agents: Agent[]
  onTaskClick: (d: Deliverable) => void
}

const KanbanCard = ({ task, agents, onTaskClick }: KanbanCardProps) => {
  const agent = agents.find(a => a.id === task.botType)
  const hasDeliverable = !!task.deliverable

  return (
    <div
      onClick={() => task.deliverable && onTaskClick(task.deliverable)}
      className={`bg-surface border border-edge p-5 rounded-2xl hover:shadow-md transition-all group ${
        hasDeliverable ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <h4 className="text-sm font-bold text-ink leading-tight group-hover:text-primary transition-colors mb-4">
        {task.title}
      </h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotAvatar3D
            color={agent?.color || '#2563eb'}
            seed={task.agent}
            isActive={task.status === 'doing'}
            size="sm"
          />
          <div>
            <p className="text-[10px] font-medium text-ink-faint">Responsable</p>
            <p className="text-xs font-bold text-ink-light">{task.agent}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
          task.status === 'doing'
            ? 'bg-emerald-500/10 text-emerald-500'
            : task.status === 'done'
              ? 'bg-blue-500/10 text-blue-500'
              : 'bg-subtle text-ink-faint'
        }`}>
          <Clock size={10} />
          <span>24h</span>
        </div>
      </div>

      {hasDeliverable && (
        <div className="mt-4 pt-3 border-t border-edge">
          <p className="text-xs text-primary font-medium flex items-center gap-1.5 group-hover:underline">
            <FileText size={12} /> Ver entregable
          </p>
        </div>
      )}
    </div>
  )
}

export default KanbanCard
