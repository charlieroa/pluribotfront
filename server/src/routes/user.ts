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

// POST /api/user/upgrade-agency — Upgrade user to agency (org_admin)
router.post('/upgrade-agency', async (req, res) => {
  const userId = req.auth!.userId

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    if (user.role !== 'user') {
      res.status(400).json({ error: 'Solo usuarios normales pueden hacer upgrade a agencia' })
      return
    }

    // Create organization with default name
    const org = await prisma.organization.create({
      data: { name: `Agencia de ${user.name}` },
    })

    // Update user: set plan, role, and link to org
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        planId: 'agency',
        role: 'org_admin',
        organizationId: org.id,
      },
    })

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planId: updatedUser.planId,
        onboardingDone: updatedUser.onboardingDone,
        profession: updatedUser.profession,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
      },
      organization: org,
    })
  } catch (err) {
    console.error('[User] Error upgrading to agency:', err)
    res.status(500).json({ error: 'Error al hacer upgrade a agencia' })
  }
})

// POST /api/user/downgrade-plan — Downgrade from agency back to starter
router.post('/downgrade-plan', async (req, res) => {
  const userId = req.auth!.userId

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    if (user.role !== 'org_admin') {
      res.status(400).json({ error: 'Solo administradores de agencia pueden hacer downgrade' })
      return
    }

    // Downgrade user: reset plan, role, disconnect from org
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        planId: 'starter',
        role: 'user',
        organizationId: null,
      },
    })

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planId: updatedUser.planId,
        onboardingDone: updatedUser.onboardingDone,
        profession: updatedUser.profession,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
      },
    })
  } catch (err) {
    console.error('[User] Error downgrading plan:', err)
    res.status(500).json({ error: 'Error al hacer downgrade' })
  }
})

export default router
