import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { getMonthlyUsage } from '../services/token-tracker.js'
import { prisma } from '../db/client.js'
import { getPlan } from '../config/plans.js'
import type { UsageResponse } from '../../../shared/types.js'

const router = Router()

router.get('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const plan = getPlan(user?.planId ?? 'starter')
  const usage = await getMonthlyUsage(userId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const response: UsageResponse = {
    totalInputTokens: usage.totalInputTokens,
    totalOutputTokens: usage.totalOutputTokens,
    tokenLimit: plan.tokenLimit,
    byAgent: usage.byAgent,
    period: {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString(),
    },
  }

  res.json(response)
})

export default router
