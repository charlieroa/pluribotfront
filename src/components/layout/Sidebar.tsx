import { useState } from 'react'
import { Moon, Sun, Plus, Clock, CheckCircle2, Loader2, Store, LogIn, UserPlus, PanelLeftClose, PanelLeftOpen, MessageSquare, Bot, Settings, LayoutGrid, Trash2, Shield } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import AuthModal from '../auth/AuthModal'
import type { Agent } from '../../types'
import type { ActiveAgent, ConversationItem } from '../../hooks/useChat'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  agents: Agent[]
  onNewChat: () => void
  activeAgents?: ActiveAgent[]
  collapsed: boolean
  onToggleCollapse: () => void
  conversations?: ConversationItem[]
  currentConversationId?: string | null
  onLoadConversation?: (id: string) => void
  onDeleteConversation?: (id: string) => void
  assignedHumanAgent?: { name: string; role: string } | null
}

type SidebarSection = 'chats' | 'bots'

const Sidebar = ({ activeTab, setActiveTab, agents, onNewChat, activeAgents = [], collapsed, onToggleCollapse, conversations = [], currentConversationId, onLoadConversation, onDeleteConversation, assignedHumanAgent }: SidebarProps) => {
  const { isDark, toggle } = useTheme()
  const { user, activeBots } = useAuth()
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('chats')

  const activeByAgentId = new Map<string, ActiveAgent[]>()
  for (const a of activeAgents) {
    const list = activeByAgentId.get(a.agentId) || []
    list.push(a)
    activeByAgentId.set(a.agentId, list)
  }
  const hasActiveAgents = activeAgents.length > 0
  const isAuthenticated = !!user

  const openLogin = () => { setAuthMode('login'); setShowAuthModal(true) }
  const openRegister = () => { setAuthMode('register'); setShowAuthModal(true) }

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

  // ─── Collapsed sidebar ───
  if (collapsed) {
    return (
      <>
        <aside className="w-16 bg-surface border-r border-edge flex flex-col items-center py-4 gap-2">
          {/* Logo */}
          <button onClick={onToggleCollapse} className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-fg font-bold text-sm mb-2 hover:opacity-80 transition-opacity">
            P
          </button>

          {/* New Chat */}
          <button
            onClick={() => { onNewChat(); setActiveTab('chat') }}
            className="w-9 h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg flex items-center justify-center transition-all"
            title="Nuevo Chat"
          >
            <Plus size={18} />
          </button>

          {/* Nav icons */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'chat' ? 'bg-primary text-primary-fg' : 'text-ink-faint hover:text-ink hover:bg-subtle'}`}
            title="Chat"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'marketplace' ? 'bg-primary text-primary-fg' : 'text-ink-faint hover:text-ink hover:bg-subtle'}`}
            title="Marketplace"
          >
            <Store size={18} />
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'tasks' ? 'bg-primary text-primary-fg' : 'text-ink-faint hover:text-ink hover:bg-subtle'}`}
            title="Tareas"
          >
            <LayoutGrid size={18} />
          </button>
          {user && ['superadmin', 'org_admin', 'agent'].includes(user.role || '') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'admin' ? 'bg-violet-600 text-white' : 'text-violet-500 hover:text-violet-600 hover:bg-violet-500/10'}`}
              title="Admin"
            >
              <Shield size={18} />
            </button>
          )}

          {/* Separator */}
          <div className="w-6 h-px bg-edge my-1" />

          {/* Active bot avatars */}
          {agents.slice(0, 5).map(agent => {
            const instances = activeByAgentId.get(agent.id) || []
            const isWorking = instances.some(i => i.status === 'working')
            const isBotActive = isAuthenticated ? activeBots.includes(agent.id) : false
            if (!isAuthenticated && !isWorking) return null
            if (isAuthenticated && !isBotActive && !isWorking) return null
            return (
              <div key={agent.id} className="relative" title={agent.name}>
                <BotAvatar3D seed={agent.name} color={agent.color} isActive={isWorking} size="sm" />
                {isWorking && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <Loader2 size={8} className="text-white animate-spin" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Expand button */}
          <button
            onClick={onToggleCollapse}
            className="w-9 h-9 text-ink-faint hover:text-ink hover:bg-subtle rounded-lg flex items-center justify-center transition-all"
            title="Expandir sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>

          {/* Theme */}
          <button onClick={toggle} className="w-9 h-9 text-ink-faint hover:text-primary rounded-lg flex items-center justify-center transition-all">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-ink-faint hover:text-ink hover:bg-subtle'}`}
            title="Configuracion"
          >
            <Settings size={16} />
          </button>
        </aside>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode={authMode} />
      </>
    )
  }

  // ─── Expanded sidebar ───
  return (
    <>
      <aside className="w-80 bg-surface border-r border-edge flex flex-col">
        {/* Logo + Collapse */}
        <div className="p-4 pb-3 border-b border-edge-soft flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-fg font-bold text-sm">P</div>
            <span className="text-xl font-bold tracking-tight text-ink">Pluribots</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-ink-faint hover:text-ink hover:bg-subtle rounded-lg transition-all"
            title="Recoger sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat + Section Tabs */}
        <div className="px-4 pt-3 pb-2">
          <button
            onClick={() => { onNewChat(); setActiveTab('chat') }}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary text-primary-fg rounded-xl font-semibold text-sm mb-3 hover:opacity-90 transition-all"
          >
            <Plus size={18} /> Nuevo Chat
          </button>

          <div className="flex gap-1 bg-subtle rounded-lg p-0.5">
            <button
              onClick={() => setSidebarSection('chats')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                sidebarSection === 'chats' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink'
              }`}
            >
              <MessageSquare size={13} />
              Chats
            </button>
            <button
              onClick={() => setSidebarSection('bots')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                sidebarSection === 'bots' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink'
              }`}
            >
              <Bot size={13} />
              Bots
              {hasActiveAgents && (
                <span className="w-4 h-4 text-[9px] font-bold bg-primary text-primary-fg rounded-full flex items-center justify-center">
                  {activeAgents.filter(a => a.status === 'working').length || activeAgents.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sidebarSection === 'chats' ? (
            // ─── Chats section ───
            <div className="px-4 py-2">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-ink-faint/30 mb-3" />
                  <p className="text-xs text-ink-faint mb-1">Registrate para guardar tus chats</p>
                  <button onClick={openRegister} className="text-xs font-semibold text-primary hover:underline">
                    Crear cuenta
                  </button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-ink-faint/30 mb-3" />
                  <p className="text-xs text-ink-faint">No hay conversaciones aun</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`relative w-full text-left p-3 rounded-xl transition-all group ${
                        currentConversationId === conv.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-subtle border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => onLoadConversation?.(conv.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2 pr-6">
                          <p className={`text-sm font-semibold truncate ${
                            currentConversationId === conv.id ? 'text-primary' : 'text-ink group-hover:text-ink'
                          }`}>
                            {conv.title}
                          </p>
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
                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteConversation?.(conv.id) }}
                        className="absolute top-3 right-2 p-1 text-ink-faint/0 group-hover:text-ink-faint hover:!text-red-500 rounded transition-all"
                        title="Eliminar chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ─── Bots section ───
            <div className="px-4 py-2">
              <div className="space-y-1">
                {agents.map(agent => {
                  const instances = activeByAgentId.get(agent.id) || []
                  const instanceCount = instances.length
                  const hasWorkingInstance = instances.some(i => i.status === 'working')
                  const hasDoneInstance = instances.some(i => i.status === 'done')
                  const hasWaitingInstance = instances.some(i => i.status === 'waiting')
                  const isParticipating = instanceCount > 0
                  const isBotActive = isAuthenticated ? activeBots.includes(agent.id) : false
                  const isBotOff = !isAuthenticated || !isBotActive
                  const primaryStatus = hasWorkingInstance ? 'working' : hasDoneInstance ? 'done' : hasWaitingInstance ? 'waiting' : null

                  return (
                    <div
                      key={agent.id}
                      className={`relative w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isBotOff
                          ? 'opacity-40 border-l-4 border-transparent'
                          : hasWorkingInstance
                            ? 'bg-primary-soft border-l-4 border-primary'
                            : hasDoneInstance
                              ? 'bg-emerald-500/5 border-l-4 border-emerald-500'
                              : hasWaitingInstance
                                ? 'bg-amber-500/5 border-l-4 border-amber-400'
                                : hasActiveAgents && !isParticipating
                                  ? 'opacity-40 border-l-4 border-transparent'
                                  : 'hover:bg-surface-alt border-l-4 border-transparent'
                      }`}
                      onMouseEnter={() => setHoveredAgent(agent.id)}
                      onMouseLeave={() => setHoveredAgent(null)}
                    >
                      <div className="relative">
                        <BotAvatar3D seed={agent.name} color={agent.color} isActive={!isBotOff && (hasWorkingInstance || hasDoneInstance)} size="md" />
                        {!isBotOff && primaryStatus === 'working' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Loader2 size={10} className="text-white animate-spin" />
                          </div>
                        )}
                        {!isBotOff && primaryStatus === 'done' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={10} className="text-white" />
                          </div>
                        )}
                        {!isBotOff && primaryStatus === 'waiting' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                            <Clock size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-ink truncate">{agent.name}</p>
                          {instanceCount > 1 && (
                            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              x{instanceCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-faint truncate">
                          {isBotOff ? 'Inactivo' : agent.role}
                        </p>
                      </div>

                      {/* Tooltip */}
                      {hoveredAgent === agent.id && instances.length > 0 && (
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-xl max-w-[260px] pointer-events-none">
                          {instances.map((inst, i) => (
                            <div key={inst.instanceId} className={i > 0 ? 'mt-1.5 pt-1.5 border-t border-slate-700' : ''}>
                              <p className="font-bold mb-0.5 text-slate-400">
                                {inst.instanceId} — {inst.status === 'working' ? 'Trabajando' : inst.status === 'done' ? 'Listo' : 'Pendiente'}
                              </p>
                              <p className="text-slate-300 leading-relaxed">{inst.task}</p>
                            </div>
                          ))}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Assigned human agent */}
              {assignedHumanAgent && (
                <div className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl bg-violet-500/5 border-l-4 border-violet-500">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 flex-shrink-0 flex items-center justify-center text-white">
                    <Shield size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-ink truncate">{assignedHumanAgent.name}</p>
                    </div>
                    <p className="text-xs text-violet-600 truncate">{assignedHumanAgent.role} — En linea</p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-pulse flex-shrink-0" />
                </div>
              )}

              {/* Marketplace link */}
              <button
                onClick={() => setActiveTab('marketplace')}
                className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
              >
                <Store size={14} />
                Ver Marketplace
              </button>
            </div>
          )}
        </div>

        {/* Bottom nav icons */}
        <div className="px-4 py-2 border-t border-edge-soft flex items-center gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === 'chat' ? 'text-primary bg-primary/10' : 'text-ink-faint hover:text-ink hover:bg-subtle'
            }`}
          >
            <MessageSquare size={13} />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === 'tasks' ? 'text-primary bg-primary/10' : 'text-ink-faint hover:text-ink hover:bg-subtle'
            }`}
          >
            <LayoutGrid size={13} />
            Tareas
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-ink-faint hover:text-ink hover:bg-subtle'
            }`}
          >
            <Settings size={13} />
            Config
          </button>
          {user && ['superadmin', 'org_admin', 'agent'].includes(user.role || '') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                activeTab === 'admin' ? 'text-violet-600 bg-violet-500/10' : 'text-violet-500/70 hover:text-violet-600 hover:bg-violet-500/10'
              }`}
            >
              <Shield size={13} />
              Admin
            </button>
          )}
        </div>

        {/* User Profile / Auth Section */}
        <div className="p-4 border-t border-edge-soft">
          {user ? (
            <div className="bg-subtle rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-fg text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={() => setActiveTab('settings')} className="flex-1 overflow-hidden text-left hover:opacity-80 transition-opacity">
                <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                <p className="text-[10px] text-ink-faint truncate">{user.email}</p>
              </button>
              <button onClick={toggle} className="p-1.5 text-ink-faint hover:text-primary transition-colors">
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          ) : (
            <div className="bg-subtle rounded-2xl p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-slate-300 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">?</div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-ink">Invitado</p>
                  <p className="text-[10px] text-ink-faint">Registrate para activar bots</p>
                </div>
                <button onClick={toggle} className="p-1.5 text-ink-faint hover:text-primary transition-colors">
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openLogin}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-ink-light hover:text-ink bg-surface rounded-lg border border-edge hover:border-primary/30 transition-all"
                >
                  <LogIn size={12} />
                  Iniciar sesion
                </button>
                <button
                  onClick={openRegister}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  <UserPlus size={12} />
                  Registrate
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode={authMode} />
    </>
  )
}

export default Sidebar
