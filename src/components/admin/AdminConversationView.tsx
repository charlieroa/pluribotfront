import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, CheckCircle, UserCircle } from 'lucide-react'

interface ConversationMessage {
  id: string
  sender: string
  text: string
  type: string
  botType?: string
  createdAt: string
}

interface ConversationTask {
  id: string
  title: string
  agent: string
  status: string
  botType: string
}

interface ConversationDetail {
  id: string
  title: string
  needsHumanReview: boolean
  user: { id: string; name: string; email: string }
  assignedAgent: { id: string; name: string } | null
  messages: ConversationMessage[]
  kanbanTasks: ConversationTask[]
}

interface Props {
  conversationId: string
  onBack: () => void
  onResolve: () => void
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
  base: '#2563eb',
  system: '#6b7280',
  human: '#8b5cf6',
}

const agentNames: Record<string, string> = {
  seo: 'Lupa',
  web: 'Pixel',
  ads: 'Metric',
  dev: 'Logic',
  video: 'Reel',
  base: 'Pluria',
  system: 'Sistema',
}

const AdminConversationView = ({ conversationId, onBack, onResolve }: Props) => {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchConversation = async () => {
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) setConversation(await res.json())
    } catch (err) {
      console.error('[Admin] Fetch conversation error:', err)
    }
  }

  useEffect(() => { fetchConversation() }, [conversationId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conversation?.messages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}/message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: messageText.trim() }),
      })
      if (res.ok) {
        setMessageText('')
        fetchConversation()
      }
    } catch (err) {
      console.error('[Admin] Send message error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleUpdateTask = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      })
      fetchConversation()
    } catch (err) {
      console.error('[Admin] Update task error:', err)
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-page">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const tasksByStatus = {
    todo: conversation.kanbanTasks.filter(t => t.status === 'todo'),
    doing: conversation.kanbanTasks.filter(t => t.status === 'doing'),
    done: conversation.kanbanTasks.filter(t => t.status === 'done'),
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-page">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge bg-surface flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-subtle rounded-lg transition-all">
            <ArrowLeft size={18} className="text-ink-faint" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-ink">{conversation.title}</h3>
            <p className="text-[11px] text-ink-faint">
              {conversation.user.name} — {conversation.user.email}
              {conversation.assignedAgent && (
                <span className="ml-2 text-amber-600">Asignado a: {conversation.assignedAgent.name}</span>
              )}
            </p>
          </div>
        </div>
        {conversation.needsHumanReview && (
          <button
            onClick={onResolve}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all"
          >
            <CheckCircle size={14} />
            Marcar como resuelta
          </button>
        )}
      </div>

      {/* Main content: Chat + Kanban */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat section */}
        <div className="flex-1 flex flex-col border-r border-edge min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {conversation.messages.map(m => {
              const isUser = m.type === 'user'
              const isHumanAgent = m.sender === 'human_agent'
              const botColor = agentColors[m.botType || 'base'] || '#6b7280'

              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                  {!isUser && (
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: isHumanAgent ? '#8b5cf6' : botColor }}
                    >
                      {isHumanAgent ? <UserCircle size={16} /> : (agentNames[m.botType || ''] || m.sender).charAt(0)}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${isUser ? 'bg-primary text-primary-fg' : 'bg-surface border border-edge'} p-3 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[11px] font-bold" style={{ color: isHumanAgent ? '#8b5cf6' : botColor }}>
                          {isHumanAgent ? 'Agente Humano' : agentNames[m.botType || ''] || m.sender}
                        </p>
                        {isHumanAgent && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-violet-500/10 text-violet-600 rounded-full">
                            Agente Humano
                          </span>
                        )}
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed ${isUser ? '' : 'text-ink'}`}>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${isUser ? 'text-white/60' : 'text-ink-faint'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Message input */}
          <div className="p-4 border-t border-edge bg-surface">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Escribe un mensaje como agente humano..."
                className="flex-1 px-4 py-2.5 text-sm bg-page border border-edge rounded-xl focus:outline-none focus:border-primary text-ink placeholder:text-ink-faint"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sending}
                className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm font-semibold"
              >
                <Send size={14} />
                Enviar
              </button>
            </div>
          </div>
        </div>

        {/* Kanban section */}
        <div className="w-[380px] flex flex-col bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-edge">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wide">Kanban</h4>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {(['todo', 'doing', 'done'] as const).map(status => {
              const label = status === 'todo' ? 'Backlog' : status === 'doing' ? 'En Proceso' : 'Completado'
              const color = status === 'todo' ? 'text-slate-500' : status === 'doing' ? 'text-amber-500' : 'text-emerald-500'
              const tasks = tasksByStatus[status]
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${color}`}>{label}</span>
                    <span className="text-[10px] text-ink-faint bg-subtle px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-[11px] text-ink-faint italic py-2">Sin tareas</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tasks.map(task => (
                        <div key={task.id} className="bg-page border border-edge rounded-lg p-2.5 group">
                          <p className="text-xs font-semibold text-ink mb-1">{task.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-ink-faint">{task.agent}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {status !== 'todo' && (
                                <button
                                  onClick={() => handleUpdateTask(task.id, status === 'doing' ? 'todo' : 'doing')}
                                  className="px-1.5 py-0.5 text-[9px] font-bold bg-subtle hover:bg-edge rounded transition-all"
                                >
                                  {status === 'doing' ? 'Backlog' : 'En Proceso'}
                                </button>
                              )}
                              {status !== 'done' && (
                                <button
                                  onClick={() => handleUpdateTask(task.id, status === 'todo' ? 'doing' : 'done')}
                                  className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded transition-all"
                                >
                                  {status === 'todo' ? 'En Proceso' : 'Completar'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminConversationView
