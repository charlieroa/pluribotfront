export interface PlanConfig {
  id: string
  name: string
  price: number
  tokenLimit: number
  maxAgents: number
}

export const plans: Record<string, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    tokenLimit: 500_000,
    maxAgents: 2,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 79,
    tokenLimit: 2_000_000,
    maxAgents: 10,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 199,
    tokenLimit: 10_000_000,
    maxAgents: -1, // unlimited
  },
}

export function getPlan(planId: string): PlanConfig {
  return plans[planId] ?? plans.starter
}
