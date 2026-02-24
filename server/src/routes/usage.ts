import { Router } from 'express'
import { optionalAuth, authMiddleware } from '../middleware/auth.js'
import { getMonthlyUsage } from '../services/token-tracker.js'
import { getCreditUsage, adminGrantCredits } from '../services/credit-tracker.js'
import { prisma } from '../db/client.js'
import { getPlan, getCreditPackage, creditPackages } from '../config/plans.js'

const router = Router()

router.get('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const plan = getPlan(user?.planId ?? 'starter')
  const usage = await getMonthlyUsage(userId)
  const creditUsage = await getCreditUsage(userId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  res.json({
    totalInputTokens: usage.totalInputTokens,
    totalOutputTokens: usage.totalOutputTokens,
    tokenLimit: plan.monthlyCredits * 1000, // backwards compat
    byAgent: usage.byAgent,
    period: {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString(),
    },
    // Credit system data
    credits: creditUsage ? {
      balance: creditUsage.balance,
      monthlyCredits: creditUsage.monthlyCredits,
      totalConsumed: creditUsage.totalConsumed,
      planId: creditUsage.planId,
      cycleStart: creditUsage.cycleStart,
      byAgent: creditUsage.byAgent,
      byModel: creditUsage.byModel,
    } : null,
  })
})

/* ───── Credit Packages list (public) ───── */
router.get('/credit-packages', (_req, res) => {
  res.json({ packages: creditPackages })
})

/* ───── Purchase credit add-on ───── */
// TODO: Integrate Stripe payment processing before granting credits.
//       Currently credits are granted immediately for testing purposes.
router.post('/purchase-credits', authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId
    const { packageId } = req.body as { packageId: string }

    if (!packageId) {
      res.status(400).json({ error: 'packageId es requerido' })
      return
    }

    const pkg = getCreditPackage(packageId)
    if (!pkg) {
      res.status(404).json({ error: 'Paquete de créditos no encontrado' })
      return
    }

    // TODO: Process payment via Stripe here before granting credits
    // const paymentIntent = await stripe.paymentIntents.create({ amount: pkg.price * 100, currency: 'usd', ... })

    // Grant the credits to the user
    const result = await adminGrantCredits(
      userId,
      pkg.credits,
      `Compra de paquete: ${pkg.name} ($${pkg.price} USD)`
    )

    res.json({
      success: true,
      package: { id: pkg.id, name: pkg.name, credits: pkg.credits, price: pkg.price },
      newBalance: result.balance,
    })
  } catch (err) {
    console.error('[purchase-credits] Error:', err)
    res.status(500).json({ error: 'Error al procesar la compra de créditos' })
  }
})

export default router
