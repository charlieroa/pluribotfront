import { useState, useCallback, type FormEvent } from 'react'
import type { Message } from '../types'
import type { StepApproval } from './usePlanFlow'

const API_BASE = '/api'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('pluribots_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface ChatActionsDeps {
  conversationId: string | null
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setShowWelcome: React.Dispatch<React.SetStateAction<boolean>>
  setActiveAgents: React.Dispatch<React.SetStateAction<{ agentId: string; agentName: string; instanceId: string; task: string; status: 'working' | 'waiting' | 'done'; model?: string }[]>>
  setIsCoordinating: React.Dispatch<React.SetStateAction<boolean>>
  setCoordinationAgents: React.Dispatch<React.SetStateAction<{ agentId: string; agentName: string; task: string }[]>>
  setStreamingAgent: React.Dispatch<React.SetStateAction<string | null>>
  setStreamingText: React.Dispatch<React.SetStateAction<string>>
  setThinkingSteps: React.Dispatch<React.SetStateAction<{ agentId: string; agentName: string; instanceId?: string; step: string; timestamp: number }[]>>
  setIsRefining: React.Dispatch<React.SetStateAction<boolean>>
  setRefiningAgentName: React.Dispatch<React.SetStateAction<string | null>>
  setPendingStepApproval: React.Dispatch<React.SetStateAction<StepApproval | null>>
  pendingStepApproval: StepApproval | null
  isCoordinating: boolean
  pendingApproval: string | null
  connectSSE: (convId: string) => Promise<void>
  closeSSE: () => void
  fetchConversations: () => Promise<void>
}

export interface UseChatActionsReturn {
  inputText: string
  setInputText: React.Dispatch<React.SetStateAction<string>>
  selectedModel: string
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>
  handleSendMessage: (e: FormEvent, imageFile?: File) => Promise<void>
  handleAbort: () => Promise<void>
  sendRefineMessage: (text: string) => Promise<void>
  isRefineMode: boolean
}

export function useChatActions(deps: ChatActionsDeps): UseChatActionsReturn {
  const {
    conversationId, setConversationId, setMessages, setShowWelcome,
    setActiveAgents, setIsCoordinating, setCoordinationAgents,
    setStreamingAgent, setStreamingText, setThinkingSteps,
    setIsRefining, setRefiningAgentName, setPendingStepApproval,
    pendingStepApproval, isCoordinating, pendingApproval,
    connectSSE, closeSSE, fetchConversations,
  } = deps

  const [inputText, setInputText] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('auto')

  const isRefineMode = !!(pendingStepApproval && ['web', 'video'].includes(pendingStepApproval.agentId))

  const handleAbort = useCallback(async () => {
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
  }, [conversationId, setIsCoordinating, setCoordinationAgents, setStreamingAgent, setStreamingText, setThinkingSteps, setActiveAgents])

  const handleSendMessage = useCallback(async (e: FormEvent, imageFile?: File) => {
    e.preventDefault()
    if (!inputText.trim()) return

    // Refine mode
    if (isRefineMode && pendingStepApproval && conversationId) {
      const msgText = inputText.trim()
      const tempId = `temp-${Date.now()}`
      setMessages(prev => [...prev, { id: tempId, sender: 'Tu', text: msgText, type: 'user' }])
      setInputText('')
      setIsRefining(true)
      setRefiningAgentName(pendingStepApproval.agentName)
      setPendingStepApproval(null)
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

    // Normal flow
    if (isCoordinating || pendingApproval) return

    const msgText = inputText.trim()
    const tempId = `temp-${Date.now()}`

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
        if (!createRes.ok) throw new Error('Error al crear conversacion')
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
        if (res.status === 404) {
          setConversationId(null)
          closeSSE()
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
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.messageId } : m))
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
  }, [inputText, isRefineMode, pendingStepApproval, conversationId, isCoordinating, pendingApproval, selectedModel, setMessages, setInputText, setShowWelcome, setActiveAgents, setIsRefining, setRefiningAgentName, setPendingStepApproval, setConversationId, connectSSE, closeSSE, fetchConversations])

  const sendRefineMessage = useCallback(async (text: string) => {
    if (!conversationId) return
    const instanceId = pendingStepApproval?.instanceId
    setIsRefining(true)
    setRefiningAgentName(pendingStepApproval?.agentName || 'Pixel')
    if (pendingStepApproval) setPendingStepApproval(null)
    try {
      await fetch(`${API_BASE}/chat/refine-step`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId, text, ...(instanceId ? { instanceId } : {}) }),
      })
    } catch (err) {
      console.error('[Chat] Auto-fix refine error:', err)
    }
  }, [conversationId, pendingStepApproval, setIsRefining, setRefiningAgentName, setPendingStepApproval])

  return {
    inputText, setInputText,
    selectedModel, setSelectedModel,
    handleSendMessage,
    handleAbort,
    sendRefineMessage,
    isRefineMode,
  }
}
