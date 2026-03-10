import { useState } from 'react'
import { Plus, PanelLeftClose, PanelLeftOpen, MessageSquare, Trash2, FolderOpen, Package, Store, LayoutList } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AuthModal from '../auth/AuthModal'
import type { ActiveAgent, ConversationItem, ProjectItem } from '../../hooks/useChat'

interface SidebarProps {
  onNewChat: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  conversations?: ConversationItem[]
  currentConversationId?: string | null
  onLoadConversation?: (id: string) => void
  onDeleteConversation?: (id: string) => void
  projects?: ProjectItem[]
  onOpenProject?: (id: string) => void
  onOpenMarketplace?: () => void
  onOpenTasks?: () => void
  activeAgents?: ActiveAgent[]
}

const Sidebar = ({ onNewChat, collapsed, onToggleCollapse, conversations = [], currentConversationId, onLoadConversation, onDeleteConversation, projects = [], onOpenProject, onOpenMarketplace, onOpenTasks }: SidebarProps) => {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    if (currentConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === currentConversationId)
      if (conv?.projectId) return new Set([conv.projectId])
    }
    return new Set()
  })

  const isAuthenticated = !!user

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
  }

  // Collapsed sidebar
  if (collapsed) {
    return (
      <aside className="w-16 bg-surface border-r border-edge flex flex-col items-center py-4 gap-2">
        <button onClick={onToggleCollapse} className="mb-2 hover:opacity-80 transition-opacity">
          <img src="/logo-light.png" alt="Plury" className="h-16 hidden dark:block" />
          <img src="/logo-dark.png" alt="Plury" className="h-16 dark:hidden" />
        </button>

        <button
          onClick={onNewChat}
          className="w-9 h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg flex items-center justify-center transition-all"
          title="Nuevo Proyecto"
        >
          <Plus size={18} />
        </button>

        <div className="flex-1" />

        <button
          onClick={onOpenMarketplace}
          className="w-9 h-9 text-ink-faint hover:text-ink hover:bg-subtle rounded-lg flex items-center justify-center transition-all"
          title="Agentes"
        >
          <Store size={16} />
        </button>
        <button
          onClick={onOpenTasks}
          className="w-9 h-9 text-ink-faint hover:text-ink hover:bg-subtle rounded-lg flex items-center justify-center transition-all"
          title="Tareas"
        >
          <LayoutList size={16} />
        </button>

        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 text-ink-faint hover:text-ink hover:bg-subtle rounded-lg flex items-center justify-center transition-all"
          title="Expandir sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    )
  }

  // Expanded sidebar
  return (
    <>
      <aside className="w-80 bg-surface border-r border-edge flex flex-col">
        {/* Logo + Collapse */}
        <div className="px-4 pt-2 pb-1 border-b border-edge-soft flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-light.png" alt="Plury" className="h-16 hidden dark:block" />
            <img src="/logo-dark.png" alt="Plury" className="h-16 dark:hidden" />
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-ink-faint hover:text-ink hover:bg-subtle rounded-lg transition-all"
            title="Recoger sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Project button */}
        <div className="px-4 pt-2 pb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary text-primary-fg rounded-xl font-semibold text-sm mb-1 hover:opacity-90 transition-all"
          >
            <Plus size={18} /> Nuevo Proyecto
          </button>
        </div>

        {/* Scrollable conversations */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2">
            {!isAuthenticated ? (
              <div className="text-center py-8">
                <FolderOpen size={32} className="mx-auto text-ink-faint/30 mb-3" />
                <p className="text-xs text-ink-faint mb-1">Registrate para guardar tus proyectos</p>
                <button onClick={() => setShowAuthModal(true)} className="text-xs font-semibold text-primary hover:underline">
                  Crear cuenta
                </button>
              </div>
            ) : conversations.length === 0 && projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen size={32} className="mx-auto text-ink-faint/30 mb-3" />
                <p className="text-xs text-ink-faint">No hay proyectos aun</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Grouped projects */}
                {projects.map(project => {
                  const projectConvs = conversations.filter(c => c.projectId === project.id)
                  const isExpanded = expandedProjects.has(project.id)
                  const hasActiveConv = projectConvs.some(c => c.id === currentConversationId)

                  return (
                    <div key={project.id}>
                      <button
                        onClick={() => {
                          if (onOpenProject) {
                            onOpenProject(project.id)
                          } else {
                            setExpandedProjects(prev => {
                              const next = new Set(prev)
                              next.has(project.id) ? next.delete(project.id) : next.add(project.id)
                              return next
                            })
                          }
                        }}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all ${
                          hasActiveConv ? 'bg-primary/5' : 'hover:bg-subtle'
                        }`}
                      >
                        <FolderOpen size={14} className={`flex-shrink-0 transition-colors ${hasActiveConv ? 'text-primary' : 'text-ink-faint'}`} />
                        <p className={`text-xs font-bold truncate flex-1 ${hasActiveConv ? 'text-primary' : 'text-ink'}`}>
                          {project.name}
                        </p>
                        <span className="text-[9px] text-ink-faint bg-subtle px-1.5 py-0.5 rounded-full font-semibold">
                          {projectConvs.length}
                        </span>
                        <svg
                          className={`w-3 h-3 text-ink-faint transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {isExpanded && projectConvs.length > 0 && (
                        <div className="ml-4 border-l border-edge pl-2 space-y-0.5 mt-0.5">
                          {projectConvs.map(conv => (
                            <div
                              key={conv.id}
                              className={`relative w-full text-left p-2 rounded-lg transition-all group ${
                                currentConversationId === conv.id
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'hover:bg-subtle border border-transparent'
                              }`}
                            >
                              <button onClick={() => onLoadConversation?.(conv.id)} className="w-full text-left">
                                <div className="flex items-center gap-1.5 pr-5">
                                  <MessageSquare size={11} className="text-ink-faint flex-shrink-0" />
                                  <p className={`text-[11px] font-semibold truncate ${
                                    currentConversationId === conv.id ? 'text-primary' : 'text-ink'
                                  }`}>
                                    {conv.title}
                                  </p>
                                  {(conv.deliverableCount ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5 px-1 py-0.5 bg-primary-soft text-primary rounded-full flex-shrink-0">
                                      <Package size={7} />
                                      <span className="text-[8px] font-bold">{conv.deliverableCount}</span>
                                    </span>
                                  )}
                                </div>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteConversation?.(conv.id) }}
                                className="absolute top-2 right-1 p-0.5 text-ink-faint/0 group-hover:text-ink-faint hover:!text-red-500 rounded transition-all"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Ungrouped conversations */}
                {(() => {
                  const projectIds = new Set(projects.map(p => p.id))
                  const ungrouped = conversations.filter(c => !c.projectId || !projectIds.has(c.projectId))
                  if (ungrouped.length === 0) return null

                  return (
                    <>
                      {projects.length > 0 && (
                        <div className="pt-2 pb-1">
                          <p className="text-[9px] font-bold text-ink-faint uppercase tracking-wider px-1">Chats sueltos</p>
                        </div>
                      )}
                      {ungrouped.map(conv => (
                        <div
                          key={conv.id}
                          className={`relative w-full text-left p-3 rounded-xl transition-all group ${
                            currentConversationId === conv.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-subtle border border-transparent'
                          }`}
                        >
                          <button onClick={() => onLoadConversation?.(conv.id)} className="w-full text-left">
                            <div className="flex items-start justify-between gap-2 pr-6">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <p className={`text-sm font-semibold truncate ${
                                  currentConversationId === conv.id ? 'text-primary' : 'text-ink group-hover:text-ink'
                                }`}>
                                  {conv.title}
                                </p>
                                {(conv.deliverableCount ?? 0) > 0 && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-soft text-primary rounded-full flex-shrink-0">
                                    <Package size={9} />
                                    <span className="text-[9px] font-bold">{conv.deliverableCount}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-ink-faint flex-shrink-0">
                                {formatTimeAgo(conv.updatedAt)}
                              </span>
                            </div>
                            {conv.lastMessage && (
                              <p className="text-[11px] text-ink-faint truncate mt-0.5 pr-6">
                                {conv.lastMessage.slice(0, 60)}
                              </p>
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteConversation?.(conv.id) }}
                            className="absolute top-3 right-2 p-1 text-ink-faint/0 group-hover:text-ink-faint hover:!text-red-500 rounded transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Bottom — 2 icon buttons */}
        <div className="px-4 py-3 border-t border-edge-soft flex items-center gap-2">
          <button
            onClick={onOpenMarketplace}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg text-ink-faint hover:text-ink hover:bg-subtle transition-all"
          >
            <Store size={14} />
            Agentes
          </button>
          <button
            onClick={onOpenTasks}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg text-ink-faint hover:text-ink hover:bg-subtle transition-all"
          >
            <LayoutList size={14} />
            Tareas
          </button>
        </div>
      </aside>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode="register" />
    </>
  )
}

export default Sidebar
