import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FolderOpen, MessageSquare, Sparkles } from 'lucide-react'
import type { Deliverable, KanbanTask } from '../../types'
import type { Agent } from '../../types'
import type { ProjectItem } from '../../hooks/useChat'
import TaskTimeline from './TaskTimeline'

interface ProjectConversationSummary {
  id: string
  title: string
  kanbanTasks?: KanbanTask[]
}

interface ProjectDetailResponse {
  id: string
  name: string
  status: string
  conversations: ProjectConversationSummary[]
}

interface ProjectTasksViewProps {
  projects: ProjectItem[]
  currentProjectId?: string | null
  agents: Agent[]
  onBackToChat: () => void
  onOpenProject: (projectId: string) => void
  onOpenConversation: (conversationId: string) => void
  onOpenDeliverable: (deliverable: Deliverable) => void
  onFinalizeTask?: (taskId: string) => void
}

const API_BASE = '/api'

const ProjectTasksView = ({ projects, currentProjectId, agents, onBackToChat, onOpenProject, onOpenConversation, onOpenDeliverable, onFinalizeTask }: ProjectTasksViewProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(currentProjectId ?? projects[0]?.id ?? null)
  const [projectDetail, setProjectDetail] = useState<ProjectDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentProjectId) setSelectedProjectId(currentProjectId)
  }, [currentProjectId])

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null)
      return
    }

    let cancelled = false
    const fetchProject = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('plury_token')
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        const res = await fetch(`${API_BASE}/projects/${selectedProjectId}`, { headers })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setProjectDetail(data)
      } catch (err) {
        console.error('[ProjectTasksView] Fetch project error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProject()
    return () => { cancelled = true }
  }, [selectedProjectId])

  const projectTasks = useMemo(() => {
    if (!projectDetail) return []
    const tasks: KanbanTask[] = []
    for (const conversation of projectDetail.conversations || []) {
      for (const task of conversation.kanbanTasks || []) {
        tasks.push(task)
      }
    }
    return tasks.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })
  }, [projectDetail])

  return (
    <div className="flex-1 flex overflow-hidden bg-page">
      <div className="w-full md:w-[320px] md:min-w-[320px] border-r border-edge bg-surface flex flex-col">
        <div className="px-4 py-3 border-b border-edge">
          <button
            onClick={onBackToChat}
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-faint hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al chat
          </button>
          <h2 className="mt-3 text-lg font-bold text-ink">Mis tareas</h2>
          <p className="text-xs text-ink-faint mt-1">
            Sigue el avance por proyecto y abre lo que ya fue entregado.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen size={32} className="mx-auto text-ink-faint/20 mb-3" />
              <p className="text-xs text-ink-faint">Aun no tienes proyectos creados</p>
            </div>
          ) : (
            projects.map(project => {
              const isActive = selectedProjectId === project.id
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${isActive ? 'border-primary/30 bg-primary/5' : 'border-edge bg-surface-alt hover:border-primary/20 hover:bg-subtle'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-primary text-primary-fg' : 'bg-subtle text-ink-faint'}`}>
                      <FolderOpen size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-ink'}`}>{project.name}</p>
                      <p className="text-[10px] text-ink-faint">
                        {project.conversationCount} chat{project.conversationCount === 1 ? '' : 's'} · {project.deliverables.length} entrega{project.deliverables.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {!selectedProjectId ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <Sparkles size={34} className="mx-auto text-ink-faint/20 mb-4" />
              <p className="text-sm font-semibold text-ink">Selecciona un proyecto</p>
              <p className="text-xs text-ink-faint mt-1">Aqui veras planeacion, ejecucion y entregas del proyecto.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projectDetail ? (
          <>
            <div className="px-4 md:px-6 py-4 border-b border-edge bg-surface flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Proyecto</p>
                <h3 className="text-lg font-bold text-ink truncate">{projectDetail.name}</h3>
                <p className="text-xs text-ink-faint mt-1">
                  {projectTasks.length} tarea{projectTasks.length === 1 ? '' : 's'} registradas en este proyecto.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenProject(projectDetail.id)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-fg hover:opacity-90 transition-opacity"
                >
                  Abrir proyecto
                </button>
              </div>
            </div>

            {projectDetail.conversations.length > 0 && (
              <div className="px-4 md:px-6 py-3 border-b border-edge bg-surface flex gap-2 overflow-x-auto">
                {projectDetail.conversations.map(conversation => (
                  <button
                    key={conversation.id}
                    onClick={() => onOpenConversation(conversation.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-subtle hover:bg-surface-alt text-[11px] font-semibold text-ink-faint hover:text-ink transition-all whitespace-nowrap"
                  >
                    <MessageSquare size={12} />
                    {conversation.title}
                  </button>
                ))}
              </div>
            )}

            <TaskTimeline
              tasks={projectTasks}
              agents={agents}
              onTaskClick={onOpenDeliverable}
              onFinalizeTask={onFinalizeTask}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <FolderOpen size={34} className="mx-auto text-ink-faint/20 mb-4" />
              <p className="text-sm font-semibold text-ink">No pude cargar el proyecto</p>
              <p className="text-xs text-ink-faint mt-1">Prueba con otro proyecto o vuelve al chat.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectTasksView
