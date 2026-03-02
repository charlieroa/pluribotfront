import { useState, useRef, useEffect } from 'react'
import type { Message, Deliverable } from '../types'

export interface UseChatMessagesReturn {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  streamingText: string
  setStreamingText: React.Dispatch<React.SetStateAction<string>>
  streamingAgent: string | null
  setStreamingAgent: React.Dispatch<React.SetStateAction<string | null>>
  showWelcome: boolean
  setShowWelcome: React.Dispatch<React.SetStateAction<boolean>>
  chatEndRef: React.RefObject<HTMLDivElement>
  latestDeliverableRef: React.MutableRefObject<Deliverable | null>
  isCoordinating: boolean
  setIsCoordinating: React.Dispatch<React.SetStateAction<boolean>>
}

export function useChatMessages(): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [streamingAgent, setStreamingAgent] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [isCoordinating, setIsCoordinating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const latestDeliverableRef = useRef<Deliverable | null>(null)

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages, isCoordinating, streamingText])

  return {
    messages, setMessages,
    streamingText, setStreamingText,
    streamingAgent, setStreamingAgent,
    showWelcome, setShowWelcome,
    chatEndRef,
    latestDeliverableRef,
    isCoordinating, setIsCoordinating,
  }
}
