import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/auth.js'
import { broadcast } from '../services/sse.js'

const router = Router()
const adminAuth = requireRole('superadmin', 'org_admin', 'agent')

// ─── API Keys (existing) ───

router.get('/api-keys', authMiddleware, async (_req, res) => {
  const keys = await prisma.apiKey.findMany()
  const masked = keys.map(k => ({
    id: k.id,
    provider: k.provider,
    key: k.key.slice(0, 8) + '...' + k.key.slice(-4),
    isActive: k.isActive,
  }))
  res.json(masked)
})

router.post('/api-keys', authMiddleware, async (req, res) => {
  const { provider, key } = req.body as { provider: string; key: string }
  if (!provider || !key) {
    res.status(400).json({ error: 'Provider y key son requeridos' })
    return
  }
  const apiKey = await prisma.apiKey.create({
    data: { provider, key, isActive: true },
  })
  res.json({
    id: apiKey.id,
    provider: apiKey.provider,
    key: apiKey.key.slice(0, 8) + '...' + apiKey.key.slice(-4),
    isActive: apiKey.isActive,
  })
})

router.patch('/api-keys/:id', authMiddleware, async (req, res) => {
  const { isActive } = req.body as { isActive: boolean }
  const id = req.params.id as string
  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: { isActive },
  })
  res.json({ id: apiKey.id, provider: apiKey.provider, isActive: apiKey.isActive })
})

router.delete('/api-keys/:id', authMiddleware, async (req, res) => {
  const id = req.params.id as string
  await prisma.apiKey.delete({ where: { id } })
  res.json({ ok: true })
})

// ─── Supervision: Flagged Conversations ───

router.get('/conversations/flagged', adminAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status === 'pending') {
      where.needsHumanReview = true
      where.assignedAgentId = null
    } else if (status === 'assigned') {
      where.needsHumanReview = true
      where.assignedAgentId = { not: null }
    } else if (status === 'resolved') {
      where.needsHumanReview = false
      where.updatedAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    } else {
      where.needsHumanReview = true
    }

    if (req.userRole === 'agent') {
      where.OR = [
        { assignedAgentId: req.auth!.userId },
        { assignedAgentId: null, needsHumanReview: true },
      ]
      delete where.assignedAgentId
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedAgent: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { text: true, sender: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      needsHumanReview: c.needsHumanReview,
      user: c.user,
      assignedAgent: c.assignedAgent,
      lastMessage: c.messages[0] ? {
        text: c.messages[0].text.slice(0, 100),
        sender: c.messages[0].sender,
        createdAt: c.messages[0].createdAt,
      } : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    res.json(result)
  } catch (err) {
    console.error('[Admin] Error fetching flagged conversations:', err)
    res.status(500).json({ error: 'Error al obtener conversaciones' })
  }
})

// ─── Conversation Detail ───

router.get('/conversations/:id', adminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const conversation: any = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedAgent: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        deliverables: { orderBy: { createdAt: 'desc' } },
        kanbanTasks: {
          orderBy: { createdAt: 'asc' },
          include: { deliverable: true },
        },
      },
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversación no encontrada' })
      return
    }

    const messages = conversation.messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      sender: m.sender,
      text: m.text,
      type: m.type,
      botType: m.botType,
      attachment: m.attachmentJson ? JSON.parse(m.attachmentJson) : undefined,
      approved: m.approved,
      createdAt: m.createdAt,
    }))

    res.json({
      ...conversation,
      messages,
    })
  } catch (err) {
    console.error('[Admin] Error fetching conversation:', err)
    res.status(500).json({ error: 'Error al obtener conversación' })
  }
})

// ─── Assign Agent ───

router.post('/conversations/:id/assign', adminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const { agentId } = req.body as { agentId?: string }
    const assignTo = agentId || req.auth!.userId

    const conversation: any = await prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: assignTo },
      include: { assignedAgent: { select: { id: true, name: true } } },
    })

    res.json({
      id: conversation.id,
      assignedAgent: conversation.assignedAgent,
    })
  } catch (err) {
    console.error('[Admin] Error assigning agent:', err)
    res.status(500).json({ error: 'Error al asignar agente' })
  }
})

// ─── Resolve Supervision ───

router.post('/conversations/:id/resolve', adminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.conversation.update({
      where: { id },
      data: { needsHumanReview: false },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('[Admin] Error resolving conversation:', err)
    res.status(500).json({ error: 'Error al resolver conversación' })
  }
})

