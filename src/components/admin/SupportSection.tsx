import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Clock, CheckCircle, UserCircle, AlertCircle } from 'lucide-react'
import AdminConversationView from './AdminConversationView'

interface FlaggedConversation {
  id: string
  title: string
  needsHumanReview: boolean
  assignedAgentId: string | null
  assignedAgentName: string | null
  user: { id: string; name: string; email: string }
  createdAt: string
  updatedAt: string
  messageCount: number
}

type FilterStatus = 'pending' | 'assigned' | 'all'

const SupportSection = () => {
  const [conversations, setConversations] = useState<FlaggedConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('plury_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/conversations/flagged?status=${filter}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (err) {
      console.error('[Support] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchConversations() }, [fetchConversations])
  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchConversations()
    }, 15000)
    return () => window.clearInterval(interval)
  }, [fetchConversations])

  const handleAssign = async (convId: string) => {
    try {
      await fetch(`/api/admin/conversations/${convId}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      fetchConversations()
    } catch (err) {
      console.error('[Support] Assign error:', err)
    }
  }

  const handleResolve = async (convId: string) => {
    try {
      await fetch(`/api/admin/conversations/${convId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      setSelectedConvId(null)
      fetchConversations()
    } catch (err) {
      console.error('[Support] Resolve error:', err)
    }
  }

  // If viewing a specific conversation, show the full chat
  if (selectedConvId) {
    return (
      <AdminConversationView
        conversationId={selectedConvId}
        onBack={() => { setSelectedConvId(null); fetchConversations() }}
        onResolve={() => handleResolve(selectedConvId)}
      />
    )
  }

  const pendingCount = conversations.filter(c => !c.assignedAgentId).length
  const assignedCount = conversations.filter(c => c.assignedAgentId).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Soporte Humano</h2>
          <p className="text-xs text-ink-faint mt-0.5">Conversaciones que necesitan atencion humana</p>
          <p className="text-[11px] text-ink-faint mt-1">Actualizacion automatica cada 15s</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-lg">
            <AlertCircle size={13} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-600">{pendingCount} pendientes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg">
            <UserCircle size={13} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-600">{assignedCount} asignadas</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([
          { id: 'all', label: 'Todas' },
          { id: 'pending', label: 'Pendientes' },
          { id: 'assigned', label: 'Asignadas' },
        ] as { id: FilterStatus; label: string }[]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === f.id
                ? 'bg-primary text-primary-fg'
                : 'bg-subtle text-ink-faint hover:text-ink hover:bg-edge'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-ink-faint">
          <CheckCircle size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No hay conversaciones pendientes</p>
          <p className="text-xs mt-1">Cuando un usuario pida ayuda humana, aparecera aqui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className="bg-surface border border-edge rounded-xl p-4 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedConvId(conv.id)}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-ink truncate group-hover:text-primary transition-colors">
                      {conv.title || 'Sin titulo'}
                    </h3>
                    {!conv.assignedAgentId ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 rounded-full flex-shrink-0">
                        Pendiente
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-600 rounded-full flex-shrink-0">
                        Asignada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-faint">
                    <span className="flex items-center gap-1">
                      <UserCircle size={11} />
                      {conv.user.name} ({conv.user.email})
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={11} />
                      {conv.messageCount} msgs
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(conv.updatedAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {conv.assignedAgentName && (
                    <p className="text-[11px] text-[#8b5cf6] mt-1 font-semibold">
                      Asignada a: {conv.assignedAgentName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!conv.assignedAgentId && (
                    <button
                      onClick={() => handleAssign(conv.id)}
                      className="px-3 py-1.5 text-[11px] font-bold bg-[#8b5cf6] text-white rounded-lg hover:bg-violet-700 transition-all"
                    >
                      Tomar
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedConvId(conv.id)}
                    className="px-3 py-1.5 text-[11px] font-bold bg-subtle text-ink-light rounded-lg hover:bg-edge transition-all"
                  >
                    Abrir chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupportSection
