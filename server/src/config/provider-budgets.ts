// Provider budget tracking — stores how much USD was loaded per provider
// and the baseline cost at the time of loading, to calculate remaining balance.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUDGETS_FILE = join(__dirname, '..', '..', 'provider-budgets.json')

export interface ProviderBudget {
  budget: number       // USD loaded (e.g. 20)
  baselineCost: number // cumulative cost at time of setting budget
  setAt: string        // ISO date
}

export type BudgetProvider = 'anthropic' | 'openai' | 'google' | 'midjourney' | 'deepseek'

type BudgetsMap = Record<BudgetProvider, ProviderBudget | null>

const EMPTY_BUDGETS: BudgetsMap = {
  anthropic: null,
  openai: null,
  google: null,
  midjourney: null,
  deepseek: null,
}

function readBudgets(): BudgetsMap {
  if (!existsSync(BUDGETS_FILE)) return { ...EMPTY_BUDGETS }
  try {
    return { ...EMPTY_BUDGETS, ...JSON.parse(readFileSync(BUDGETS_FILE, 'utf-8')) }
  } catch {
    return { ...EMPTY_BUDGETS }
  }
}

function writeBudgets(budgets: BudgetsMap): void {
  writeFileSync(BUDGETS_FILE, JSON.stringify(budgets, null, 2), 'utf-8')
}

export function getBudgets(): BudgetsMap {
  return readBudgets()
}

export function setBudget(provider: BudgetProvider, budget: number, baselineCost: number): BudgetsMap {
  const budgets = readBudgets()
  budgets[provider] = { budget, baselineCost, setAt: new Date().toISOString() }
  writeBudgets(budgets)
  return budgets
}

export function clearBudget(provider: BudgetProvider): BudgetsMap {
  const budgets = readBudgets()
  budgets[provider] = null
  writeBudgets(budgets)
  return budgets
}

// Calculate remaining USD for a provider
export function calculateRemaining(
  budget: ProviderBudget | null,
  currentCost: number
): { remaining: number; used: number; alert: boolean } | null {
  if (!budget) return null
  const used = Math.max(0, currentCost - budget.baselineCost)
  const remaining = Math.max(0, budget.budget - used)
  return { remaining: Math.round(remaining * 100) / 100, used: Math.round(used * 100) / 100, alert: remaining <= 2 }
}