// ─── Intervene in Chat (send human message) ───

router.post('/conversations/:id/message', adminAuth, async (req, res) => {
  try {
    const { text } = req.body as { text: string }
    if (!text?.trim()) {
      res.status(400).json({ error: 'Texto requerido' })
      return
    }

    const conversationId = req.params.id as string
    const agent = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    if (!agent) {
      res.status(404).json({ error: 'Agente no encontrado' })
      return
    }

    const message = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'human_agent',
        text: text.trim(),
        type: 'agent',
        botType: agent.id,
      },
    })

    broadcast(conversationId, {
      type: 'human_message',
      agentName: agent.name,
      agentRole: agent.role === 'superadmin' ? 'Supervisor' : agent.role === 'org_admin' ? 'Administrador' : 'Agente',
      text: text.trim(),
      messageId: message.id,
    })

    res.json({
      id: message.id,
      sender: 'human_agent',
      text: message.text,
      agentName: agent.name,
      createdAt: message.createdAt,
    })
  } catch (err) {
    console.error('[Admin] Error sending message:', err)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
})

// ─── Manage Kanban Tasks ───

router.patch('/tasks/:taskId', adminAuth, async (req, res) => {
  try {
    const { status } = req.body as { status: string }
    if (!['todo', 'doing', 'done'].includes(status)) {
      res.status(400).json({ error: 'Status inválido' })
      return
    }

    const taskId = req.params.taskId as string
    const task = await prisma.kanbanTask.update({
      where: { id: taskId },
      data: { status },
      include: { deliverable: true },
    })

    broadcast(task.conversationId, {
      type: 'kanban_update',
      task: {
        id: task.id,
        title: task.title,
        agent: task.agent,
        status: task.status as 'todo' | 'doing' | 'done',
        botType: task.botType,
        deliverableId: task.deliverableId ?? undefined,
        instanceId: task.instanceId ?? undefined,
        createdAt: task.createdAt.toISOString(),
      },
    })

    res.json(task)
  } catch (err) {
    console.error('[Admin] Error updating task:', err)
    res.status(500).json({ error: 'Error al actualizar tarea' })
  }
})

// ─── Upload Deliverable as Human Agent ───

router.post('/conversations/:id/deliverable', adminAuth, async (req, res) => {
  try {
    const { title, type, content } = req.body as { title: string; type: string; content: string }
    if (!title || !type || !content) {
      res.status(400).json({ error: 'Título, tipo y contenido son requeridos' })
      return
    }

    const conversationId = req.params.id as string
    const deliverable = await prisma.deliverable.create({
      data: {
        id: uuid(),
        conversationId,
        title,
        type,
        content,
        agent: 'Agente Humano',
        botType: 'human',
      },
    })

    const task = await prisma.kanbanTask.create({
      data: {
        id: uuid(),
        conversationId,
        title,
        agent: 'Agente Humano',
        status: 'done',
        botType: 'human',
        deliverableId: deliverable.id,
      },
    })

    broadcast(conversationId, {
      type: 'deliverable',
      deliverable: {
        id: deliverable.id,
        title: deliverable.title,
        type: deliverable.type as 'report' | 'code' | 'design' | 'copy' | 'video',
        content: deliverable.content,
        agent: deliverable.agent,
        botType: deliverable.botType,
      },
    })

    broadcast(conversationId, {
      type: 'kanban_update',
      task: {
        id: task.id,
        title: task.title,
        agent: task.agent,
        status: task.status as 'todo' | 'doing' | 'done',
        botType: task.botType,
        deliverableId: task.deliverableId ?? undefined,
        createdAt: task.createdAt.toISOString(),
      },
    })

    res.json({ deliverable, task })
  } catch (err) {
    console.error('[Admin] Error creating deliverable:', err)
    res.status(500).json({ error: 'Error al crear entregable' })
  }
})

// ─── Admin Stats ───

router.get('/stats', adminAuth, async (_req, res) => {
  try {
    const [pending, assigned, totalConversations, totalUsers] = await Promise.all([
      prisma.conversation.count({ where: { needsHumanReview: true, assignedAgentId: null } }),
      prisma.conversation.count({ where: { needsHumanReview: true, assignedAgentId: { not: null } } }),
      prisma.conversation.count(),
      prisma.user.count({ where: { role: 'user' } }),
    ])
    res.json({ pending, assigned, totalConversations, totalUsers })
  } catch (err) {
    console.error('[Admin] Error fetching stats:', err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

export default router
