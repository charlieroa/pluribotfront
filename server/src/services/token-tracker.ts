import { prisma } from '../db/client.js'

export async function trackUsage(
  userId: string,
  agentId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  await prisma.usageRecord.create({
    data: {
      userId,
      agentId,
      model,
      inputTokens,
      outputTokens,
    },
  })
}

export async function getMonthlyUsage(userId: string): Promise<{
  totalInputTokens: number
  totalOutputTokens: number
  byAgent: Array<{ agentId: string; inputTokens: number; outputTokens: number }>
}> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  })

  let totalInputTokens = 0
  let totalOutputTokens = 0
  const byAgentMap = new Map<string, { inputTokens: number; outputTokens: number }>()

  for (const r of records) {
    totalInputTokens += r.inputTokens
    totalOutputTokens += r.outputTokens
    const existing = byAgentMap.get(r.agentId) ?? { inputTokens: 0, outputTokens: 0 }
    existing.inputTokens += r.inputTokens
    existing.outputTokens += r.outputTokens
    byAgentMap.set(r.agentId, existing)
  }

  const byAgent = Array.from(byAgentMap.entries()).map(([agentId, usage]) => ({
    agentId,
    ...usage,
  }))

  return { totalInputTokens, totalOutputTokens, byAgent }
}
