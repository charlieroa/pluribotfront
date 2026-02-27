import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import type { Message, KanbanTask, Deliverable, PlanStep } from '../types'
import { initialTasks } from '../data/initialTasks'

const API_BASE = '/api'

export interface ActiveAgent {
  agentId: string
  agentName: string
  instanceId: string
  task: string
  status: 'working' | 'waiting' | 'done'
}

export interface ThinkingStep {
  agentId: string
  agentName: string
  instanceId?: string
  step: string
  timestamp: number
}

export interface ProposedPlan {
  messageId: string
  text: string
  steps: PlanStep[]
}

export interface StepApproval {
  agentId: string
  agentName: string
  instanceId?: string
  summary: string
  nextAgentId?: string
  nextAgentName?: string
  nextInstanceId?: string
  nextTask?: string
  stepIndex: number
  totalSteps: number
  conversationId: string
}

export interface InactiveBotPrompt {
  botId: string
  botName: string
  stepTask: string
  conversationId: string
}

export interface CoordinationAgent {
  agentId: string
  agentName: string
  task: string
}

export interface ConversationItem {
  id: string
  title: string
  updatedAt: string
  lastMessage?: string
}

export interface LogicProject {
  templateId: string
  description: string
  files: Record<string, string>
}

interface UseChatOptions {
  onDeliverable?: (d: Deliverable) => void
  onLogicProject?: (project: LogicProject) => void
  isAuthenticated?: boolean
  onCreditUpdate?: (balance: number) => void
}

