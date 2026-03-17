import { useState, useEffect, useRef, useCallback } from 'react'
import type { Message, KanbanTask, Deliverable } from '../types'
import { initialTasks } from '../data/initialTasks'
import { useSSE } from './useSSE'
import { useChatMessages } from './useChatMessages'
import { usePlanFlow } from './usePlanFlow'
import { useChatActions } from './useChatActions'

// Re-export all types so external imports from './hooks/useChat' keep working
export type { ActiveAgent, ThinkingStep, ProposedPlan, StepApproval, InactiveBotPrompt, CoordinationAgent } from './usePlanFlow'

const API_BASE = '/api'

export interface ConversationItem {
  id: string
  title: string
  updatedAt: string
  lastMessage?: string
  deliverableCount?: number
  projectId?: string | null
}

export interface ProjectItem {
  id: string
  name: string
  description?: string | null
  status: string
  conversationCount: number
  deliverables: { id: string; title: string; type: string; botType: string; createdAt: string }[]
  updatedAt: string
  createdAt: string
}

interface UseChatOptions {
  onDeliverable?: (d: Deliverable) => void
  onOpenWorkflow?: (prompt: string) => void
  isAuthenticated?: boolean
  onCreditUpdate?: (balance: number) => void
  onProjectCreated?: (project: { id: string; name: string }) => void
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('plury_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useChat({ onDeliverable, onOpenWorkflow, isAuthenticated = false, onCreditUpdate, onProjectCreated }: UseChatOptions = {}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(isAuthenticated ? initialTasks : [])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [assignedHumanAgent, setAssignedHumanAgent] = useState<{ name: string; role: string; specialty?: string; specialtyColor?: string; avatarUrl?: string } | null>(null)
  const [humanRequested, setHumanRequested] = useState(false)

  // ─── Compose sub-hooks ───
  const msgHook = useChatMessages()
  const { messages, setMessages, streamingText, setStreamingText, streamingAgent, setStreamingAgent,
    showWelcome, setShowWelcome, chatEndRef, latestDeliverableRef, isCoordinating, setIsCoordinating } = msgHook

  const planFlow = usePlanFlow({
    setMessages, setStreamingText, setStreamingAgent, setIsCoordinating,
    latestDeliverableRef, onDeliverable, onCreditUpdate,
    onProjectCreated: (project?: { id: string; name: string }) => {
      fetchProjects()
      if (project) onProjectCreated?.(project)
    },
    conversationId,
  })

  // SSE event handler: route kanban + human events here, delegate rest to planFlow
  const handleSSEEvent = useCallback((data: Record<string, unknown>) => {
    switch (data.type) {
      case 'kanban_update':
        if (data.task) {
          setKanbanTasks(prev => {
            const existing = prev.find(t => t.id === (data.task as KanbanTask).id)
            if (existing) return prev.map(t => t.id === (data.task as KanbanTask).id ? data.task as KanbanTask : t)
            return [...prev, data.task as KanbanTask]
          })
        }
        return
      case 'open_workflow':
        console.log('[useChat] open_workflow event received, prompt:', data.prompt, 'hasCallback:', !!onOpenWorkflow)
        if (onOpenWorkflow && data.prompt) {
          onOpenWorkflow(data.prompt as string)
        }
        return
      case 'human_agent_joined':
        setHumanRequested(true)
        setAssignedHumanAgent({ name: data.agentName as string, role: data.agentRole as string, specialty: data.specialty as string, specialtyColor: data.specialtyColor as string, avatarUrl: data.avatarUrl as string })
        planFlow.handleSSEEvent(data)
        return
      case 'human_agent_left':
        setAssignedHumanAgent(null)
        setHumanRequested(false)
        return
      case 'human_review_requested':
        setHumanRequested(true)
        return
      case 'human_message':
        setMessages(prev => [...prev, {
          id: data.messageId as string,
          sender: data.agentName as string,
          text: data.text as string,
          type: 'agent',
          botType: 'human',
          specialty: data.specialty as string,
          specialtyColor: data.specialtyColor as string,
          avatarUrl: data.avatarUrl as string,
        }])
        return
      default:
        planFlow.handleSSEEvent(data)
    }
  }, [setMessages, planFlow, onOpenWorkflow])

  const sse = useSSE(handleSSEEvent)
  const { connectSSE, closeSSE } = sse

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) { setConversations([]); return }
    try {
      const token = localStorage.getItem('plury_token')
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) setConversations(await res.json())
    } catch (err) {
      console.error('[Chat] Fetch conversations error:', err)
    }
  }, [isAuthenticated])
  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) { setProjects([]); return }
    try {
      const token = localStorage.getItem('plury_token')
      const res = await fetch(`${API_BASE}/projects`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) setProjects(await res.json())
    } catch (err) {
      console.error('[Chat] Fetch projects error:', err)
    }
  }, [isAuthenticated])
  useEffect(() => { fetchProjects() }, [fetchProjects])

  // Chat actions
  const actions = useChatActions({
    conversationId, setConversationId, setMessages, setShowWelcome,
    setActiveAgents: planFlow.setActiveAgents, setIsCoordinating,
    setCoordinationAgents: planFlow.setCoordinationAgents,
    setStreamingAgent, setStreamingText,
    setThinkingSteps: planFlow.setThinkingSteps,
    setIsRefining: planFlow.setIsRefining,
    setRefiningAgentName: planFlow.setRefiningAgentName,
    setPendingStepApproval: planFlow.setPendingStepApproval,
    setPendingStepApprovals: planFlow.setPendingStepApprovals,
    pendingStepApproval: planFlow.pendingStepApproval,
    pendingStepApprovals: planFlow.pendingStepApprovals,
    isCoordinating, pendingApproval: planFlow.pendingApproval,
    connectSSE, closeSSE, fetchConversations,
  })

  // Reset on logout
  const prevAuthRef = useRef(isAuthenticated)
  useEffect(() => {
    const wasAuth = prevAuthRef.current
    prevAuthRef.current = isAuthenticated
    if (wasAuth && !isAuthenticated) {
      closeSSE()
      setConversationId(null)
      setMessages([])
      setShowWelcome(true)
      actions.setInputText('')
      planFlow.setPendingApproval(null)
      setStreamingText('')
      setStreamingAgent(null)
      setIsCoordinating(false)
      planFlow.setIsRefining(false)
      planFlow.setRefiningAgentName(null)
      planFlow.setCoordinationAgents([])
      planFlow.setActiveAgents([])
      planFlow.setProposedPlan(null)
      planFlow.setPendingStepApproval(null)
      planFlow.setThinkingSteps([])
      planFlow.setInactiveBotPrompt(null)
      setAssignedHumanAgent(null)
      setHumanRequested(false)
      planFlow.setCreditsExhausted(false)
      planFlow.setQuickReplies([])
      planFlow.setProjectSuggest(null)
      setKanbanTasks([])
      setConversations([])
      setProjects([])
    }
  }, [isAuthenticated])

  const resetChat = () => {
    closeSSE()
    setMessages([])
    setShowWelcome(true)
    actions.setInputText('')
    planFlow.setPendingApproval(null)
    setConversationId(null)
    setStreamingText('')
    setStreamingAgent(null)
    setIsCoordinating(false)
    planFlow.setIsRefining(false)
    planFlow.setRefiningAgentName(null)
    planFlow.setCoordinationAgents([])
    planFlow.setActiveAgents([])
    planFlow.setProposedPlan(null)
    planFlow.setPendingStepApproval(null)
    planFlow.setThinkingSteps([])
    planFlow.setInactiveBotPrompt(null)
    setAssignedHumanAgent(null)
    setHumanRequested(false)
    planFlow.setCreditsExhausted(false)
    planFlow.setQuickReplies([])
    planFlow.setProjectSuggest(null)
    fetchConversations()
    fetchProjects()
  }

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}`, { headers: getAuthHeaders() })
      if (!res.ok) return

      const data = await res.json()
      closeSSE()
      setConversationId(convId)
      setShowWelcome(false)
      planFlow.setActiveAgents([])
      planFlow.setProposedPlan(null)
      planFlow.setPendingStepApproval(null)
      planFlow.setPendingApproval(null)
      setStreamingText('')

      if (data.assignedAgent) {
        setHumanRequested(true)
        setAssignedHumanAgent({
          name: data.assignedAgent.name,
          role: data.assignedAgent.specialty || (data.assignedAgent.role === 'superadmin' ? 'Supervisor' : data.assignedAgent.role === 'org_admin' ? 'Administrador' : 'Agente'),
          specialty: data.assignedAgent.specialty,
          specialtyColor: data.assignedAgent.specialtyColor,
          avatarUrl: data.assignedAgent.avatarUrl,
        })
      } else {
        setAssignedHumanAgent(null)
        setHumanRequested(Boolean(data.needsHumanReview))
      }
      setStreamingAgent(null)
      planFlow.setThinkingSteps([])
      planFlow.setInactiveBotPrompt(null)

      const loadedMessages: Message[] = (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id, sender: m.sender, text: m.text, type: m.type,
        botType: m.botType, attachment: m.attachment, approved: m.approved,
      }))
      setMessages(loadedMessages)
      if (data.kanbanTasks) setKanbanTasks(data.kanbanTasks)

      // Auto-restore last deliverable from done kanban tasks
      if (data.kanbanTasks && onDeliverable) {
        const doneTasks = (data.kanbanTasks as KanbanTask[]).filter(t => t.status === 'done' && t.deliverable)
        if (doneTasks.length > 0) {
          const lastDone = doneTasks[doneTasks.length - 1]
          if (lastDone.deliverable) onDeliverable(lastDone.deliverable)
        }
      }

      // Restore coordination state if a plan is still executing
      if (data.isExecuting && data.executingSteps) {
        const agentNames: Record<string, string> = { seo: 'Lupa', web: 'Pixel', content: 'Pluma', ads: 'Metric', video: 'Reel', dev: 'Code', base: 'Pluria' }
        const steps = data.executingSteps as Array<{ agentId: string; instanceId: string; task: string; completed: boolean }>
        setIsCoordinating(true)
        planFlow.setActiveAgents(steps.map(s => ({
          agentId: s.agentId,
          agentName: agentNames[s.agentId] || s.agentId,
          instanceId: s.instanceId,
          task: s.task,
          status: s.completed ? 'done' as const : 'waiting' as const,
        })))
        planFlow.setCoordinationAgents(steps.map(s => ({
          agentId: s.agentId,
          agentName: agentNames[s.agentId] || s.agentId,
          task: s.task,
        })))
      }

      await connectSSE(convId)
    } catch (err) {
      console.error('[Chat] Load conversation error:', err)
    }
  }

  const deleteConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      })
      if (!res.ok) return
      if (conversationId === convId) resetChat()
      setConversations(prev => prev.filter(c => c.id !== convId))
    } catch (err) {
      console.error('[Chat] Delete conversation error:', err)
    }
  }

  const finalizeTask = async (taskId: string) => {
    if (!conversationId) return
    try {
      await fetch(`${API_BASE}/conversations/${conversationId}/tasks/${taskId}`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'done' }),
      })
    } catch (err) {
      console.error('[Chat] Finalize task error:', err)
    }
  }

  const createProject = async (name: string, convId?: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      })
      if (!res.ok) return null
      const project = await res.json()
      if (convId) {
        await fetch(`${API_BASE}/projects/${project.id}/conversations`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ conversationId: convId }),
        })
      }
      await fetchProjects()
      await fetchConversations()
      planFlow.setProjectSuggest(null)
      return project.id
    } catch (err) {
      console.error('[Chat] Create project error:', err)
      return null
    }
  }

  const addConversationToProject = async (projectId: string, convId: string) => {
    try {
      await fetch(`${API_BASE}/projects/${projectId}/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId: convId }),
      })
      await fetchProjects()
      await fetchConversations()
      planFlow.setProjectSuggest(null)
    } catch (err) {
      console.error('[Chat] Add to project error:', err)
    }
  }

  const requestHumanAssistance = async () => {
    if (!conversationId) return
    try {
      const token = localStorage.getItem('plury_token')
      await fetch(`${API_BASE}/chat/${conversationId}/request-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

  return {
    messages,
    inputText: actions.inputText,
    setInputText: actions.setInputText,
    isCoordinating,
    showWelcome,
    kanbanTasks,
    chatEndRef,
    handleSendMessage: actions.handleSendMessage,
    resetChat,
    handleApprove: planFlow.handleApprove,
    handleReject: planFlow.handleReject,
    handleApproveStep: planFlow.handleApproveStep,
    pendingApproval: planFlow.pendingApproval,
    streamingText,
    streamingAgent,
    conversationId,
    activeAgents: planFlow.activeAgents,
    proposedPlan: planFlow.proposedPlan,
    pendingStepApproval: planFlow.pendingStepApproval,
    selectedModel: actions.selectedModel,
    setSelectedModel: actions.setSelectedModel,
    thinkingSteps: planFlow.thinkingSteps,
    coordinationAgents: planFlow.coordinationAgents,
    isRefineMode: actions.isRefineMode,
    inactiveBotPrompt: planFlow.inactiveBotPrompt,
    handleActivateBot: planFlow.handleActivateBot,
    handleDismissInactiveBot: planFlow.handleDismissInactiveBot,
    conversations,
    loadConversation,
    deleteConversation,
    assignedHumanAgent,
    finalizeTask,
    requestHumanAssistance,
    humanRequested,
    creditsExhausted: planFlow.creditsExhausted,
    completionFlash: planFlow.completionFlash,
    isRefining: planFlow.isRefining,
    refiningAgentName: planFlow.refiningAgentName,
    sendRefineMessage: actions.sendRefineMessage,
    handleAbort: actions.handleAbort,
    quickReplies: planFlow.quickReplies,
    projectSuggest: planFlow.projectSuggest,
    dismissProjectSuggest: () => planFlow.setProjectSuggest(null),
    projects,
    createProject,
    addConversationToProject,
    addSystemMessage: (text: string) => {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        sender: 'Places',
        text,
        type: 'agent' as const,
        botType: 'video',
      }])
    },
  }
}
