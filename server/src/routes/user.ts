import { Router } from 'express'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { resetCreditsForPlan } from '../services/credit-tracker.js'
import { getPlan } from '../config/plans.js'

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
      const allBotIds = ['seo', 'brand', 'web', 'social', 'ads', 'dev', 'video']
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

    // Reset credits for new plan
    await resetCreditsForPlan(userId, 'agency')
    const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { creditBalance: true } })

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
        creditBalance: freshUser?.creditBalance ?? 0,
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

    // Reset credits for new plan
    await resetCreditsForPlan(userId, 'starter')
    const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { creditBalance: true } })

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
        creditBalance: freshUser?.creditBalance ?? 0,
      },
    })
  } catch (err) {
    console.error('[User] Error downgrading plan:', err)
    res.status(500).json({ error: 'Error al hacer downgrade' })
  }
})

// POST /api/user/change-plan — Generic plan change (starter | pro | agency)
router.post('/change-plan', async (req, res) => {
  const userId = req.auth!.userId
  const { planId } = req.body as { planId: string }

  // Validate planId
  if (!planId || !['starter', 'pro', 'agency'].includes(planId)) {
    res.status(400).json({ error: 'Plan inválido. Debe ser starter, pro o agency' })
    return
  }

  // Verify the plan exists in config
  const plan = getPlan(planId)
  if (!plan || plan.id !== planId) {
    res.status(400).json({ error: 'Plan no encontrado' })
    return
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    // Already on this plan
    if (user.planId === planId) {
      res.status(400).json({ error: 'Ya estás en este plan' })
      return
    }

    let organizationData: { id: string; name: string } | null = null

    if (planId === 'agency' && user.role !== 'org_admin') {
      // Upgrading to agency: create organization and set role to org_admin
      const org = await prisma.organization.create({
        data: { name: `Agencia de ${user.name}` },
      })
      organizationData = org

      await prisma.user.update({
        where: { id: userId },
        data: {
          planId: 'agency',
          role: 'org_admin',
          organizationId: org.id,
        },
      })
    } else if (user.planId === 'agency' && planId !== 'agency') {
      // Downgrading FROM agency: reset role back to user, disconnect from org
      await prisma.user.update({
        where: { id: userId },
        data: {
          planId,
          role: 'user',
          organizationId: null,
        },
      })
    } else {
      // Switching between starter <-> pro (no role change needed)
      await prisma.user.update({
        where: { id: userId },
        data: { planId },
      })
    }

    // Reset credits for the new plan
    await resetCreditsForPlan(userId, planId)

    const updatedUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!updatedUser) {
      res.status(500).json({ error: 'Error al obtener usuario actualizado' })
      return
    }

    const response: Record<string, unknown> = {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planId: updatedUser.planId,
        onboardingDone: updatedUser.onboardingDone,
        profession: updatedUser.profession,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        creditBalance: updatedUser.creditBalance,
      },
    }

    if (organizationData) {
      response.organization = organizationData
    }

    res.json(response)
  } catch (err) {
    console.error('[User] Error changing plan:', err)
    res.status(500).json({ error: 'Error al cambiar de plan' })
  }
})

export default router
