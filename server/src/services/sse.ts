import type { Response } from 'express'
import type { SSEEvent } from '../../../shared/types.js'

interface SSEConnection {
  res: Response
  userId: string
}

interface BufferedEvent {
  id: number
  event: SSEEvent
  timestamp: number
}

const connections = new Map<string, SSEConnection[]>()

// Event buffer: keeps recent events per conversation so reconnecting clients can catch up
const eventBuffer = new Map<string, BufferedEvent[]>()
let eventIdCounter = 0
const BUFFER_MAX_SIZE = 50
const BUFFER_TTL_MS = 5 * 60 * 1000 // 5 minutes

function bufferEvent(conversationId: string, event: SSEEvent): number {
  const id = ++eventIdCounter
  const buf = eventBuffer.get(conversationId) ?? []
  buf.push({ id, event, timestamp: Date.now() })

  // Prune old events
  const cutoff = Date.now() - BUFFER_TTL_MS
  const pruned = buf.filter(e => e.timestamp > cutoff).slice(-BUFFER_MAX_SIZE)
  eventBuffer.set(conversationId, pruned)
  return id
}

/** Get buffered events after a given event ID */
export function getBufferedEvents(conversationId: string, afterId: number): BufferedEvent[] {
  const buf = eventBuffer.get(conversationId) ?? []
  return buf.filter(e => e.id > afterId)
}

export function addConnection(conversationId: string, res: Response, userId: string, lastEventId?: number): void {
  const existing = connections.get(conversationId) ?? []
  existing.push({ res, userId })
  connections.set(conversationId, existing)

  // Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  // Replay missed events if client sent lastEventId
  if (lastEventId && lastEventId > 0) {
    const missed = getBufferedEvents(conversationId, lastEventId)
    if (missed.length > 0) {
      console.log(`[SSE] Replaying ${missed.length} missed events for ${conversationId}`)
      for (const item of missed) {
        try {
          res.write(`id: ${item.id}\ndata: ${JSON.stringify(item.event)}\n\n`)
        } catch { break }
      }
    }
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 15000) // 15s instead of 30s for more reliable keep-alive

  // Cleanup on close
  res.on('close', () => {
    clearInterval(heartbeat)
    removeConnection(conversationId, res)
  })
}

export function removeConnection(conversationId: string, res: Response): void {
  const existing = connections.get(conversationId)
  if (!existing) return
  const filtered = existing.filter(c => c.res !== res)
  if (filtered.length === 0) {
    connections.delete(conversationId)
  } else {
    connections.set(conversationId, filtered)
  }
}

export function broadcast(conversationId: string, event: SSEEvent): void {
  // Always buffer important events so reconnecting clients can catch up
  const eventId = bufferEvent(conversationId, event)

  const conns = connections.get(conversationId)
  if (!conns || conns.length === 0) {
    if (event.type === 'deliverable' || event.type === 'agent_end') {
      console.warn(`[SSE] ${event.type} buffered (id=${eventId}) for ${conversationId} — 0 connections (will replay on reconnect)`)
    }
    return
  }

  const data = `id: ${eventId}\ndata: ${JSON.stringify(event)}\n\n`

  for (const conn of conns) {
    try {
      conn.res.write(data)
    } catch {
      // Connection broken, will be cleaned up on close
    }
  }
}
