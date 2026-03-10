// Provider budget tracking — stores how much USD was loaded per provider
// and the baseline cost at the time of loading, to calculate remaining balance.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const BUDGETS_FILE = join(__dirname, '..', '..', 'provider-budgets.json');
const EMPTY_BUDGETS = {
    anthropic: null,
    midjourney: null,
};
function readBudgets() {
    if (!existsSync(BUDGETS_FILE))
        return { ...EMPTY_BUDGETS };
    try {
        const raw = JSON.parse(readFileSync(BUDGETS_FILE, 'utf-8'));
        // Only pick valid keys
        return {
            anthropic: raw.anthropic ?? null,
            midjourney: raw.midjourney ?? null,
        };
    }
    catch {
        return { ...EMPTY_BUDGETS };
    }
}
function writeBudgets(budgets) {
    writeFileSync(BUDGETS_FILE, JSON.stringify(budgets, null, 2), 'utf-8');
}
export function getBudgets() {
    return readBudgets();
}
export function setBudget(provider, budget, baselineCost) {
    const budgets = readBudgets();
    budgets[provider] = { budget, baselineCost, setAt: new Date().toISOString() };
    writeBudgets(budgets);
    return budgets;
}
export function clearBudget(provider) {
    const budgets = readBudgets();
    budgets[provider] = null;
    writeBudgets(budgets);
    return budgets;
}
// Calculate remaining USD for a provider
export function calculateRemaining(budget, currentCost) {
    if (!budget)
        return null;
    const used = Math.max(0, currentCost - budget.baselineCost);
    const remaining = Math.max(0, budget.budget - used);
    return { remaining: Math.round(remaining * 100) / 100, used: Math.round(used * 100) / 100, alert: remaining <= 2 };
}
//# sourceMappingURL=provider-budgets.js.map