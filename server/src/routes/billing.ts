import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { createCreditCheckout, createPlanCheckout, isStripeConfigured, processStripeWebhook } from '../services/stripe.js'
import { prisma } from '../db/client.js'

const router = Router()

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? '')
    await processStripeWebhook(rawBody, req.headers['stripe-signature'])
    res.json({ received: true })
  } catch (err) {
    console.error('[Billing] Stripe webhook error:', err)
    res.status(400).json({ error: (err as Error).message || 'Stripe webhook error' })
  }
}

router.use(authMiddleware)

router.get('/status', async (req, res) => {
  const userId = req.auth!.userId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
    },
  })

  const recentCheckouts = await prisma.billingCheckout.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  res.json({
    stripeConfigured: isStripeConfigured(),
    user,
    recentCheckouts,
  })
})

router.post('/checkout/credits', async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe no esta configurado en el servidor' })
      return
    }
    const { packageId } = req.body as { packageId: string }
    const result = await createCreditCheckout(req.auth!.userId, packageId)
    res.json({ success: true, ...result, requiresRedirect: true })
  } catch (err) {
    console.error('[Billing] Credit checkout error:', err)
    res.status(400).json({ error: (err as Error).message || 'No se pudo crear el checkout' })
  }
})

router.post('/checkout/plan', async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe no esta configurado en el servidor' })
      return
    }
    const { planId } = req.body as { planId: string }
    const result = await createPlanCheckout(req.auth!.userId, planId)
    res.json({ success: true, ...result, requiresRedirect: true })
  } catch (err) {
    console.error('[Billing] Plan checkout error:', err)
    res.status(400).json({ error: (err as Error).message || 'No se pudo crear el checkout' })
  }
})

export default router
