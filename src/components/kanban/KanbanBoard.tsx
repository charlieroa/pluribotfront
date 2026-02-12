import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Agent, KanbanTask, Deliverable } from '../../types'
import KanbanCard from './KanbanCard'

interface KanbanBoardProps {
  tasks: KanbanTask[]
  agents: Agent[]
  onTaskClick: (d: Deliverable) => void
}

const KanbanBoard = ({ tasks, agents, onTaskClick }: KanbanBoardProps) => {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.agent.toLowerCase().includes(query.toLowerCase())
      )
    : tasks

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-page">
      {/* Search bar */}
      <div className="px-8 pt-6 pb-2">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar tareas o agente..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-edge rounded-xl outline-none focus:border-primary text-ink placeholder:text-ink-faint transition-colors"
          />
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 p-8 pt-4 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['todo', 'doing', 'done'] as const).map((status) => {
            const column = filtered.filter(t => t.status === status)
            return (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface border border-edge rounded-xl">
                  <p className="text-xs font-bold text-ink-light uppercase tracking-wide">
                    {status === 'todo' ? 'Backlog' : status === 'doing' ? 'En Proceso' : 'Completado'}
                  </p>
                  <span className="bg-primary-soft text-primary px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                    {column.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {column.length > 0 ? (
                    column.map(task => (
                      <KanbanCard key={task.id} task={task} agents={agents} onTaskClick={onTaskClick} />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-edge rounded-xl">
                      <p className="text-xs text-ink-faint">
                        {query ? 'Sin resultados' : 'Sin tareas'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default KanbanBoard
