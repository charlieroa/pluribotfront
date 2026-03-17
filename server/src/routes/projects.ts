import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { PROJECT_APP_CATALOG, buildProjectAppBootstrap, buildProjectAppExecutionBrief, getProjectAppCatalogItem, inferProjectAppType, slugifyProjectAppName, type ProjectAppType } from '../services/project-apps.js'
import { buildRealtimeContract } from '../services/realtime-events.js'
import { buildSimulatedEvents } from '../services/app-event-simulator.js'
import { addAppEventConnection } from '../services/app-events-sse.js'
import { createProjectAppEvent, createProjectAppLifecycleEvent, listProjectAppEvents, type ProjectAppEventRecord } from '../services/project-app-events.js'
import { buildProjectAppActionEvents, listProjectAppActions } from '../services/project-app-actions.js'
import { buildProjectAppSnapshot } from '../services/project-app-snapshots.js'
import { buildProjectAppRuntimeExecution, listProjectAppRuntimeScenarios } from '../services/project-app-runtime.js'
import { findAccessibleProject } from '../services/access-control.js'
import { getProjectAppQuotaError } from '../services/project-app-governance.js'

const router = Router()

function toAbsoluteAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  const base = process.env.DEPLOY_BASE_URL || `https://${process.env.APP_DOMAIN || 'plury.co'}`
  return `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`
}

// List projects for the current user
router.get('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.json([])

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      conversations: {
        select: {
          id: true,
          title: true,
          updatedAt: true,
          deliverables: {
            select: {
              id: true,
              title: true,
              type: true,
              botType: true,
              version: true,
              instanceId: true,
              thumbnailUrl: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  // Build response with deliverable summaries
  const result = projects.map(p => {
    // Collect all deliverables across conversations, dedupe by instanceId (latest version)
    const allDeliverables: { id: string; title: string; type: string; botType: string; createdAt: Date; thumbnailUrl?: string | null }[] = []
    const seenInstances = new Set<string>()

    for (const conv of p.conversations) {
      for (const d of conv.deliverables) {
        const key = d.instanceId || d.id
        if (!seenInstances.has(key)) {
          seenInstances.add(key)
          allDeliverables.push({ id: d.id, title: d.title, type: d.type, botType: d.botType, createdAt: d.createdAt, thumbnailUrl: toAbsoluteAssetUrl((d as any).thumbnailUrl ?? null) })
        }
      }
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      conversationCount: p.conversations.length,
      deliverables: allDeliverables.slice(0, 20),
      updatedAt: p.updatedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }
  })

  res.json(result)
})

// Get a single project with full details
router.get('/:id', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await prisma.project.findFirst({
    where: { id: req.params.id as string, userId },
    include: {
      apps: {
        orderBy: { createdAt: 'desc' },
      },
      conversations: {
        select: {
          id: true,
          title: true,
          updatedAt: true,
          messages: {
            select: { text: true, sender: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          deliverables: {
            select: {
              id: true,
              title: true,
              type: true,
              botType: true,
              content: true,
              version: true,
              instanceId: true,
              publishSlug: true,
              customDomain: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          kanbanTasks: {
            select: {
              id: true,
              title: true,
              agent: true,
              status: true,
              botType: true,
              instanceId: true,
              createdAt: true,
              deliverable: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  botType: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
      assets: {
        include: {
          deliverable: {
            select: { id: true, title: true, type: true, botType: true, thumbnailUrl: true, publishSlug: true, customDomain: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  res.json(project)
})

// Create project
router.post('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const { name, description } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })

  const project = await prisma.project.create({
    data: { userId, name: name.trim(), description: description?.trim() || null },
  })

  res.json(project)
})

// Update project
router.patch('/:id', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const existing = await findAccessibleProject(req.params.id as string, userId)
  if (!existing) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const { name, description, status } = req.body
  const project = await prisma.project.update({
    where: { id: req.params.id as string },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status !== undefined && { status }),
    },
  })

  res.json(project)
})

// Delete project (unlinks conversations, doesn't delete them)
router.delete('/:id', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const existing = await findAccessibleProject(req.params.id as string, userId)
  if (!existing) return res.status(404).json({ error: 'Proyecto no encontrado' })

  // Unlink conversations from this project
  await prisma.conversation.updateMany({
    where: { projectId: req.params.id as string },
    data: { projectId: null },
  })

  await prisma.project.delete({ where: { id: req.params.id as string } })
  res.json({ ok: true })
})

// Add conversation to project
router.post('/:id/conversations', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const { conversationId } = req.body
  if (!conversationId) return res.status(400).json({ error: 'conversationId requerido' })

  // Verify ownership
  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
  if (!conversation) return res.status(404).json({ error: 'Conversacion no encontrada' })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { projectId: req.params.id as string },
  })

  res.json({ ok: true })
})

// Remove conversation from project
router.delete('/:id/conversations/:convId', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  await prisma.conversation.update({
    where: { id: req.params.convId as string },
    data: { projectId: null },
  })

  res.json({ ok: true })
})

// ─── Project Assets ───

// Get all assets for a project
router.get('/:id/assets', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const assets = await prisma.projectAsset.findMany({
    where: { projectId: req.params.id as string },
    orderBy: { createdAt: 'desc' },
    include: {
      deliverable: {
        select: { id: true, title: true, type: true, botType: true, thumbnailUrl: true, publishSlug: true, customDomain: true }
      }
    }
  })

  res.json(assets)
})

// Register an asset
router.post('/:id/assets', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const { conversationId, deliverableId, category, name, metadata } = req.body
  if (!deliverableId || !category || !name) {
    return res.status(400).json({ error: 'deliverableId, category y name son requeridos' })
  }

  const asset = await prisma.projectAsset.create({
    data: {
      projectId: req.params.id as string,
      conversationId: conversationId || '',
      deliverableId,
      category,
      name,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }
  })

  res.json(asset)
})

// Delete an asset
router.delete('/:id/assets/:assetId', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  await prisma.projectAsset.delete({ where: { id: req.params.assetId as string } })
  res.json({ ok: true })
})

// ——— Project Apps / App Registry ———

router.get('/app-catalog', optionalAuth, (_req, res) => {
  res.json(PROJECT_APP_CATALOG)
})

router.get('/app-catalog/:type', optionalAuth, (req, res) => {
  const catalog = getProjectAppCatalogItem(req.params.type as string)
  if (!catalog) return res.status(404).json({ error: 'Tipo de app no encontrado' })
  res.json(catalog)
})

router.get('/:id/apps', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const apps = await prisma.projectApp.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
  })

  res.json(apps)
})

router.get('/:id/apps-snapshots', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const apps = await prisma.projectApp.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, appType: true },
  })

  const snapshots = await Promise.all(apps.map(async app => {
    const events = await listProjectAppEvents(app.id, 50)
    return {
      appId: app.id,
      appType: app.appType,
      snapshot: buildProjectAppSnapshot(app.appType as ProjectAppType, events),
    }
  }))

  res.json({ projectId: project.id, snapshots })
})

