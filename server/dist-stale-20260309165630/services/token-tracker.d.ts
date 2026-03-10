export declare function trackUsage(userId: string, agentId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
export declare function getMonthlyUsage(userId: string): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    byAgent: Array<{
        agentId: string;
        inputTokens: number;
        outputTokens: number;
    }>;
}>;
//# sourceMappingURL=token-tracker.d.ts.map