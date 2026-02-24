import { prisma } from '../db/client.js'
import { calculateTokenCredits, getToolCreditCost } from '../config/credit-costs.js'
import { getPlan } from '../config/plans.js'

const CYCLE_DAYS = 30

export interface CreditCheckResult {
  allowed: boolean
  balance: number
  planId: string
  monthlyCredits: number
}

export interface CreditUsageResult {
  creditsUsed: number
  balance: number
}

/**
 * Pre-check: can this user spend credits?
 * Also triggers monthly auto-reset if needed.
 */
export async function checkCredits(userId: string): Promise<CreditCheckResult> {
  await maybeResetCredits(userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true, planId: true },
  })

  if (!user) {
    return { allowed: false, balance: 0, planId: 'starter', monthlyCredits: 0 }
  }

  const plan = getPlan(user.planId)
  return {
    allowed: user.creditBalance > 0,
    balance: user.creditBalance,
    planId: user.planId,
    monthlyCredits: plan.monthlyCredits,
  }
}

/**
 * Consume credits after an LLM call. Also records a UsageRecord.
 */
export async function consumeCredits(
  userId: string,
  agentId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationInputTokens?: number,
  cacheReadInputTokens?: number
): Promise<CreditUsageResult> {
  const credits = calculateTokenCredits(model, inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens)

  // Create usage record
  const usageRecord = await prisma.usageRecord.create({
    data: { userId, agentId, model, inputTokens, outputTokens },
  })

  // Atomically deduct credits and record ledger entry
  const user = await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { decrement: credits } },
    select: { creditBalance: true },
  })

  await prisma.creditLedger.create({
    data: {
      userId,
      amount: -credits,
      balance: user.creditBalance,
      type: 'consumption',
      description: `${agentId} — ${model} (${inputTokens}in/${outputTokens}out)`,
      model,
      agentId,
      usageRecordId: usageRecord.id,
    },
  })

  return { creditsUsed: credits, balance: user.creditBalance }
}

/**
 * Consume credits for a tool execution (image/video generation).
 */
export async function consumeToolCredits(
  userId: string,
  agentId: string,
  toolName: string
): Promise<CreditUsageResult> {
  const credits = getToolCreditCost(toolName)
  if (credits === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditBalance: true } })
    return { creditsUsed: 0, balance: user?.creditBalance ?? 0 }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { decrement: credits } },
    select: { creditBalance: true },
  })

  await prisma.creditLedger.create({
    data: {
      userId,
      amount: -credits,
      balance: user.creditBalance,
      type: 'tool_consumption',
      description: `${agentId} — tool:${toolName}`,
      agentId,
    },
  })

  return { creditsUsed: credits, balance: user.creditBalance }
}

/**
 * Admin grants credits to a user.
 */
export async function adminGrantCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<{ balance: number }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: amount } },
    select: { creditBalance: true },
  })

  await prisma.creditLedger.create({
    data: {
      userId,
      amount,
      balance: user.creditBalance,
      type: 'admin_grant',
      description: reason,
    },
  })

  return { balance: user.creditBalance }
}

/**
 * Get credit usage summary for a user's current billing cycle.
 */
export async function getCreditUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true, planId: true, billingCycleStart: true },
  })

  if (!user) return null

  const plan = getPlan(user.planId)
  const cycleStart = user.billingCycleStart ?? new Date()

  const consumed = await prisma.creditLedger.aggregate({
    where: {
      userId,
      type: { in: ['consumption', 'tool_consumption'] },
      createdAt: { gte: cycleStart },
    },
    _sum: { amount: true },
  })

  const granted = await prisma.creditLedger.aggregate({
    where: {
      userId,
      type: { in: ['plan_grant', 'admin_grant'] },
      createdAt: { gte: cycleStart },
    },
    _sum: { amount: true },
  })

  // Per-agent breakdown
  const ledgerEntries = await prisma.creditLedger.findMany({
    where: {
      userId,
      type: { in: ['consumption', 'tool_consumption'] },
      createdAt: { gte: cycleStart },
    },
    select: { agentId: true, amount: true },
  })

  const byAgent: Record<string, number> = {}
  for (const entry of ledgerEntries) {
    if (entry.agentId) {
      byAgent[entry.agentId] = (byAgent[entry.agentId] ?? 0) + Math.abs(entry.amount)
    }
  }

  // Per-model breakdown
  const modelEntries = await prisma.creditLedger.findMany({
    where: {
      userId,
      type: 'consumption',
      createdAt: { gte: cycleStart },
      model: { not: null },
    },
    select: { model: true, amount: true },
  })

  const byModel: Record<string, number> = {}
  for (const entry of modelEntries) {
    if (entry.model) {
      byModel[entry.model] = (byModel[entry.model] ?? 0) + Math.abs(entry.amount)
    }
  }

  return {
    balance: user.creditBalance,
    planId: user.planId,
    monthlyCredits: plan.monthlyCredits,
    totalConsumed: Math.abs(consumed._sum.amount ?? 0),
    totalGranted: granted._sum.amount ?? 0,
    cycleStart: cycleStart.toISOString(),
    byAgent: Object.entries(byAgent).map(([agentId, credits]) => ({ agentId, credits })),
    byModel: Object.entries(byModel).map(([model, credits]) => ({ model, credits })),
  }
}

/**
 * Auto-reset credits if the billing cycle has expired (30 days).
 * Grants the plan's monthly credits and resets the cycle start.
 */
export async function maybeResetCredits(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { billingCycleStart: true, planId: true, creditBalance: true },
  })

  if (!user) return false

  const now = new Date()

  // If no billing cycle start, initialize it and grant initial credits
  if (!user.billingCycleStart) {
    const plan = getPlan(user.planId)
    await prisma.user.update({
      where: { id: userId },
      data: {
        billingCycleStart: now,
        creditBalance: plan.monthlyCredits,
      },
    })

    await prisma.creditLedger.create({
      data: {
        userId,
        amount: plan.monthlyCredits,
        balance: plan.monthlyCredits,
        type: 'plan_grant',
        description: `Creditos iniciales plan ${plan.name}`,
      },
    })

    return true
  }

  // Check if 30 days have passed
  const daysSinceCycleStart = (now.getTime() - user.billingCycleStart.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceCycleStart < CYCLE_DAYS) return false

  // Reset
  const plan = getPlan(user.planId)

  // Reset balance to plan credits (don't accumulate)
  await prisma.user.update({
    where: { id: userId },
    data: {
      billingCycleStart: now,
      creditBalance: plan.monthlyCredits,
    },
  })

  await prisma.creditLedger.create({
    data: {
      userId,
      amount: plan.monthlyCredits,
      balance: plan.monthlyCredits,
      type: 'reset',
      description: `Reset mensual plan ${plan.name}`,
    },
  })

  return true
}

/**
 * Set credits for a user when their plan changes.
 */
export async function resetCreditsForPlan(userId: string, planId: string): Promise<void> {
  const plan = getPlan(planId)
  const now = new Date()

  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: plan.monthlyCredits,
      billingCycleStart: now,
    },
  })

  await prisma.creditLedger.create({
    data: {
      userId,
      amount: plan.monthlyCredits,
      balance: plan.monthlyCredits,
      type: 'plan_grant',
      description: `Cambio a plan ${plan.name}`,
    },
  })
}