router.get('/:id/apps/:appId/brief', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const config = app.configJson ? JSON.parse(app.configJson) as { roadmap?: { phaseIndex?: number }[] } : null
  const brief = buildProjectAppExecutionBrief(app.appType as ProjectAppType, app.name, 1)

  res.json({
    app,
    brief: {
      ...brief,
      roadmap: config?.roadmap ?? null,
    },
  })
})

router.get('/:id/apps/:appId/realtime-contract', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const contract = buildRealtimeContract(app.appType as ProjectAppType)
  res.json({ appId: app.id, appType: app.appType, contract })
})

router.get('/:id/apps/:appId/events', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200)
  const events = await listProjectAppEvents(app.id, limit)

  res.json(events)
})

router.get('/:id/apps/:appId/events/stream', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  addAppEventConnection(app.id, res, userId)
})

router.get('/:id/apps/:appId/actions', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  res.json({ appId: app.id, appType: app.appType, actions: listProjectAppActions(app.appType as ProjectAppType) })
})

router.get('/:id/apps/:appId/snapshot', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const events = await listProjectAppEvents(app.id, 50)
  const snapshot = buildProjectAppSnapshot(app.appType as ProjectAppType, events)
  res.json({ appId: app.id, appType: app.appType, snapshot })
})

router.post('/:id/apps/:appId/events', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const { channelKey, eventKey, direction, payload, source } = req.body as {
    channelKey?: string
    eventKey?: string
    direction?: 'emit' | 'listen' | 'bi'
    payload?: unknown
    source?: string
  }

  if (!channelKey || !eventKey || !direction || payload === undefined) {
    return res.status(400).json({ error: 'channelKey, eventKey, direction y payload son requeridos' })
  }

  const created = await createProjectAppEvent({
    projectAppId: app.id,
    channelKey,
    eventKey,
    direction,
    payloadJson: JSON.stringify(payload),
    source: source || 'user',
  })

  res.json(created)
})

