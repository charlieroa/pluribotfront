import { useState, useEffect, useCallback } from 'react'
import { Clock, UserCheck, CheckCircle, AlertCircle, Users } from 'lucide-react'
import AdminConversationView from './AdminConversationView'
import OrganizationSettings from './OrganizationSettings'

interface FlaggedConversation {
  id: string
  title: string
  needsHumanReview: boolean
  user: { id: string; name: string; email: string }
  assignedAgent: { id: string; name: string } | null
  lastMessage: { text: string; sender: string; createdAt: string } | null
  createdAt: string
  updatedAt: string
}

interface AdminStats {
  pending: number
  assigned: number
  totalConversations: number
  totalUsers: number
}

type AdminTab = 'pending' | 'assigned' | 'resolved' | 'team'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending')
  const [conversations, setConversations] = useState<FlaggedConversation[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() })
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error('[Admin] Stats error:', err)
    }
  }, [])

  const fetchConversations = useCallback(async () => {
    if (activeTab === 'team') return
    setLoading(true)
    try {
      const statusMap: Record<string, string> = {
        pending: 'pending',
        assigned: 'assigned',
        resolved: 'resolved',
      }
      const res = await fetch(`/api/admin/conversations/flagged?status=${statusMap[activeTab]}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) setConversations(await res.json())
    } catch (err) {
      console.error('[Admin] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchConversations() }, [fetchConversations])

  const handleAssignSelf = async (convId: string) => {
    try {
      await fetch(`/api/admin/conversations/${convId}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      })
      fetchConversations()
      fetchStats()
    } catch (err) {
      console.error('[Admin] Assign error:', err)
    }
  }

  const handleResolve = async (convId: string) => {
    try {
      await fetch(`/api/admin/conversations/${convId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      fetchConversations()
      fetchStats()
    } catch (err) {
      console.error('[Admin] Resolve error:', err)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  if (selectedConversation) {
    return (
      <AdminConversationView
        conversationId={selectedConversation}
        onBack={() => { setSelectedConversation(null); fetchConversations(); fetchStats() }}
        onResolve={() => handleResolve(selectedConversation)}
      />
    )
  }

  const tabs: { id: AdminTab; label: string; icon: typeof Clock; count?: number }[] = [
    { id: 'pending', label: 'Pendientes', icon: AlertCircle, count: stats?.pending },
    { id: 'assigned', label: 'Asignadas', icon: UserCheck, count: stats?.assigned },
    { id: 'resolved', label: 'Resueltas', icon: CheckCircle },
    { id: 'team', label: 'Equipo', icon: Users },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-page">
      {/* Stats bar */}
      {stats && (
        <div className="px-4 md:px-8 py-3 md:py-4 border-b border-edge bg-surface flex flex-wrap gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{stats.pending}</p>
              <p className="text-[10px] text-ink-faint">Pendientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <UserCheck size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{stats.assigned}</p>
              <p className="text-[10px] text-ink-faint">Asignadas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Users size={16} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{stats.totalUsers}</p>
              <p className="text-[10px] text-ink-faint">Usuarios</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-8 pt-4 flex gap-1 bg-surface border-b border-edge">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary bg-page'
                : 'text-ink-faint border-transparent hover:text-ink hover:bg-subtle'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'team' ? (
          <OrganizationSettings />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle size={48} className="mx-auto text-ink-faint/20 mb-4" />
            <p className="text-sm text-ink-faint">
              {activeTab === 'pending' ? 'No hay conversaciones pendientes' :
               activeTab === 'assigned' ? 'No hay conversaciones asignadas' :
               'No hay conversaciones resueltas recientes'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className="bg-surface border border-edge rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => setSelectedConversation(conv.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-ink truncate">{conv.title}</p>
                      <span className="text-[10px] text-ink-faint flex-shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTimeAgo(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-faint mb-2">
                      <span className="font-semibold">{conv.user.name}</span> — {conv.user.email}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-ink-light truncate">
                        <span className="font-semibold">{conv.lastMessage.sender}:</span> {conv.lastMessage.text}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {conv.assignedAgent ? (
                      <span className="px-2 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 rounded-lg">
                        {conv.assignedAgent.name}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAssignSelf(conv.id) }}
                        className="px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all"
                      >
                        Asignarme
                      </button>
                    )}
                    {conv.needsHumanReview && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResolve(conv.id) }}
                        className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
