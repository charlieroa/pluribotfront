import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { broadcast } from '../services/sse.js'
import type { ConversationListItem } from '../../../shared/types.js'

const router = Router()

// List conversations for the current user (+ assigned conversations for admin/agent roles)
router.get('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'

  // Check if user has admin/agent role
  const user = userId !== 'anonymous'
    ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    : null
  const isAdmin = user && ['superadmin', 'org_admin', 'agent'].includes(user.role)

  // Build where clause: own conversations + assigned/flagged conversations for admins
  let where: any = { userId }
  if (user?.role === 'superadmin') {
    // Superadmin sees own + all flagged + all assigned to them
    where = { OR: [{ userId }, { needsHumanReview: true }, { assignedAgentId: userId }] }
  } else if (isAdmin) {
    // Agent/org_admin sees own + assigned to them
    where = { OR: [{ userId }, { assignedAgentId: userId }] }
  }

  const conversations: any[] = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { name: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { text: true },
      },
    },
  })

  const items: ConversationListItem[] = conversations.map((c: any) => ({
    id: c.id,
    title: c.userId !== userId ? `[${c.user?.name}] ${c.title}` : c.title,
    updatedAt: c.updatedAt.toISOString(),
    lastMessage: c.messages[0]?.text,
  }))

  res.json(items)
})

// Get a conversation with messages
router.get('/:id', optionalAuth, async (req, res) => {
  const id = req.params.id as string
  const conversation: any = await prisma.conversation.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, name: true, role: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      deliverables: true,
      kanbanTasks: { include: { deliverable: true } },
    },
  })

  if (!conversation) {
    res.status(404).json({ error: 'Conversación no encontrada' })
    return
  }

  res.json({
    id: conversation.id,
    title: conversation.title,
    needsHumanReview: conversation.needsHumanReview,
    assignedAgent: conversation.assignedAgent,
    messages: conversation.messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      sender: m.sender,
      text: m.text,
      type: m.type,
      botType: m.botType,
      attachment: m.attachmentJson ? JSON.parse(m.attachmentJson) : undefined,
      approved: m.approved,
      createdAt: m.createdAt.toISOString(),
    })),
    deliverables: conversation.deliverables.map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      content: d.content,
      agent: d.agent,
      botType: d.botType,
    })),
    kanbanTasks: conversation.kanbanTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      agent: t.agent,
      status: t.status,
      botType: t.botType,
      deliverableId: t.deliverableId,
      deliverable: t.deliverable ? {
        id: t.deliverable.id,
        title: t.deliverable.title,
        type: t.deliverable.type,
        content: t.deliverable.content,
        agent: t.deliverable.agent,
        botType: t.deliverable.botType,
      } : undefined,
    })),
  })
})

// Delete a conversation and all related data (messages, deliverables, tasks)
router.delete('/:id', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const convId = req.params.id as string

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: convId } })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    // Delete in order: kanban tasks → deliverables → messages → conversation
    await prisma.kanbanTask.deleteMany({ where: { conversationId: convId } })
    await prisma.deliverable.deleteMany({ where: { conversationId: convId } })
    await prisma.message.deleteMany({ where: { conversationId: convId } })
    await prisma.conversation.delete({ where: { id: convId } })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Conversations] Delete error:', err)
    res.status(500).json({ error: 'Error al eliminar conversacion' })
  }
})

// Finalize a kanban task (client marks as 'done')
router.patch('/:conversationId/tasks/:taskId', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const { conversationId, taskId } = req.params as { conversationId: string; taskId: string }
  const { status } = req.body as { status: string }

  if (status !== 'done') {
    res.status(400).json({ error: 'Solo se permite cambiar a status "done"' })
    return
  }

  try {
    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    const task = await prisma.kanbanTask.update({
      where: { id: taskId },
      data: { status: 'done' },
      include: { deliverable: true },
    })

    broadcast(conversationId, {
      type: 'kanban_update',
      task: {
        id: task.id,
        title: task.title,
        agent: task.agent,
        status: 'done' as const,
        botType: task.botType,
        deliverableId: task.deliverableId ?? undefined,
        instanceId: task.instanceId ?? undefined,
        createdAt: task.createdAt.toISOString(),
        deliverable: task.deliverable ? {
          id: task.deliverable.id,
          title: task.deliverable.title,
          type: task.deliverable.type as 'report' | 'code' | 'design' | 'copy' | 'video',
          content: task.deliverable.content,
          agent: task.deliverable.agent,
          botType: task.deliverable.botType,
        } : undefined,
      },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Conversations] Finalize task error:', err)
    res.status(500).json({ error: 'Error al finalizar tarea' })
  }
})

// ─── Supabase config endpoints ───

// Save Supabase config for a conversation
router.put('/:id/supabase', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const convId = req.params.id as string
  const { supabaseUrl, supabaseAnonKey } = req.body as { supabaseUrl?: string; supabaseAnonKey?: string }

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: convId } })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    // Validate URL format
    if (supabaseUrl && !/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl.trim())) {
      res.status(400).json({ error: 'URL invalida. Debe ser https://xxx.supabase.co' })
      return
    }

    // Validate anon key format
    if (supabaseAnonKey && !supabaseAnonKey.trim().startsWith('eyJ')) {
      res.status(400).json({ error: 'Anon key invalida. Debe empezar con eyJ' })
      return
    }

    await prisma.conversation.update({
      where: { id: convId },
      data: {
        supabaseUrl: supabaseUrl?.trim() || null,
        supabaseAnonKey: supabaseAnonKey?.trim() || null,
      },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Conversations] Supabase config error:', err)
    res.status(500).json({ error: 'Error al guardar config de Supabase' })
  }
})

// Get Supabase config for a conversation
router.get('/:id/supabase', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const convId = req.params.id as string

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      select: { userId: true, supabaseUrl: true, supabaseAnonKey: true },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    res.json({
      supabaseUrl: conversation.supabaseUrl,
      supabaseAnonKey: conversation.supabaseAnonKey,
      connected: !!(conversation.supabaseUrl && conversation.supabaseAnonKey),
    })
  } catch (err) {
    console.error('[Conversations] Supabase config read error:', err)
    res.status(500).json({ error: 'Error al leer config de Supabase' })
  }
})

export default router
