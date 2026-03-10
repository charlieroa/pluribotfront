import { Router } from 'express'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { generateApiKey } from '../middleware/api-key.js'

const router = Router()

// List user's API keys
router.get('/', authMiddleware, async (req, res) => {
  try {
    const keys = await prisma.userApiKey.findMany({
      where: { userId: req.auth!.userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(keys)
  } catch (err) {
    console.error('[ApiKeys] List error:', err)
    res.status(500).json({ error: 'Error listing API keys' })
  }
})

// Create a new API key
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { planId: true },
    })

    if (!user || !['agency', 'enterprise'].includes(user.planId)) {
      res.status(403).json({ error: 'API keys require Agency or Enterprise plan' })
      return
    }

    // Limit to 5 active keys
    const activeCount = await prisma.userApiKey.count({
      where: { userId: req.auth!.userId, isActive: true },
    })
    if (activeCount >= 5) {
      res.status(400).json({ error: 'Maximum 5 active API keys. Deactivate one first.' })
      return
    }

    const { name } = req.body as { name?: string }
    const result = await generateApiKey(req.auth!.userId, name || 'Default')

    res.json({
      id: result.id,
      key: result.key, // Only returned once!
      keyPrefix: result.keyPrefix,
      message: 'Save this key now. It will not be shown again.',
    })
  } catch (err) {
    console.error('[ApiKeys] Create error:', err)
    res.status(500).json({ error: 'Error creating API key' })
  }
})

// Deactivate/activate an API key
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const key = await prisma.userApiKey.findFirst({
      where: { id: req.params.id as string, userId: req.auth!.userId },
    })
    if (!key) {
      res.status(404).json({ error: 'API key not found' })
      return
    }

    const { isActive } = req.body as { isActive: boolean }
    await prisma.userApiKey.update({
      where: { id: key.id },
      data: { isActive },
    })

    res.json({ success: true })
  } catch (err) {
    console.error('[ApiKeys] Update error:', err)
    res.status(500).json({ error: 'Error updating API key' })
  }
})

// Delete an API key permanently
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const key = await prisma.userApiKey.findFirst({
      where: { id: req.params.id as string, userId: req.auth!.userId },
    })
    if (!key) {
      res.status(404).json({ error: 'API key not found' })
      return
    }

    await prisma.userApiKey.delete({ where: { id: key.id } })
    res.json({ success: true })
  } catch (err) {
    console.error('[ApiKeys] Delete error:', err)
    res.status(500).json({ error: 'Error deleting API key' })
  }
})

export default router
