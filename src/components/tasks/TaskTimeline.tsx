import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, ExternalLink } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import type { Agent, KanbanTask, Deliverable } from '../../types'

interface TaskTimelineProps {
  tasks: KanbanTask[]
  agents: Agent[]
  onTaskClick: (d: Deliverable) => void
}

const columns: { id: KanbanTask['status']; label: string; dotColor: string; headerBg: string }[] = [
  { id: 'todo', label: 'Backlog', dotColor: 'bg-slate-400', headerBg: 'bg-slate-500/10' },
  { id: 'doing', label: 'En Proceso', dotColor: 'bg-amber-400', headerBg: 'bg-amber-500/10' },
  { id: 'done', label: 'Completado', dotColor: 'bg-emerald-500', headerBg: 'bg-emerald-500/10' },
]

const agentColorMap: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
}

const agentNameMap: Record<string, string> = {
  seo: 'Lupa',
  web: 'Pixel',
  ads: 'Metric',
  dev: 'Logic',
  video: 'Reel',
}

function formatDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff === -1) return 'Manana'

  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH}h`

  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

// Get all unique dates from tasks
function getUniqueDates(tasks: KanbanTask[]): Date[] {
  const seen = new Set<string>()
  const dates: Date[] = []

  for (const t of tasks) {
    const d = t.createdAt ? new Date(t.createdAt) : new Date()
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!seen.has(key)) {
      seen.add(key)
      dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    }
  }

  return dates.sort((a, b) => b.getTime() - a.getTime())
}

const TaskTimeline = ({ tasks, agents, onTaskClick }: TaskTimelineProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const availableDates = useMemo(() => getUniqueDates(tasks), [tasks])

  // Filter tasks for selected date (or show all if "all")
  const [showAll, setShowAll] = useState(false)

  const filteredTasks = useMemo(() => {
    if (showAll) return tasks
    return tasks.filter(t => {
      const d = t.createdAt ? new Date(t.createdAt) : new Date()
      return isSameDay(d, selectedDate)
    })
  }, [tasks, selectedDate, showAll])

  const tasksByStatus = useMemo(() => {
    const result: Record<string, KanbanTask[]> = { todo: [], doing: [], done: [] }
    for (const t of filteredTasks) {
      result[t.status]?.push(t)
    }
    // Sort each column by date descending
    for (const key of Object.keys(result)) {
      result[key].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return db - da
      })
    }
    return result
  }, [filteredTasks])

  const navigateDate = (direction: -1 | 1) => {
    setShowAll(false)
    const idx = availableDates.findIndex(d => isSameDay(d, selectedDate))
    // direction: -1 = newer (earlier in array), +1 = older (later in array)
    const newIdx = idx + direction
    if (newIdx >= 0 && newIdx < availableDates.length) {
      setSelectedDate(availableDates[newIdx])
    }
  }

  const isFirst = availableDates.findIndex(d => isSameDay(d, selectedDate)) <= 0
  const isLast = availableDates.findIndex(d => isSameDay(d, selectedDate)) >= availableDates.length - 1

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-page">
      {/* Date filter bar */}
      <div className="px-6 pt-5 pb-4 border-b border-edge bg-surface">
        <div className="flex items-center gap-4">
          {/* Date navigation */}
          <div className="flex items-center gap-1 bg-subtle rounded-xl p-1">
            <button
              onClick={() => navigateDate(-1)}
              disabled={isFirst && !showAll}
              className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-ink-light" />
            </button>

            <button
              onClick={() => { setShowAll(false); setSelectedDate(new Date()) }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                !showAll && isSameDay(selectedDate, new Date())
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-ink-light hover:bg-surface'
              }`}
            >
              <Calendar size={14} />
              Hoy
            </button>

            <button
              onClick={() => navigateDate(1)}
              disabled={isLast && !showAll}
              className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} className="text-ink-light" />
            </button>
          </div>

          {/* Current date label */}
          {!showAll && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">{formatDateLabel(selectedDate)}</span>
              <span className="text-xs text-ink-faint">
                {filteredTasks.length} tarea{filteredTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {showAll && (
            <span className="text-sm font-bold text-ink">Todas las fechas</span>
          )}

          {/* Date chips */}
          <div className="flex-1 flex gap-1.5 overflow-x-auto ml-2 pb-0.5">
            <button
              onClick={() => setShowAll(true)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                showAll
                  ? 'bg-primary text-primary-fg'
                  : 'bg-subtle text-ink-faint hover:text-ink hover:bg-surface-alt'
              }`}
            >
              Todas
            </button>
            {availableDates.slice(0, 7).map(date => {
              const isSelected = !showAll && isSameDay(date, selectedDate)
              const count = tasks.filter(t => {
                const d = t.createdAt ? new Date(t.createdAt) : new Date()
                return isSameDay(d, date)
              }).length

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => { setShowAll(false); setSelectedDate(date) }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-primary text-primary-fg'
                      : 'bg-subtle text-ink-faint hover:text-ink hover:bg-surface-alt'
                  }`}
                >
                  {formatDateLabel(date)}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20' : 'bg-edge'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-5 h-full min-w-[900px]">
          {columns.map(col => {
            const colTasks = tasksByStatus[col.id] || []

            return (
              <div key={col.id} className="flex-1 flex flex-col min-w-[280px] max-w-[400px]">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-3 ${col.headerBg}`}>
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <h3 className="text-xs font-bold text-ink">{col.label}</h3>
                  <span className="text-[10px] font-bold text-ink-faint bg-surface px-2 py-0.5 rounded-full ml-auto">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-edge rounded-xl">
                      <p className="text-[11px] text-ink-faint">Sin tareas</p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const agent = agents.find(a => a.id === task.botType)
                      const hasDeliverable = !!task.deliverable

                      return (
                        <button
                          key={task.id}
                          onClick={() => task.deliverable && onTaskClick(task.deliverable)}
                          disabled={!hasDeliverable}
                          className={`w-full text-left p-4 bg-surface border border-edge rounded-xl shadow-sm transition-all group ${
                            hasDeliverable ? 'hover:border-primary hover:shadow-md cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          {/* Title */}
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-sm font-bold text-ink truncate flex-1 group-hover:text-primary transition-colors">
                              {task.title}
                            </p>
                            {hasDeliverable && (
                              <ExternalLink size={12} className="text-ink-faint group-hover:text-primary transition-colors flex-shrink-0" />
                            )}
                          </div>

                          {/* Agents involved */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex -space-x-1.5">
                              <BotAvatar3D
                                seed={agent?.name || task.agent}
                                color={agent?.color || agentColorMap[task.botType] || '#6b7280'}
                                isActive={task.status === 'doing'}
                                size="sm"
                              />
                            </div>
                            <span className="text-[11px] font-semibold" style={{ color: agentColorMap[task.botType] || '#6b7280' }}>
                              {agentNameMap[task.botType] || task.agent}
                            </span>
                            {task.instanceId && (
                              <span className="text-[9px] font-mono text-ink-faint bg-subtle px-1.5 py-0.5 rounded">
                                {task.instanceId}
                              </span>
                            )}
                          </div>

                          {/* Footer: time + deliverable type */}
                          <div className="flex items-center gap-2">
                            {task.createdAt && (
                              <span className="text-[10px] text-ink-faint">
                                {formatTime(task.createdAt)}
                              </span>
                            )}
                            {task.deliverable && (
                              <span className="text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full ml-auto">
                                {task.deliverable.type === 'report' ? 'Reporte' :
                                 task.deliverable.type === 'design' ? 'Diseno' :
                                 task.deliverable.type === 'code' ? 'Codigo' :
                                 task.deliverable.type === 'copy' ? 'Copy' :
                                 task.deliverable.type === 'video' ? 'Video' : task.deliverable.type}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
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

export default TaskTimeline