router.post('/:id/apps/:appId/actions/:actionKey', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const recentEvents = await listProjectAppEvents(app.id, 20)
  const actionEvents = buildProjectAppActionEvents(app.appType as ProjectAppType, req.params.actionKey as string, recentEvents)
  if (!actionEvents.length) {
    return res.status(400).json({ error: 'Accion no soportada para esta app' })
  }

  const created = [] as ProjectAppEventRecord[]
  for (const event of actionEvents) {
    created.push(await createProjectAppEvent({
      projectAppId: app.id,
      channelKey: event.channelKey,
      eventKey: event.eventKey,
      direction: event.direction,
      payloadJson: JSON.stringify(event.payload),
      source: event.source,
    }))
  }

  res.json({ createdCount: created.length, events: created })
})

router.post('/:id/apps/:appId/runtime/execute', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const recentEvents = await listProjectAppEvents(app.id, 30)
  const runtimeEvents = buildProjectAppRuntimeExecution(app.appType as ProjectAppType, recentEvents, req.body as Record<string, unknown> | undefined)
  if (!runtimeEvents.length) {
    return res.status(400).json({ error: 'Runtime no soportado para esta app' })
  }

  const created = [] as ProjectAppEventRecord[]
  for (const event of runtimeEvents) {
    created.push(await createProjectAppEvent({
      projectAppId: app.id,
      channelKey: event.channelKey,
      eventKey: event.eventKey,
      direction: event.direction,
      payloadJson: JSON.stringify(event.payload),
      source: event.source,
    }))
  }

  res.json({ createdCount: created.length, events: created })
})

router.get('/:id/apps/:appId/runtime/options', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  res.json({
    appId: app.id,
    appType: app.appType,
    scenarios: listProjectAppRuntimeScenarios(app.appType as ProjectAppType),
  })
})

router.post('/:id/apps/:appId/simulate', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const app = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!app) return res.status(404).json({ error: 'App no encontrada' })

  const { count } = req.body as { count?: number }
  const simulated = buildSimulatedEvents(app.appType as ProjectAppType, count ?? 3)
  const created = [] as ProjectAppEventRecord[]
  for (const event of simulated) {
    created.push(await createProjectAppEvent({
      projectAppId: app.id,
      channelKey: event.channelKey,
      eventKey: event.eventKey,
      direction: event.direction,
      payloadJson: JSON.stringify(event.payload),
      source: event.source,
    }))
  }

  res.json({ createdCount: created.length, events: created })
})

router.post('/:id/apps', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })
  const existingAppsCount = await prisma.projectApp.count({ where: { projectId: project.id } })
  const quotaError = getProjectAppQuotaError(project.user.planId, existingAppsCount)
  if (quotaError) return res.status(403).json({ error: quotaError, code: 'project_app_quota_exceeded' })

  const { name, appType, conversationId, vertical, config, capabilities, metadata } = req.body as {
    name?: string
    appType?: string
    conversationId?: string
    vertical?: string
    config?: unknown
    capabilities?: string[]
    metadata?: unknown
  }

  const resolvedType = appType && getProjectAppCatalogItem(appType) ? appType : inferProjectAppType(name || project.name)
  const catalog = getProjectAppCatalogItem(resolvedType)
  if (!catalog) return res.status(400).json({ error: 'Tipo de app invalido' })

  const baseName = (name || `${catalog.label} ${project.name}`).trim()
  const baseSlug = slugifyProjectAppName(baseName)
  const existingCount = await prisma.projectApp.count({
    where: { projectId: project.id, slug: { startsWith: baseSlug } },
  })
  const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug
  const bootstrap = buildProjectAppBootstrap(catalog.type)

  const app = await prisma.projectApp.create({
    data: {
      projectId: project.id,
      conversationId: conversationId || null,
      name: baseName,
      slug,
      appType: resolvedType,
      vertical: vertical || null,
      runtime: catalog.runtime,
      capabilitiesJson: JSON.stringify(capabilities?.length ? capabilities : bootstrap.suggestedCapabilities),
      configJson: JSON.stringify(config && typeof config === 'object' ? { ...bootstrap.config, ...config as Record<string, unknown> } : bootstrap.config),
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  })

  await createProjectAppLifecycleEvent(app.id, 'app.created', {
    appId: app.id,
    appType: app.appType,
    name: app.name,
    runtime: app.runtime,
  })

  res.json(app)
})

