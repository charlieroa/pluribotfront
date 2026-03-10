import { useState, useEffect } from 'react'
import { ArrowLeft, Globe, Code, FileText, Video, Palette, BarChart3, Calendar, MessageSquare, ExternalLink } from 'lucide-react'
import type { Deliverable } from '../../types'

interface ProjectConversation {
  id: string
  title: string
  updatedAt: string
  messages: { text: string; sender: string }[]
  deliverables: ProjectDeliverable[]
}

interface ProjectDeliverable {
  id: string
  title: string
  type: string
  botType: string
  content: string
  version?: number
  instanceId?: string
  netlifyUrl?: string
  customDomain?: string
  createdAt: string
}

interface ProjectDetail {
  id: string
  name: string
  description?: string | null
  status: string
  createdAt: string
  updatedAt: string
  conversations: ProjectConversation[]
}

interface ProjectViewProps {
  projectId: string
  onBack: () => void
  onOpenDeliverable: (d: Deliverable) => void
  onLoadConversation: (id: string) => void
}

const API_BASE = '/api'

const typeIcon: Record<string, typeof Globe> = {
  design: Globe,
  code: Code,
  report: FileText,
  video: Video,
  copy: Palette,
}

const typeLabel: Record<string, string> = {
  design: 'Diseno',
  code: 'App',
  report: 'Reporte',
  video: 'Video',
  copy: 'Copy',
}

const typeColor: Record<string, string> = {
  design: '#a855f7',
  code: '#f59e0b',
  report: '#3b82f6',
  video: '#ef4444',
  copy: '#10b981',
}

const botColor: Record<string, string> = {
  web: '#a855f7',
  dev: '#f59e0b',
  seo: '#3b82f6',
  video: '#ef4444',
  ads: '#10b981',
  content: '#f97316',
  brand: '#ec4899',
}

const ProjectView = ({ projectId, onBack, onOpenDeliverable, onLoadConversation }: ProjectViewProps) => {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('plury_token')
        const res = await fetch(`${API_BASE}/projects/${projectId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          setProject(await res.json())
        }
      } catch (err) {
        console.error('Error fetching project:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full animate-spin border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink-faint">Proyecto no encontrado</p>
        <button onClick={onBack} className="text-xs font-semibold text-primary hover:underline">Volver</button>
      </div>
    )
  }

  // Flatten all deliverables, keeping latest version per instanceId
  const allDeliverables: (ProjectDeliverable & { conversationTitle: string; conversationId: string })[] = []
  const seenInstances = new Set<string>()

  for (const conv of project.conversations) {
    for (const d of conv.deliverables) {
      const key = d.instanceId || d.id
      if (seenInstances.has(key)) continue
      seenInstances.add(key)
      allDeliverables.push({ ...d, conversationTitle: conv.title, conversationId: conv.id })
    }
  }

  const totalConversations = project.conversations.length
  const totalDeliverables = allDeliverables.length

  // Group by type
  const byType: Record<string, typeof allDeliverables> = {}
  for (const d of allDeliverables) {
    const t = d.type || 'report'
    if (!byType[t]) byType[t] = []
    byType[t].push(d)
  }

  const handleOpenDeliverable = (d: ProjectDeliverable) => {
    onOpenDeliverable({
      id: d.id,
      title: d.title,
      type: d.type as Deliverable['type'],
      content: d.content,
      agent: d.botType,
      botType: d.botType,
    })
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-edge">
        <div className="px-6 py-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-ink transition-colors mb-3">
            <ArrowLeft size={14} />
            Proyectos
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-ink">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-ink-faint mt-1">{project.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <MessageSquare size={13} />
              <span className="font-semibold">{totalConversations}</span> conversaciones
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <BarChart3 size={13} />
              <span className="font-semibold">{totalDeliverables}</span> entregables
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Calendar size={13} />
              {new Date(project.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Deliverables grid */}
        {totalDeliverables === 0 ? (
          <div className="text-center py-16">
            <Globe size={40} className="mx-auto text-ink-faint/20 mb-3" />
            <p className="text-sm text-ink-faint">Este proyecto aun no tiene entregables</p>
            <p className="text-xs text-ink-faint/60 mt-1">Crea algo desde el chat y agregalo a este proyecto</p>
          </div>
        ) : (
          Object.entries(byType).map(([type, items]) => {
            const Icon = typeIcon[type] || FileText
            const color = typeColor[type] || '#6b7280'
            const label = typeLabel[type] || type

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <h2 className="text-sm font-bold text-ink">{label}</h2>
                  <span className="text-[10px] font-semibold text-ink-faint bg-subtle px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(d => {
                    const bColor = botColor[d.botType] || '#6b7280'
                    const isVisual = ['design', 'code'].includes(d.type)

                    return (
                      <button
                        key={d.id}
                        onClick={() => handleOpenDeliverable(d)}
                        className="group text-left rounded-xl border border-edge bg-surface-alt hover:border-primary/30 hover:shadow-md transition-all overflow-hidden"
                      >
                        {/* Preview thumbnail for visual deliverables */}
                        {isVisual && d.content && (
                          <div className="relative h-36 bg-subtle overflow-hidden">
                            <iframe
                              srcDoc={d.content}
                              className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                              sandbox="allow-scripts allow-same-origin"
                              title={d.title}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-surface-alt/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                              <ExternalLink size={14} className="text-primary" />
                            </div>
                          </div>
                        )}

                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
                                {d.title.replace(/\s*\(refinado\)/, '')}
                              </p>
                              <p className="text-[11px] text-ink-faint mt-0.5 truncate">{d.conversationTitle}</p>
                            </div>
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ backgroundColor: bColor }}
                            >
                              {d.botType?.charAt(0)?.toUpperCase()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-ink-faint">
                              {new Date(d.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                            </span>
                            {d.netlifyUrl && (
                              <a
                                href={d.netlifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[10px] font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
                              >
                                <Globe size={9} /> Publicado
                              </a>
                            )}
                            {d.version && d.version > 1 && (
                              <span className="text-[10px] text-ink-faint bg-subtle px-1 py-0.5 rounded">v{d.version}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* Conversations list */}
        {project.conversations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary/10">
                <MessageSquare size={14} className="text-primary" />
              </div>
              <h2 className="text-sm font-bold text-ink">Conversaciones</h2>
            </div>

            <div className="space-y-1.5">
              {project.conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => onLoadConversation(conv.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-edge hover:border-primary/30 hover:bg-subtle transition-all text-left"
                >
                  <MessageSquare size={14} className="text-ink-faint flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{conv.title}</p>
                    {conv.messages[0] && (
                      <p className="text-[11px] text-ink-faint truncate mt-0.5">
                        {conv.messages[0].sender}: {conv.messages[0].text}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {conv.deliverables.length > 0 && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {conv.deliverables.length} entregables
                      </span>
                    )}
                    <span className="text-[10px] text-ink-faint">
                      {new Date(conv.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectView
