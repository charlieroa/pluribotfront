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

interface PendingPlan {
  steps: OrchestratorStep[]
  createdAt: number
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

const pendingPlans = new Map<string, PendingPlan>()
const executingPlans = new Map<string, ExecutingPlan>()

// Clean up plans older than 30 minutes
const PLAN_TTL = 30 * 60 * 1000

export function setPendingPlan(messageId: string, plan: { steps: OrchestratorStep[] }): void {
  pendingPlans.set(messageId, { ...plan, createdAt: Date.now() })
  cleanupOldPlans()
}

export function getPendingPlan(messageId: string): PendingPlan | undefined {
  return pendingPlans.get(messageId)
}

export function removePendingPlan(messageId: string): void {
  pendingPlans.delete(messageId)
}

// Executing plan management (parallel groups)
export function setExecutingPlan(conversationId: string, plan: ExecutingPlan): void {
  executingPlans.set(conversationId, plan)
}

export function getExecutingPlan(conversationId: string): ExecutingPlan | undefined {
  return executingPlans.get(conversationId)
}

export function removeExecutingPlan(conversationId: string): void {
  executingPlans.delete(conversationId)
}

function cleanupOldPlans(): void {
  const now = Date.now()
  for (const [id, plan] of pendingPlans) {
    if (now - plan.createdAt > PLAN_TTL) {
      pendingPlans.delete(id)
    }
  }
}
