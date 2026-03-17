import type { Response } from 'express'
import type { ProjectAppEventWire } from '../../../shared/types.js'

interface AppEventConnection {
  res: Response
  userId: string
}

const connections = new Map<string, AppEventConnection[]>()

export function addAppEventConnection(projectAppId: string, res: Response, userId: string): void {
  const existing = connections.get(projectAppId) ?? []
  existing.push({ res, userId })
  connections.set(projectAppId, existing)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 15000)

  res.on('close', () => {
    clearInterval(heartbeat)
    removeAppEventConnection(projectAppId, res)
  })
}

export function removeAppEventConnection(projectAppId: string, res: Response): void {
  const existing = connections.get(projectAppId)
  if (!existing) return

  const filtered = existing.filter(connection => connection.res !== res)
  if (filtered.length === 0) {
    connections.delete(projectAppId)
  } else {
    connections.set(projectAppId, filtered)
  }
}

export function broadcastAppEvent(projectAppId: string, event: ProjectAppEventWire): void {
  const conns = connections.get(projectAppId)
  if (!conns || conns.length === 0) return

  const data = `data: ${JSON.stringify({ type: 'project_app_event', event })}\n\n`
  for (const conn of conns) {
    try {
      conn.res.write(data)
    } catch {
      // broken connection; cleanup happens on close
    }
  }
}
