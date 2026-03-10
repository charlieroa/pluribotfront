import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

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
    const allDeliverables: { id: string; title: string; type: string; botType: string; createdAt: Date }[] = []
    const seenInstances = new Set<string>()

    for (const conv of p.conversations) {
      for (const d of conv.deliverables) {
        const key = d.instanceId || d.id
        if (!seenInstances.has(key)) {
          seenInstances.add(key)
          allDeliverables.push({ id: d.id, title: d.title, type: d.type, botType: d.botType, createdAt: d.createdAt })
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
              netlifyUrl: true,
              customDomain: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
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

  const existing = await prisma.project.findFirst({ where: { id: req.params.id as string, userId } })
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

  const existing = await prisma.project.findFirst({ where: { id: req.params.id as string, userId } })
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
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId } })
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

export default router
