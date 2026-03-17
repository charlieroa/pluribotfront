import { randomUUID } from 'crypto'
import { prisma } from '../db/client.js'
import { broadcastAppEvent } from './app-events-sse.js'

export interface ProjectAppEventRecord {
  id: string
  projectAppId: string
  channelKey: string
  eventKey: string
  direction: string
  payloadJson: string
  source: string
  createdAt: Date
}

export async function listProjectAppEvents(projectAppId: string, limit: number): Promise<ProjectAppEventRecord[]> {
  return prisma.$queryRawUnsafe<ProjectAppEventRecord[]>(
    'SELECT "id", "projectAppId", "channelKey", "eventKey", "direction", "payloadJson", "source", "createdAt" FROM "ProjectAppEvent" WHERE "projectAppId" = ? ORDER BY "createdAt" DESC LIMIT ?',
    projectAppId,
    limit,
  )
}

export async function createProjectAppEvent(input: {
  projectAppId: string
  channelKey: string
  eventKey: string
  direction: string
  payloadJson: string
  source: string
}): Promise<ProjectAppEventRecord> {
  const id = randomUUID()
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ProjectAppEvent" ("id", "projectAppId", "channelKey", "eventKey", "direction", "payloadJson", "source", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    id,
    input.projectAppId,
    input.channelKey,
    input.eventKey,
    input.direction,
    input.payloadJson,
    input.source,
  )

  const rows = await prisma.$queryRawUnsafe<ProjectAppEventRecord[]>(
    'SELECT "id", "projectAppId", "channelKey", "eventKey", "direction", "payloadJson", "source", "createdAt" FROM "ProjectAppEvent" WHERE "id" = ? LIMIT 1',
    id,
  )

  const created = rows[0]
  if (created) {
    broadcastAppEvent(input.projectAppId, {
      ...created,
      direction: created.direction as 'emit' | 'listen' | 'bi',
      createdAt: created.createdAt.toISOString(),
    })
  }

  return created
}

export async function createProjectAppLifecycleEvent(projectAppId: string, eventKey: string, payload: Record<string, unknown>, source = 'system'): Promise<void> {
  await createProjectAppEvent({
    projectAppId,
    channelKey: 'lifecycle',
    eventKey,
    direction: 'emit',
    payloadJson: JSON.stringify(payload),
    source,
  })
}

export async function createProjectAppBuildEventsForConversation(conversationId: string, payload: Record<string, unknown>): Promise<void> {
  const apps = await prisma.projectApp.findMany({
    where: { conversationId },
    select: { id: true, appType: true, name: true },
  })

  await Promise.all(apps.map(app => createProjectAppEvent({
    projectAppId: app.id,
    channelKey: 'build',
    eventKey: 'build.deliverable.created',
    direction: 'emit',
    payloadJson: JSON.stringify({
      appType: app.appType,
      appName: app.name,
      ...payload,
    }),
    source: 'system',
  })))
}
