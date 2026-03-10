export interface ProviderBudget {
    budget: number;
    baselineCost: number;
    setAt: string;
}
export type BudgetProvider = 'anthropic' | 'midjourney';
type BudgetsMap = Record<BudgetProvider, ProviderBudget | null>;
export declare function getBudgets(): BudgetsMap;
export declare function setBudget(provider: BudgetProvider, budget: number, baselineCost: number): BudgetsMap;
export declare function clearBudget(provider: BudgetProvider): BudgetsMap;
export declare function calculateRemaining(budget: ProviderBudget | null, currentCost: number): {
    remaining: number;
    used: number;
    alert: boolean;
} | null;
export {};
//# sourceMappingURL=provider-budgets.d.ts.map