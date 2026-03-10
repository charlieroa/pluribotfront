import { useRef, useEffect, useCallback } from 'react'

const API_BASE = '/api'

export interface UseSSEReturn {
  connectSSE: (convId: string) => Promise<void>
  closeSSE: () => void
  eventSourceRef: React.MutableRefObject<EventSource | null>
  sseReadyRef: React.MutableRefObject<boolean>
  sseConvIdRef: React.MutableRefObject<string | null>
}

export function useSSE(onEvent: (data: Record<string, unknown>) => void): UseSSEReturn {
  const eventSourceRef = useRef<EventSource | null>(null)
  const sseReadyRef = useRef(false)
  const sseRetryCountRef = useRef(0)
  const sseConvIdRef = useRef<string | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connectSSE = useCallback((convId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      sseReadyRef.current = false
      sseConvIdRef.current = convId
      const token = localStorage.getItem('plury_token')
      const url = `${API_BASE}/chat/${convId}/stream${token ? `?token=${token}` : ''}`
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'connected') {
            sseReadyRef.current = true
            sseRetryCountRef.current = 0
            resolve()
            return
          }
          onEventRef.current(data)
        } catch (err) {
          console.error('[SSE] Parse error:', err)
        }
      }

      es.onerror = () => {
        console.warn('[SSE] Connection error')
        if (!sseReadyRef.current) {
          setTimeout(resolve, 500)
          return
        }
        const retries = sseRetryCountRef.current
        if (retries >= 5) {
          console.error('[SSE] Max retries reached, giving up')
          onEventRef.current({ type: 'sse_max_retries' })
          return
        }
        const delay = Math.min(1000 * Math.pow(2, retries), 16000)
        sseRetryCountRef.current = retries + 1
        console.warn(`[SSE] Reconnecting in ${delay}ms (attempt ${retries + 1}/5)`)
        es.close()
        eventSourceRef.current = null
        setTimeout(() => {
          const id = sseConvIdRef.current
          if (id) connectSSE(id)
        }, delay)
      }

      // Safety timeout for initial connection
      setTimeout(() => {
        if (!sseReadyRef.current) {
          sseReadyRef.current = true
          resolve()
        }
      }, 2000)
    })
  }, [])

  const closeSSE = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    sseReadyRef.current = false
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  return { connectSSE, closeSSE, eventSourceRef, sseReadyRef, sseConvIdRef }
}
