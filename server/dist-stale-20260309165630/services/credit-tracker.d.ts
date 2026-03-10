export interface CreditCheckResult {
    allowed: boolean;
    balance: number;
    planId: string;
    monthlyCredits: number;
}
export interface CreditUsageResult {
    creditsUsed: number;
    balance: number;
}
/**
 * Pre-check: can this user spend credits?
 * Also triggers monthly auto-reset if needed.
 */
export declare function checkCredits(userId: string): Promise<CreditCheckResult>;
/**
 * Consume credits after an LLM call. Also records a UsageRecord.
 */
export declare function consumeCredits(userId: string, agentId: string, model: string, inputTokens: number, outputTokens: number): Promise<CreditUsageResult>;
/**
 * Consume credits for a tool execution (image/video generation).
 */
export declare function consumeToolCredits(userId: string, agentId: string, toolName: string): Promise<CreditUsageResult>;
/**
 * Admin grants credits to a user.
 */
export declare function adminGrantCredits(userId: string, amount: number, reason: string): Promise<{
    balance: number;
}>;
/**
 * Get credit usage summary for a user's current billing cycle.
 */
export declare function getCreditUsage(userId: string): Promise<{
    balance: number;
    planId: string;
    monthlyCredits: number;
    totalConsumed: number;
    totalGranted: number;
    cycleStart: string;
    byAgent: {
        agentId: string;
        credits: number;
    }[];
    byModel: {
        model: string;
        credits: number;
    }[];
} | null>;
/**
 * Auto-reset credits if the billing cycle has expired (30 days).
 * Grants the plan's monthly credits and resets the cycle start.
 */
export declare function maybeResetCredits(userId: string): Promise<boolean>;
/**
 * Set credits for a user when their plan changes.
 */
export declare function resetCreditsForPlan(userId: string, planId: string): Promise<void>;
//# sourceMappingURL=credit-tracker.d.ts.map