import type { Request, Response, NextFunction } from 'express'
import { checkCredits } from '../services/credit-tracker.js'

export async function usageMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) {
    next()
    return
  }

  const result = await checkCredits(req.auth.userId)
  if (!result.allowed) {
    res.status(429).json({
      error: 'Créditos agotados',
      balance: result.balance,
      plan: result.planId,
    })
    return
  }

  next()
}
