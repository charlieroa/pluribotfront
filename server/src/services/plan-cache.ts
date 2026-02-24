import { prisma } from '../db/client.js'

export interface OrchestratorStep {
  agentId: string
  instanceId: string          // e.g. "web-1", "web-2", "seo-1"
  task: string
  userDescription: string     // human-readable summary
  dependsOn?: string[]        // references instanceIds
}

interface ExecutionGroup {
  instanceIds: string[]
}

// State for parallel group execution
export interface ExecutingPlan {
  steps: OrchestratorStep[]
  executionGroups: ExecutionGroup[]
  currentGroupIndex: number
  completedInstances: string[]
  agentOutputs: Record<string, string>  // keyed by instanceId
  conversationId: string
  userId: string
  modelOverride?: string
  imageUrl?: string  // user-uploaded image to pass to agents
}

// Clean up plans older than 30 minutes
const PLAN_TTL = 30 * 60 * 1000

export async function setPendingPlan(messageId: string, plan: { steps: OrchestratorStep[] }): Promise<void> {
  await prisma.pendingPlan.upsert({
    where: { id: messageId },
    update: { stepsJson: JSON.stringify(plan.steps) },
    create: { id: messageId, stepsJson: JSON.stringify(plan.steps) },
  })
  cleanupOldPlans().catch(console.error)
}

export async function getPendingPlan(messageId: string): Promise<{ steps: OrchestratorStep[]; createdAt: number } | undefined> {
  const row = await prisma.pendingPlan.findUnique({ where: { id: messageId } })
  if (!row) return undefined
  return {
    steps: JSON.parse(row.stepsJson) as OrchestratorStep[],
    createdAt: row.createdAt.getTime(),
  }
}

export async function removePendingPlan(messageId: string): Promise<void> {
  await prisma.pendingPlan.delete({ where: { id: messageId } }).catch(() => {})
}

// Executing plan management (parallel groups)
export async function setExecutingPlan(conversationId: string, plan: ExecutingPlan): Promise<void> {
  await prisma.executingPlan.upsert({
    where: { conversationId },
    update: {
      stepsJson: JSON.stringify(plan.steps),
      executionGroupsJson: JSON.stringify(plan.executionGroups),
      currentGroupIndex: plan.currentGroupIndex,
      completedInstances: JSON.stringify(plan.completedInstances),
      agentOutputs: JSON.stringify(plan.agentOutputs),
      userId: plan.userId,
      modelOverride: plan.modelOverride ?? null,
      imageUrl: plan.imageUrl ?? null,
    },
    create: {
      conversationId,
      stepsJson: JSON.stringify(plan.steps),
      executionGroupsJson: JSON.stringify(plan.executionGroups),
      currentGroupIndex: plan.currentGroupIndex,
      completedInstances: JSON.stringify(plan.completedInstances),
      agentOutputs: JSON.stringify(plan.agentOutputs),
      userId: plan.userId,
      modelOverride: plan.modelOverride ?? null,
      imageUrl: plan.imageUrl ?? null,
    },
  })
}

export async function getExecutingPlan(conversationId: string): Promise<ExecutingPlan | undefined> {
  const row = await prisma.executingPlan.findUnique({ where: { conversationId } })
  if (!row) return undefined
  return {
    steps: JSON.parse(row.stepsJson) as OrchestratorStep[],
    executionGroups: JSON.parse(row.executionGroupsJson) as ExecutionGroup[],
    currentGroupIndex: row.currentGroupIndex,
    completedInstances: JSON.parse(row.completedInstances) as string[],
    agentOutputs: JSON.parse(row.agentOutputs) as Record<string, string>,
    conversationId: row.conversationId,
    userId: row.userId,
    modelOverride: row.modelOverride ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
  }
}

export async function removeExecutingPlan(conversationId: string): Promise<void> {
  await prisma.executingPlan.delete({ where: { conversationId } }).catch(() => {})
}

async function cleanupOldPlans(): Promise<void> {
  const cutoff = new Date(Date.now() - PLAN_TTL)
  await prisma.pendingPlan.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
}
