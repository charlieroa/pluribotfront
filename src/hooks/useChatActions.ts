import { useState, useCallback, useEffect, type FormEvent } from 'react'
import type { Message } from '../types'
import type { StepApproval } from './usePlanFlow'

const API_BASE = '/api'

function playCancelChime() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.3)
    setTimeout(() => ctx.close(), 500)
  } catch { /* Audio not supported */ }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('plury_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface ChatActionsDeps {
  conversationId: string | null
  setConversationId: (id: string | null) => void
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
  setPendingStepApprovals: React.Dispatch<React.SetStateAction<StepApproval[]>>
  pendingStepApproval: StepApproval | null
  pendingStepApprovals: StepApproval[]
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
  selectedImageModel: string
  setSelectedImageModel: React.Dispatch<React.SetStateAction<string>>
  referenceImageUrl: string | null
  setReferenceImageUrl: (url: string | null) => void
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
    setIsRefining, setRefiningAgentName, setPendingStepApproval, setPendingStepApprovals,
    pendingStepApproval, pendingStepApprovals, isCoordinating, pendingApproval,
    connectSSE, closeSSE, fetchConversations,
  } = deps

  const [inputText, setInputText] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [selectedImageModel, setSelectedImageModel] = useState<string>('auto')
  const [referenceImageUrl, setReferenceImageUrlState] = useState<string | null>(null)
  const setReferenceImageUrl = useCallback((url: string | null) => {
    setReferenceImageUrlState(url);
    (window as any).__pluryRefImage = url
  }, [])
  // Sync on mount
  useEffect(() => { (window as any).__pluryRefImage = referenceImageUrl }, [])

  const isRefineMode = !!(pendingStepApproval && ['web', 'brand', 'video', 'dev'].includes(pendingStepApproval.agentId))

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
    playCancelChime()
    setIsCoordinating(false)
    setCoordinationAgents([])
    setStreamingAgent(null)
    setStreamingText('')
    setThinkingSteps([])
    setActiveAgents(prev => prev.map(a => ({ ...a, status: 'done' as const })))
  }, [conversationId, setIsCoordinating, setCoordinationAgents, setStreamingAgent, setStreamingText, setThinkingSteps, setActiveAgents])

  const handleSendMessage = useCallback(async (e: FormEvent, imageFile?: File) => {
    e.preventDefault()
    const refUrl: string | null = (window as any).__pluryRefImage || null
    if (!inputText.trim() && !refUrl && !imageFile) return

    // Refine mode
    if (isRefineMode && pendingStepApproval && conversationId) {
      const msgText = inputText.trim()
      const tempId = `temp-${Date.now()}`
      setMessages(prev => [...prev, { id: tempId, sender: 'Tu', text: msgText, type: 'user' }])
      setInputText('')

      // If multiple projects, try to match the user's message to the right one
      let targetApproval = pendingStepApproval
      if (pendingStepApprovals.length > 1) {
        const lower = msgText.toLowerCase()
        const match = pendingStepApprovals.find(a =>
          (a.instanceId && lower.includes(a.instanceId.replace('dev-', 'proyecto ')))
          || (a.summary && a.summary.toLowerCase().split(' ').some(w => w.length > 4 && lower.includes(w)))
        )
        if (match) targetApproval = match
      }

      setIsRefining(true)
      setRefiningAgentName(targetApproval.agentName)
      setThinkingSteps([])
      setActiveAgents([])
      setStreamingText('')
      setStreamingAgent(null)
      // Remove the refined approval from the list, keep others
      setPendingStepApprovals(prev => prev.filter(a => a.instanceId !== targetApproval.instanceId))
      // Set the next available approval as active, or null
      setPendingStepApproval(() => {
        const remaining = pendingStepApprovals.filter(a => a.instanceId !== targetApproval.instanceId)
        return remaining.length > 0 ? remaining[remaining.length - 1] : null
      })
      try {
        // Include selected logo info if available
        const logoInfo = (window as any).__selectedLogoForRefine
        const imageInfo = (window as any).__selectedImageForRefine
        const refineBody: Record<string, unknown> = { conversationId, text: msgText, instanceId: targetApproval.instanceId }
        if (logoInfo) {
          refineBody.selectedLogoIndex = logoInfo.index
          refineBody.selectedLogoSrc = logoInfo.src
        }
        if (imageInfo?.src) {
          refineBody.selectedImageSrc = imageInfo.src
        }

        const res = await fetch(`${API_BASE}/chat/refine-step`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(refineBody),
        })
        if (res.ok) {
          const data = await res.json()
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.messageId } : m))
          ;(window as any).__selectedImageForRefine = null
        }
      } catch (err) {
        console.error('[Chat] Refine error:', err)
      }
      return
    }

    // Normal flow
    if (isCoordinating || pendingApproval) return

    const rawText = inputText.trim()
    const msgText = rawText || (refUrl ? 'Genera 3 variaciones usando esta imagen como referencia' : '')
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

    const userMsg: Message = { id: tempId, sender: 'Tu', text: msgText, type: 'user', imageUrl: uploadedImageUrl || refUrl || undefined }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setReferenceImageUrl(null)
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
        body: JSON.stringify({ conversationId: convId, text: msgText + (refUrl ? `\n\n[Imagen de referencia: ${refUrl}]` : '') + (selectedImageModel !== 'auto' ? `\n\n[IMAGE_MODEL: ${selectedImageModel}]` : ''), ...(selectedModel !== 'auto' ? { modelOverride: selectedModel } : {}), ...(uploadedImageUrl || refUrl ? { imageUrl: uploadedImageUrl || refUrl } : {}) }),
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
  }, [inputText, isRefineMode, pendingStepApproval, conversationId, isCoordinating, pendingApproval, selectedModel, selectedImageModel, referenceImageUrl, setMessages, setInputText, setShowWelcome, setActiveAgents, setIsRefining, setRefiningAgentName, setPendingStepApproval, setConversationId, connectSSE, closeSSE, fetchConversations])

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
    selectedImageModel, setSelectedImageModel,
    referenceImageUrl, setReferenceImageUrl,
    handleSendMessage,
    handleAbort,
    sendRefineMessage,
    isRefineMode,
  }
}
