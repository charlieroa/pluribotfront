import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

/**
 * GET /api/portfolio/public — List public deliverables (no auth required)
 */
router.get('/public', async (_req, res) => {
  try {
    const deliverables = await prisma.deliverable.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        title: true,
        type: true,
        agent: true,
        botType: true,
        netlifyUrl: true,
        shareSlug: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({ deliverables })
  } catch (err) {
    console.error('[Portfolio] Error:', err)
    res.status(500).json({ error: 'Error al obtener portfolio' })
  }
})

/**
 * GET /api/portfolio/shared/:slug — Get a single shared deliverable by slug
 */
router.get('/shared/:slug', async (req, res) => {
  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { shareSlug: req.params.slug },
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        agent: true,
        botType: true,
        netlifyUrl: true,
        shareSlug: true,
        isPublic: true,
        createdAt: true,
      },
    })

    if (!deliverable || !deliverable.isPublic) {
      res.status(404).json({ error: 'Proyecto no encontrado' })
      return
    }

    res.json({ deliverable })
  } catch (err) {
    console.error('[Portfolio] Error:', err)
    res.status(500).json({ error: 'Error al obtener proyecto' })
  }
})

/**
 * PUT /api/portfolio/:deliverableId/share — Toggle public sharing
 * Body: { isPublic: boolean }
 */
router.put('/:deliverableId/share', optionalAuth, async (req, res) => {
  const deliverableId = req.params.deliverableId as string
  const { isPublic } = req.body as { isPublic: boolean }

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: {
        id: true,
        shareSlug: true,
        conversationId: true,
        conversation: { select: { userId: true } },
      },
    })

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    // Auth check: only the owner can toggle sharing
    const userId = (req as any).userId
    if (userId && deliverable.conversation.userId !== userId) {
      res.status(403).json({ error: 'No autorizado' })
      return
    }

    // Generate slug if enabling sharing and no slug exists
    let shareSlug = deliverable.shareSlug
    if (isPublic && !shareSlug) {
      shareSlug = crypto.randomBytes(6).toString('hex')
    }

    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { isPublic, shareSlug },
    })

    res.json({
      isPublic: updated.isPublic,
      shareSlug: updated.shareSlug,
      shareUrl: updated.shareSlug ? `/shared/${updated.shareSlug}` : null,
    })
  } catch (err) {
    console.error('[Portfolio] Share error:', err)
    res.status(500).json({ error: 'Error al actualizar sharing' })
  }
})

export default router
