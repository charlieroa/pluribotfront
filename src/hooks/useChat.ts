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
}

interface UseChatOptions {
  onDeliverable?: (d: Deliverable) => void
  isAuthenticated?: boolean
  onCreditUpdate?: (balance: number) => void
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('pluribots_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useChat({ onDeliverable, isAuthenticated = false, onCreditUpdate }: UseChatOptions = {}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(isAuthenticated ? initialTasks : [])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [assignedHumanAgent, setAssignedHumanAgent] = useState<{ name: string; role: string; specialty?: string; specialtyColor?: string; avatarUrl?: string } | null>(null)
  const [humanRequested, setHumanRequested] = useState(false)

  // ─── Compose sub-hooks ───
  const msgHook = useChatMessages()
  const { messages, setMessages, streamingText, setStreamingText, streamingAgent, setStreamingAgent,
    showWelcome, setShowWelcome, chatEndRef, latestDeliverableRef, isCoordinating, setIsCoordinating } = msgHook

  const planFlow = usePlanFlow({
    setMessages, setStreamingText, setStreamingAgent, setIsCoordinating,
    latestDeliverableRef, onDeliverable, onCreditUpdate, conversationId,
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
      case 'human_agent_joined':
        setAssignedHumanAgent({ name: data.agentName as string, role: data.agentRole as string, specialty: data.specialty as string, specialtyColor: data.specialtyColor as string, avatarUrl: data.avatarUrl as string })
        planFlow.handleSSEEvent(data)
        return
      case 'human_agent_left':
        setAssignedHumanAgent(null)
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
  }, [setMessages, planFlow])

  const sse = useSSE(handleSSEEvent)
  const { connectSSE, closeSSE } = sse

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) { setConversations([]); return }
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) setConversations(await res.json())
    } catch (err) {
      console.error('[Chat] Fetch conversations error:', err)
    }
  }, [isAuthenticated])
  useEffect(() => { fetchConversations() }, [fetchConversations])

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
    pendingStepApproval: planFlow.pendingStepApproval,
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
      setKanbanTasks([])
      setConversations([])
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
    fetchConversations()
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
      planFlow.setThinkingSteps([])
      planFlow.setInactiveBotPrompt(null)

      const loadedMessages: Message[] = (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id, sender: m.sender, text: m.text, type: m.type,
        botType: m.botType, attachment: m.attachment, approved: m.approved,
      }))
      setMessages(loadedMessages)
      if (data.kanbanTasks) setKanbanTasks(data.kanbanTasks)

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

  const requestHumanAssistance = async () => {
    if (!conversationId) return
    try {
      const token = localStorage.getItem('pluribots_token')
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
    isRefining: planFlow.isRefining,
    refiningAgentName: planFlow.refiningAgentName,
    sendRefineMessage: actions.sendRefineMessage,
    handleAbort: actions.handleAbort,
  }
}
