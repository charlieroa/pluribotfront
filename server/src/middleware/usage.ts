import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client.js'
import { getPlan } from '../config/plans.js'

export async function usageMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) {
    next()
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } })
  if (!user) {
    res.status(401).json({ error: 'Usuario no encontrado' })
    return
  }

  const plan = getPlan(user.planId)
  if (plan.tokenLimit === -1) {
    next()
    return
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const usage = await prisma.usageRecord.aggregate({
    where: {
      userId: user.id,
      createdAt: { gte: startOfMonth },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  })

  const totalTokens = (usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0)

  if (totalTokens >= plan.tokenLimit) {
    res.status(429).json({
      error: 'Límite de tokens alcanzado',
      usage: totalTokens,
      limit: plan.tokenLimit,
      plan: plan.name,
    })
    return
  }

  next()
}
