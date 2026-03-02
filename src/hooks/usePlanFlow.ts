import { useState } from 'react'
import type { Message, Deliverable, PlanStep } from '../types'

const API_BASE = '/api'

export interface ActiveAgent {
  agentId: string
  agentName: string
  instanceId: string
  task: string
  status: 'working' | 'waiting' | 'done'
  model?: string
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

interface PlanFlowDeps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setStreamingText: React.Dispatch<React.SetStateAction<string>>
  setStreamingAgent: React.Dispatch<React.SetStateAction<string | null>>
  setIsCoordinating: React.Dispatch<React.SetStateAction<boolean>>
  latestDeliverableRef: React.MutableRefObject<Deliverable | null>
  onDeliverable?: (d: Deliverable) => void
  onCreditUpdate?: (balance: number) => void
  conversationId: string | null
}

export interface UsePlanFlowReturn {
  pendingApproval: string | null
  setPendingApproval: React.Dispatch<React.SetStateAction<string | null>>
  proposedPlan: ProposedPlan | null
  setProposedPlan: React.Dispatch<React.SetStateAction<ProposedPlan | null>>
  pendingStepApproval: StepApproval | null
  setPendingStepApproval: React.Dispatch<React.SetStateAction<StepApproval | null>>
  activeAgents: ActiveAgent[]
  setActiveAgents: React.Dispatch<React.SetStateAction<ActiveAgent[]>>
  coordinationAgents: CoordinationAgent[]
  setCoordinationAgents: React.Dispatch<React.SetStateAction<CoordinationAgent[]>>
  thinkingSteps: ThinkingStep[]
  setThinkingSteps: React.Dispatch<React.SetStateAction<ThinkingStep[]>>
  isRefining: boolean
  setIsRefining: React.Dispatch<React.SetStateAction<boolean>>
  refiningAgentName: string | null
  setRefiningAgentName: React.Dispatch<React.SetStateAction<string | null>>
  inactiveBotPrompt: InactiveBotPrompt | null
  setInactiveBotPrompt: React.Dispatch<React.SetStateAction<InactiveBotPrompt | null>>
  creditsExhausted: boolean
  setCreditsExhausted: React.Dispatch<React.SetStateAction<boolean>>
  handleApprove: (messageId: string, selectedAgents?: string[]) => Promise<void>
  handleReject: (messageId: string) => Promise<void>
  handleApproveStep: (convId: string, approved: boolean) => Promise<void>
  handleActivateBot: (botId: string) => Promise<void>
  handleDismissInactiveBot: () => void
  handleSSEEvent: (data: Record<string, unknown>) => void
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('pluribots_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getAgentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    seo: 'Lupa', web: 'Pixel', ads: 'Metric', video: 'Reel', base: 'Pluria',
  }
  return names[agentId] ?? agentId
}