export function useChat({ onDeliverable, onLogicProject, isAuthenticated = false, onCreditUpdate }: UseChatOptions = {}) {
  const [isCoordinating, setIsCoordinating] = useState(false)
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(isAuthenticated ? initialTasks : [])
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingAgent, setStreamingAgent] = useState<string | null>(null)
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([])
  const [proposedPlan, setProposedPlan] = useState<ProposedPlan | null>(null)
  const [pendingStepApproval, setPendingStepApproval] = useState<StepApproval | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [coordinationAgents, setCoordinationAgents] = useState<CoordinationAgent[]>([])
  const [inactiveBotPrompt, setInactiveBotPrompt] = useState<InactiveBotPrompt | null>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [assignedHumanAgent, setAssignedHumanAgent] = useState<{ name: string; role: string; specialty?: string; specialtyColor?: string; avatarUrl?: string } | null>(null)
  const [humanRequested, setHumanRequested] = useState(false)
  const [lastLogicInstanceId, setLastLogicInstanceId] = useState<string | null>(null)
  const latestDeliverableRef = useRef<Deliverable | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const sseReadyRef = useRef(false)

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages, isCoordinating, streamingText])

  // Reset all chat state on logout (isAuthenticated goes false)
  const prevAuthRef = useRef(isAuthenticated)
  useEffect(() => {
    const wasAuth = prevAuthRef.current
    prevAuthRef.current = isAuthenticated
    if (wasAuth && !isAuthenticated) {
      // User logged out — close SSE and clear everything
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      sseReadyRef.current = false
      setConversationId(null)
      setMessages([])
      setShowWelcome(true)
      setInputText('')
      setPendingApproval(null)
      setStreamingText('')
      setStreamingAgent(null)
      setIsCoordinating(false)
      setCoordinationAgents([])
      setActiveAgents([])
      setProposedPlan(null)
      setPendingStepApproval(null)
      setThinkingSteps([])
      setInactiveBotPrompt(null)
      setAssignedHumanAgent(null)
      setHumanRequested(false)
      setCreditsExhausted(false)

      setKanbanTasks([])
      setConversations([])
    }
  }, [isAuthenticated])

  // Fetch conversation list for authenticated users
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) { setConversations([]); return }
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const items: ConversationItem[] = await res.json()
        setConversations(items)
      }
    } catch (err) {
      console.error('[Chat] Fetch conversations error:', err)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const connectSSE = useCallback((convId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      sseReadyRef.current = false
      const token = localStorage.getItem('pluribots_token')
      const url = `${API_BASE}/chat/${convId}/stream${token ? `?token=${token}` : ''}`
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Use instanceId as key when available, fallback to agentId
          const key = data.instanceId || data.agentId

          switch (data.type) {
            case 'connected':
              sseReadyRef.current = true
              resolve()
              break

            case 'agent_thinking':
              setThinkingSteps(prev => [
                ...prev,
                { agentId: data.agentId, agentName: data.agentName, instanceId: data.instanceId, step: data.step, timestamp: Date.now() },
              ])
              break

            case 'agent_start':
              setStreamingAgent(key)
              setStreamingText('')
              // Update activeAgents: set this instance to working
              setActiveAgents(prev => {
                const existing = prev.find(a => a.instanceId === key)
                if (existing) {
                  return prev.map(a => a.instanceId === key ? { ...a, status: 'working' as const, task: data.task || a.task } : a)
                }
                return [...prev, { agentId: data.agentId, agentName: data.agentName, instanceId: key, task: data.task || '', status: 'working' as const }]
              })
              break

            case 'token':
              setStreamingText(prev => prev + data.content)
              break

            case 'agent_end': {
              // Track Logic agent instanceId for auto-fix
              if (data.agentId === 'logic' && data.instanceId) {
                setLastLogicInstanceId(data.instanceId)
              }

              const pendingDeliverable = latestDeliverableRef.current
              latestDeliverableRef.current = null

              const agentName = getAgentDisplayName(data.agentId)
              let msgText = data.fullText
              let attachment: Message['attachment'] = undefined

              if (pendingDeliverable) {
                const htmlIdx = data.fullText.indexOf('```html')
                if (htmlIdx > 0) {
                  msgText = data.fullText.substring(0, htmlIdx).trim()
                } else {
                  msgText = `${agentName} completo su trabajo.`
                }
                attachment = {
                  type: 'preview',
                  title: pendingDeliverable.title,
                  content: 'Ver resultado en el canvas',
                  deliverable: pendingDeliverable,
                }
              }

              setMessages(prev => [...prev, {
                id: data.messageId,
                sender: agentName,
                text: msgText,
                type: 'agent',
                botType: data.agentId,
                attachment,
                model: data.model,
                inputTokens: data.inputTokens,
                outputTokens: data.outputTokens,
                creditsCost: data.creditsCost,
              }])
              setStreamingText('')
              setStreamingAgent(null)
              setThinkingSteps([])
              // Mark instance as done
              setActiveAgents(prev =>
                prev.map(a => a.instanceId === key ? { ...a, status: 'done' as const } : a)
              )
              break
            }

            case 'plan_proposal':
              setPendingApproval(data.messageId)
              setProposedPlan({
                messageId: data.messageId,
                text: data.text,
                steps: data.steps,
              })
              // Set all proposed instances as waiting
              setActiveAgents(data.steps.map((s: PlanStep) => ({
                agentId: s.agentId,
                agentName: s.agentName,
                instanceId: s.instanceId,
                task: s.task,
                status: 'waiting' as const,
              })))
              setMessages(prev => [...prev, {
                id: data.messageId,
                sender: 'Pluria',
                text: data.text,
                type: 'approval',
                botType: 'base',
              }])
              break

            case 'approval_request':
              setPendingApproval(data.messageId)
              setMessages(prev => [...prev, {
                id: data.messageId,
                sender: 'Pluria',
                text: data.text,
                type: 'approval',
                botType: 'base',
              }])
              break

            case 'step_complete':
              setPendingStepApproval({
                agentId: data.agentId,
                agentName: data.agentName,
                instanceId: data.instanceId,
                summary: data.summary,
                nextAgentId: data.nextAgentId,
                nextAgentName: data.nextAgentName,
                nextInstanceId: data.nextInstanceId,
                nextTask: data.nextTask,
                stepIndex: data.stepIndex,
                totalSteps: data.totalSteps,
                conversationId: data.conversationId,
              })
              break

            case 'coordination_start':
              setIsCoordinating(true)
              setCoordinationAgents(data.agents || [])
              break

            case 'coordination_end':
              setIsCoordinating(false)
              setPendingStepApproval(null)
              setThinkingSteps([])
              setCoordinationAgents([])
              break

            case 'logic_project':
              onLogicProject?.({
                templateId: data.templateId,
                description: data.description,
                files: data.files,
              })
              break

            case 'deliverable':
              if (data.deliverable) {
                latestDeliverableRef.current = data.deliverable
                onDeliverable?.(data.deliverable)
              }
              break

            case 'kanban_update':
              if (data.task) {
                setKanbanTasks(prev => {
                  const existing = prev.find(t => t.id === data.task.id)
                  if (existing) {
                    return prev.map(t => t.id === data.task.id ? data.task : t)
                  }
                  return [...prev, data.task]
                })
              }
              break

            case 'human_review_requested':
              setMessages(prev => [...prev, {
                id: `hr-${Date.now()}`,
                sender: 'Sistema',
                text: 'Un agente humano revisará tu caso pronto.',
                type: 'agent',
                botType: 'system',
              }])
              break

            case 'human_agent_joined':
              setAssignedHumanAgent({ name: data.agentName, role: data.agentRole, specialty: data.specialty, specialtyColor: data.specialtyColor, avatarUrl: data.avatarUrl })
              setMessages(prev => [...prev, {
                id: `haj-${Date.now()}`,
                sender: 'Sistema',
                text: `${data.agentName} (${data.agentRole}) se ha unido al chat.`,
                type: 'agent',
                botType: 'system',
              }])
              break

            case 'human_agent_left':
              setAssignedHumanAgent(null)
              break

            case 'human_message':
              setMessages(prev => [...prev, {
                id: data.messageId,
                sender: data.agentName,
                text: data.text,
                type: 'agent',
                botType: 'human',
                specialty: data.specialty,
                specialtyColor: data.specialtyColor,
                avatarUrl: data.avatarUrl,
              }])
              break

            case 'bot_inactive':
              setInactiveBotPrompt({
                botId: data.botId,
                botName: data.botName,
                stepTask: data.stepTask,
                conversationId: data.conversationId,
              })
              break

            case 'credits_exhausted':
              setCreditsExhausted(true)
              setIsCoordinating(false)
              onCreditUpdate?.(data.balance)
              break

            case 'credit_update':
              onCreditUpdate?.(data.balance)
              break

            case 'error':
              console.error('[SSE] Error from server:', data.message)
              setIsCoordinating(false)
              setCoordinationAgents([])
              setStreamingAgent(null)
              setStreamingText('')
              break
          }
        } catch (err) {
          console.error('[SSE] Parse error:', err)
        }
      }

      es.onerror = () => {
        console.warn('[SSE] Connection error, will retry...')
        if (!sseReadyRef.current) {
          setTimeout(resolve, 500)
        }
      }

      // Safety timeout
      setTimeout(() => {
        if (!sseReadyRef.current) {
          sseReadyRef.current = true
          resolve()
        }
      }, 2000)
    })
  }, [onDeliverable, onLogicProject])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const handleAbort = async () => {
    if (!conversationId) return
    try {
      await fetch(`${API_BASE}/chat/abort`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId }),
      })
    } catch (err) {
      console.error('[Chat] Abort error:', err)
    }
    setIsCoordinating(false)
    setCoordinationAgents([])
    setStreamingAgent(null)
    setStreamingText('')
    setThinkingSteps([])
    setActiveAgents(prev => prev.map(a => ({ ...a, status: 'done' as const })))
  }

  const resetChat = () => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    sseReadyRef.current = false
    setMessages([])
    setShowWelcome(true)
    setInputText('')
    setPendingApproval(null)
    setConversationId(null)
    setStreamingText('')
    setStreamingAgent(null)
    setIsCoordinating(false)
    setCoordinationAgents([])
    setActiveAgents([])
    setProposedPlan(null)
    setPendingStepApproval(null)
    setThinkingSteps([])
    setInactiveBotPrompt(null)
    setAssignedHumanAgent(null)
    setHumanRequested(false)
    setCreditsExhausted(false)
    fetchConversations()
  }

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) return

      const data = await res.json()

      // Close existing SSE and reconnect
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      sseReadyRef.current = false

      setConversationId(convId)
      setShowWelcome(false)
      setActiveAgents([])
      setProposedPlan(null)
      setPendingStepApproval(null)
      setPendingApproval(null)
      setStreamingText('')
      // Load assigned human agent
      if (data.assignedAgent) {
        setAssignedHumanAgent({
          name: data.assignedAgent.name,
          role: data.assignedAgent.specialty || (data.assignedAgent.role === 'superadmin' ? 'Supervisor' : data.assignedAgent.role === 'org_admin' ? 'Administrador' : 'Agente'),
          specialty: data.assignedAgent.specialty,
          specialtyColor: data.assignedAgent.specialtyColor,
          avatarUrl: data.assignedAgent.avatarUrl,
        })
      } else {
        setAssignedHumanAgent(null)
      }
      setStreamingAgent(null)
      setThinkingSteps([])
      setInactiveBotPrompt(null)

      // Load messages
      const loadedMessages: Message[] = (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        type: m.type,
        botType: m.botType,
        attachment: m.attachment,
        approved: m.approved,
      }))
      setMessages(loadedMessages)

      // Load kanban tasks
      if (data.kanbanTasks) {
        setKanbanTasks(data.kanbanTasks)
      }

      // Reconnect SSE
      await connectSSE(convId)
    } catch (err) {
      console.error('[Chat] Load conversation error:', err)
    }
  }

  const deleteConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) return

      // If we deleted the current conversation, reset chat
      if (conversationId === convId) {
        resetChat()
      }

      // Remove from local list
      setConversations(prev => prev.filter(c => c.id !== convId))
      // Remove related kanban tasks
      setKanbanTasks(prev => prev.filter(_t => {
        // KanbanTask doesn't have conversationId on the frontend type,
        // so just refresh from the conversations that remain
        return true
      }))
    } catch (err) {
      console.error('[Chat] Delete conversation error:', err)
    }
  }

  const handleActivateBot = async (botId: string) => {
    setInactiveBotPrompt(null)
    // Activate bot via API
    const token = localStorage.getItem('pluribots_token')
    if (!token) return
    try {
      await fetch(`${API_BASE}/user/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bots: [{ botId, isActive: true }] }),
      })
      // Tell server to continue with this bot
      if (conversationId) {
        await fetch(`${API_BASE}/chat/activate-and-continue`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ conversationId, botId }),
        })
      }
    } catch (err) {
      console.error('[Chat] Activate bot error:', err)
    }
  }

  const handleDismissInactiveBot = () => {
    setInactiveBotPrompt(null)
  }

  const finalizeTask = async (taskId: string) => {
    if (!conversationId) return
    try {
      await fetch(`${API_BASE}/conversations/${conversationId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'done' }),
      })
    } catch (err) {
      console.error('[Chat] Finalize task error:', err)
    }
  }

  const requestHumanAssistance = async () => {
    if (!conversationId) return
    try {
      const token = localStorage.getItem('pluribots_token')
      await fetch(`${API_BASE}/chat/${conversationId}/request-human`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      setHumanRequested(true)
      setMessages(prev => [...prev, {
        id: `rh-${Date.now()}`,
        sender: 'Sistema',
        text: 'Has solicitado asistencia humana. Un agente revisará tu caso pronto.',
        type: 'agent',
        botType: 'system',
      }])
    } catch (err) {
      console.error('[Chat] Request human error:', err)
    }
  }

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  // selectedAgents now carries instanceIds
  const handleApprove = async (messageId: string, selectedAgents?: string[]) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, approved: true } : m))
    setPendingApproval(null)
    setProposedPlan(null)

    // Filter activeAgents by selected instanceIds
    if (selectedAgents) {
      setActiveAgents(prev => prev.filter(a => selectedAgents.includes(a.instanceId)))
    }

    try {
      await fetch(`${API_BASE}/chat/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ messageId, approved: true, selectedAgents }),
      })
    } catch (err) {
      console.error('[Chat] Approve error:', err)
    }
  }

  const handleReject = async (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, approved: false } : m))
    setPendingApproval(null)
    setProposedPlan(null)
    setActiveAgents([])

    try {
      await fetch(`${API_BASE}/chat/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ messageId, approved: false }),
      })
    } catch (err) {
      console.error('[Chat] Reject error:', err)
    }
  }

  const handleApproveStep = async (convId: string, approved: boolean) => {
    setPendingStepApproval(null)

    if (!approved) {
      setActiveAgents(prev => prev.map(a => a.status === 'waiting' ? { ...a, status: 'done' as const } : a))
    }

    try {
      await fetch(`${API_BASE}/chat/approve-step`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId: convId, approved }),
      })
    } catch (err) {
      console.error('[Chat] Approve-step error:', err)
    }
  }

  // Refine mode: user can chat with visual agent during step approval
  const isRefineMode = !!(pendingStepApproval && ['brand', 'web', 'social', 'video', 'logic'].includes(pendingStepApproval.agentId))

  const handleSendMessage = async (e: FormEvent, imageFile?: File) => {
    e.preventDefault()
    if (!inputText.trim()) return

    // If in refine mode, route to refine-step endpoint
    if (isRefineMode && pendingStepApproval && conversationId) {
      const msgText = inputText.trim()
      const tempId = `temp-${Date.now()}`

      setMessages(prev => [...prev, { id: tempId, sender: 'Tu', text: msgText, type: 'user' }])
      setInputText('')
      setPendingStepApproval(null) // Hide step card while refining

      try {
        const res = await fetch(`${API_BASE}/chat/refine-step`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ conversationId, text: msgText, instanceId: pendingStepApproval.instanceId }),
        })
        if (res.ok) {
          const data = await res.json()
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.messageId } : m))
        }
      } catch (err) {
        console.error('[Chat] Refine error:', err)
      }
      return
    }

    // Normal flow — block if coordinating or pending approval
    if (isCoordinating || pendingApproval) return

    const msgText = inputText.trim()
    const tempId = `temp-${Date.now()}`

    // Upload image if present
    let uploadedImageUrl: string | undefined
    if (imageFile) {
      try {
        const formData = new FormData()
        formData.append('image', imageFile)
        const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedImageUrl = uploadData.url
        }
      } catch (err) {
        console.error('[Chat] Image upload error:', err)
      }
    }

    const userMsg: Message = { id: tempId, sender: 'Tu', text: msgText, type: 'user', imageUrl: uploadedImageUrl }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setShowWelcome(false)
    setActiveAgents([])

    try {
      let convId = conversationId

      if (!convId) {
        const createRes = await fetch(`${API_BASE}/chat/conversation`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title: msgText.slice(0, 50) }),
        })
        if (!createRes.ok) {
          throw new Error('Error al crear conversacion')
        }
        const createData = await createRes.json()
        convId = createData.conversationId
        setConversationId(convId)

        await connectSSE(convId!)
      }

      const res = await fetch(`${API_BASE}/chat/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId: convId, text: msgText, ...(selectedModel !== 'auto' ? { modelOverride: selectedModel } : {}), ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}) }),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('[Chat] Send error:', error)
        // Reset conversationId so next message creates a fresh conversation
        if (res.status === 404) {
          setConversationId(null)
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          sseReadyRef.current = false
        }
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'Sistema',
          text: error.error || 'Error al enviar mensaje.',
          type: 'agent' as const,
          botType: 'base',
        }])
        return
      }

      const data = await res.json()

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: data.messageId } : m
      ))
      // Refresh conversations list so sidebar shows this chat
      fetchConversations()
    } catch (err) {
      console.error('[Chat] Send error:', err)
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'Sistema',
        text: 'Error al enviar mensaje. Verifica la conexion con el servidor.',
        type: 'agent',
        botType: 'base',
      }])
    }
  }

  // Programmatic refine message (used by auto-fix)
  const sendRefineMessage = async (text: string) => {
    if (!conversationId) return

    // Determine instanceId: from pendingStepApproval, or last Logic agent run
    const instanceId = pendingStepApproval?.instanceId || lastLogicInstanceId

    if (pendingStepApproval) {
      setPendingStepApproval(null) // Hide step card while refining
    }

    try {
      await fetch(`${API_BASE}/chat/refine-step`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId, text, ...(instanceId ? { instanceId } : {}) }),
      })
    } catch (err) {
      console.error('[Chat] Auto-fix refine error:', err)
    }
  }

  return {
    messages,
    inputText,
    setInputText,
    isCoordinating,
    showWelcome,
    kanbanTasks,
    chatEndRef,
    handleSendMessage,
    resetChat,
    handleApprove,
    handleReject,
    handleApproveStep,
    pendingApproval,
    streamingText,
    streamingAgent,
    conversationId,
    activeAgents,
    proposedPlan,
    pendingStepApproval,
    selectedModel,
    setSelectedModel,
    thinkingSteps,
    coordinationAgents,
    isRefineMode,
    inactiveBotPrompt,
    handleActivateBot,
    handleDismissInactiveBot,
    conversations,
    loadConversation,
    deleteConversation,
    assignedHumanAgent,
    finalizeTask,
    requestHumanAssistance,
    humanRequested,
    creditsExhausted,
    sendRefineMessage,
    handleAbort,
  }
}

function getAgentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    seo: 'Lupa',
    brand: 'Nova',
    web: 'Pixel',
    social: 'Spark',
    ads: 'Metric',
    video: 'Reel',
    logic: 'Logic',
    base: 'Pluria',
  }
  return names[agentId] ?? agentId
}