router.post('/:id/apps/bootstrap', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })
  const existingAppsCount = await prisma.projectApp.count({ where: { projectId: project.id } })
  const quotaError = getProjectAppQuotaError(project.user.planId, existingAppsCount)
  if (quotaError) return res.status(403).json({ error: quotaError, code: 'project_app_quota_exceeded' })

  const { appType, name, conversationId, vertical, metadata } = req.body as {
    appType?: string
    name?: string
    conversationId?: string
    vertical?: string
    metadata?: unknown
  }

  const resolvedType = appType && getProjectAppCatalogItem(appType) ? appType : inferProjectAppType(name || project.name)
  const catalog = getProjectAppCatalogItem(resolvedType)
  if (!catalog) return res.status(400).json({ error: 'Tipo de app invalido' })

  const bootstrap = buildProjectAppBootstrap(catalog.type)
  const baseName = (name || `${catalog.label} ${project.name}`).trim()
  const baseSlug = slugifyProjectAppName(baseName)
  const existingCount = await prisma.projectApp.count({
    where: { projectId: project.id, slug: { startsWith: baseSlug } },
  })
  const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug

  const app = await prisma.projectApp.create({
    data: {
      projectId: project.id,
      conversationId: conversationId || null,
      name: baseName,
      slug,
      appType: resolvedType,
      vertical: vertical || null,
      runtime: bootstrap.runtime,
      capabilitiesJson: JSON.stringify(bootstrap.suggestedCapabilities),
      configJson: JSON.stringify(bootstrap.config),
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  })

  await createProjectAppLifecycleEvent(app.id, 'app.created', {
    appId: app.id,
    appType: app.appType,
    name: app.name,
    runtime: app.runtime,
    bootstrap: true,
  })

  res.json({
    app,
    blueprint: {
      summary: catalog.summary,
      targetUsers: catalog.targetUsers,
      readinessScore: catalog.readinessScore,
      phases: bootstrap.phases,
      modules: bootstrap.modules,
      recommendedPayments: bootstrap.recommendedPayments,
    },
    executionBrief: buildProjectAppExecutionBrief(catalog.type, baseName, 1),
    realtimeContract: buildRealtimeContract(catalog.type),
  })
})

router.patch('/:id/apps/:appId', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  const existing = await prisma.projectApp.findFirst({
    where: { id: req.params.appId as string, projectId: project.id },
  })
  if (!existing) return res.status(404).json({ error: 'App no encontrada' })

  const { name, status, vertical, config, capabilities, metadata } = req.body as {
    name?: string
    status?: string
    vertical?: string
    config?: unknown
    capabilities?: string[]
    metadata?: unknown
  }

  const app = await prisma.projectApp.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined ? { name: name.trim(), slug: slugifyProjectAppName(name.trim()) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(vertical !== undefined ? { vertical: vertical || null } : {}),
      ...(config !== undefined ? { configJson: config ? JSON.stringify(config) : null } : {}),
      ...(capabilities !== undefined ? { capabilitiesJson: JSON.stringify(capabilities) } : {}),
      ...(metadata !== undefined ? { metadataJson: metadata ? JSON.stringify(metadata) : null } : {}),
    },
  })

  await createProjectAppLifecycleEvent(app.id, 'app.updated', {
    appId: app.id,
    name: app.name,
    status: app.status,
    vertical: app.vertical,
  })

  res.json(app)
})

router.delete('/:id/apps/:appId', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const project = await findAccessibleProject(req.params.id as string, userId)
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

  await prisma.projectApp.deleteMany({
    where: { id: req.params.appId as string, projectId: project.id },
  })

  res.json({ ok: true })
})

export default router