export function usePlanFlow(deps: PlanFlowDeps): UsePlanFlowReturn {
  const { setMessages, setStreamingText, setStreamingAgent, setIsCoordinating, latestDeliverableRef, onDeliverable, onCreditUpdate, conversationId } = deps

  const [pendingApproval, setPendingApproval] = useState<string | null>(null)
  const [proposedPlan, setProposedPlan] = useState<ProposedPlan | null>(null)
  const [pendingStepApproval, setPendingStepApproval] = useState<StepApproval | null>(null)
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([])
  const [coordinationAgents, setCoordinationAgents] = useState<CoordinationAgent[]>([])
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [isRefining, setIsRefining] = useState(false)
  const [refiningAgentName, setRefiningAgentName] = useState<string | null>(null)
  const [inactiveBotPrompt, setInactiveBotPrompt] = useState<InactiveBotPrompt | null>(null)
  const [creditsExhausted, setCreditsExhausted] = useState(false)

  const handleSSEEvent = (data: Record<string, unknown>) => {
    const key = (data.instanceId || data.agentId) as string

    switch (data.type) {
      case 'agent_thinking':
        setThinkingSteps(prev => [
          ...prev,
          { agentId: data.agentId as string, agentName: data.agentName as string, instanceId: data.instanceId as string, step: data.step as string, timestamp: Date.now() },
        ])
        break

      case 'agent_start':
        setStreamingAgent(key)
        setStreamingText('')
        setActiveAgents(prev => {
          const existing = prev.find(a => a.instanceId === key)
          if (existing) {
            return prev.map(a => a.instanceId === key ? { ...a, status: 'working' as const, task: (data.task as string) || a.task, model: data.model as string } : a)
          }
          return [...prev, { agentId: data.agentId as string, agentName: data.agentName as string, instanceId: key, task: (data.task as string) || '', status: 'working' as const, model: data.model as string }]
        })
        break

      case 'token':
        setStreamingText(prev => prev + (data.content as string))
        break

      case 'agent_end': {
        const pendingDeliverable = latestDeliverableRef.current
        latestDeliverableRef.current = null

        const agentName = getAgentDisplayName(data.agentId as string)
        let msgText = data.fullText as string
        let attachment: Message['attachment'] = undefined

        if (pendingDeliverable) {
          const htmlIdx = (data.fullText as string).indexOf('```html')
          if (htmlIdx > 0) {
            msgText = (data.fullText as string).substring(0, htmlIdx).trim()
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
          id: data.messageId as string,
          sender: agentName,
          text: msgText,
          type: 'agent',
          botType: data.agentId as string,
          attachment,
          model: data.model as string,
          inputTokens: data.inputTokens as number,
          outputTokens: data.outputTokens as number,
          creditsCost: data.creditsCost as number,
        }])
        setStreamingText('')
        setStreamingAgent(null)
        setThinkingSteps([])
        setIsRefining(false)
        setRefiningAgentName(null)
        setActiveAgents(prev =>
          prev.map(a => a.instanceId === key ? { ...a, status: 'done' as const } : a)
        )
        break
      }

      case 'plan_proposal':
        setPendingApproval(data.messageId as string)
        setProposedPlan({
          messageId: data.messageId as string,
          text: data.text as string,
          steps: data.steps as PlanStep[],
        })
        setActiveAgents((data.steps as PlanStep[]).map((s) => ({
          agentId: s.agentId,
          agentName: s.agentName,
          instanceId: s.instanceId,
          task: s.task,
          status: 'waiting' as const,
        })))
        setMessages(prev => [...prev, {
          id: data.messageId as string,
          sender: 'Pluria',
          text: data.text as string,
          type: 'approval',
          botType: 'base',
        }])
        break

      case 'approval_request':
        setPendingApproval(data.messageId as string)
        setMessages(prev => [...prev, {
          id: data.messageId as string,
          sender: 'Pluria',
          text: data.text as string,
          type: 'approval',
          botType: 'base',
        }])
        break

      case 'step_complete':
        setIsRefining(false)
        setRefiningAgentName(null)
        setPendingStepApproval({
          agentId: data.agentId as string,
          agentName: data.agentName as string,
          instanceId: data.instanceId as string,
          summary: data.summary as string,
          nextAgentId: data.nextAgentId as string | undefined,
          nextAgentName: data.nextAgentName as string | undefined,
          nextInstanceId: data.nextInstanceId as string | undefined,
          nextTask: data.nextTask as string | undefined,
          stepIndex: data.stepIndex as number,
          totalSteps: data.totalSteps as number,
          conversationId: data.conversationId as string,
        })
        break

      case 'coordination_start':
        setIsCoordinating(true)
        setCoordinationAgents((data.agents as CoordinationAgent[]) || [])
        break

      case 'coordination_end':
        setIsCoordinating(false)
        setIsRefining(false)
        setRefiningAgentName(null)
        setPendingStepApproval(null)
        setThinkingSteps([])
        setCoordinationAgents([])
        break

      case 'deliverable':
        if (data.deliverable) {
          latestDeliverableRef.current = data.deliverable as Deliverable
          onDeliverable?.(data.deliverable as Deliverable)
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
        setMessages(prev => [...prev, {
          id: `haj-${Date.now()}`,
          sender: 'Sistema',
          text: `${data.agentName} (${data.agentRole}) se ha unido al chat.`,
          type: 'agent',
          botType: 'system',
        }])
        break

      case 'bot_inactive':
        setInactiveBotPrompt({
          botId: data.botId as string,
          botName: data.botName as string,
          stepTask: data.stepTask as string,
          conversationId: data.conversationId as string,
        })
        break

      case 'credits_exhausted':
        setCreditsExhausted(true)
        setIsCoordinating(false)
        onCreditUpdate?.(data.balance as number)
        break

      case 'credit_update':
        onCreditUpdate?.(data.balance as number)
        break

      case 'error':
        console.error('[SSE] Error from server:', data.message)
        setIsCoordinating(false)
        setIsRefining(false)
        setRefiningAgentName(null)
        setCoordinationAgents([])
        setStreamingAgent(null)
        setStreamingText('')
        break

      case 'sse_max_retries':
        setMessages(prev => [...prev, {
          id: `sse-err-${Date.now()}`,
          sender: 'Sistema',
          text: 'Se perdio la conexion con el servidor. Recarga la pagina para continuar.',
          type: 'agent',
          botType: 'base',
        }])
        setIsCoordinating(false)
        setStreamingAgent(null)
        setStreamingText('')
        break
    }
  }

  const handleApprove = async (messageId: string, selectedAgents?: string[]) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, approved: true } : m))
    setPendingApproval(null)
    setProposedPlan(null)
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

  const handleActivateBot = async (botId: string) => {
    setInactiveBotPrompt(null)
    const token = localStorage.getItem('pluribots_token')
    if (!token) return
    try {
      await fetch(`${API_BASE}/user/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bots: [{ botId, isActive: true }] }),
      })
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

  return {
    pendingApproval, setPendingApproval,
    proposedPlan, setProposedPlan,
    pendingStepApproval, setPendingStepApproval,
    activeAgents, setActiveAgents,
    coordinationAgents, setCoordinationAgents,
    thinkingSteps, setThinkingSteps,
    isRefining, setIsRefining,
    refiningAgentName, setRefiningAgentName,
    inactiveBotPrompt, setInactiveBotPrompt,
    creditsExhausted, setCreditsExhausted,
    handleApprove,
    handleReject,
    handleApproveStep,
    handleActivateBot,
    handleDismissInactiveBot,
    handleSSEEvent,
  }
}
