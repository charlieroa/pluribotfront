import { Router } from 'express'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// All routes require auth
router.use(authMiddleware)

// GET /api/user/bots — List user's active bots
router.get('/bots', async (req, res) => {
  const userId = req.auth!.userId

  try {
    const userBots = await prisma.userBot.findMany({
      where: { userId },
    })
    res.json({ bots: userBots })
  } catch (err) {
    console.error('[User] Error fetching bots:', err)
    res.status(500).json({ error: 'Error al obtener bots' })
  }
})

// POST /api/user/bots — Upsert bot activations
router.post('/bots', async (req, res) => {
  const userId = req.auth!.userId
  const { bots } = req.body as { bots: Array<{ botId: string; isActive: boolean }> }

  if (!bots || !Array.isArray(bots)) {
    res.status(400).json({ error: 'Se requiere un array de bots' })
    return
  }

  try {
    for (const bot of bots) {
      await prisma.userBot.upsert({
        where: { userId_botId: { userId, botId: bot.botId } },
        update: { isActive: bot.isActive },
        create: { userId, botId: bot.botId, isActive: bot.isActive },
      })
    }

    const userBots = await prisma.userBot.findMany({
      where: { userId },
    })
    res.json({ bots: userBots })
  } catch (err) {
    console.error('[User] Error updating bots:', err)
    res.status(500).json({ error: 'Error al actualizar bots' })
  }
})

// POST /api/user/onboarding — Complete onboarding
router.post('/onboarding', async (req, res) => {
  const userId = req.auth!.userId
  const { profession, activeBots } = req.body as { profession: string; activeBots: string[] }

  if (!profession) {
    res.status(400).json({ error: 'Se requiere profesion' })
    return
  }

  try {
    // Update user profile
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profession, onboardingDone: true },
    })

    // Create bot activations
    if (activeBots && activeBots.length > 0) {
      const allBotIds = ['seo', 'web', 'ads', 'dev', 'video']
      for (const botId of allBotIds) {
        await prisma.userBot.upsert({
          where: { userId_botId: { userId, botId } },
          update: { isActive: activeBots.includes(botId) },
          create: { userId, botId, isActive: activeBots.includes(botId) },
        })
      }
    }

    const userBots = await prisma.userBot.findMany({
      where: { userId, isActive: true },
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.planId,
        onboardingDone: user.onboardingDone,
        profession: user.profession,
      },
      activeBots: userBots.map(b => b.botId),
    })
  } catch (err) {
    console.error('[User] Error completing onboarding:', err)
    res.status(500).json({ error: 'Error al completar onboarding' })
  }
})

export default router
