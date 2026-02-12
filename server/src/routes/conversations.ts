import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import type { ConversationListItem } from '../../../shared/types.js'

const router = Router()

// List conversations for the current user
router.get('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'

  const conversations: any[] = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { text: true },
      },
    },
  })

  const items: ConversationListItem[] = conversations.map((c: any) => ({
    id: c.id,
    title: c.title,
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

export default router
