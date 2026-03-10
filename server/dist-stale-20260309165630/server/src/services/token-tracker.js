import { prisma } from '../db/client.js';
export async function trackUsage(userId, agentId, model, inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens, conversationId) {
    await prisma.usageRecord.create({
        data: {
            userId,
            agentId,
            model,
            inputTokens,
            outputTokens,
            cacheCreationInputTokens: cacheCreationInputTokens ?? 0,
            cacheReadInputTokens: cacheReadInputTokens ?? 0,
            conversationId: conversationId ?? null,
        },
    });
}
export async function getMonthlyUsage(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const records = await prisma.usageRecord.findMany({
        where: {
            userId,
            createdAt: { gte: startOfMonth },
        },
    });
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const byAgentMap = new Map();
    for (const r of records) {
        totalInputTokens += r.inputTokens;
        totalOutputTokens += r.outputTokens;
        const existing = byAgentMap.get(r.agentId) ?? { inputTokens: 0, outputTokens: 0 };
        existing.inputTokens += r.inputTokens;
        existing.outputTokens += r.outputTokens;
        byAgentMap.set(r.agentId, existing);
    }
    const byAgent = Array.from(byAgentMap.entries()).map(([agentId, usage]) => ({
        agentId,
        ...usage,
    }));
    return { totalInputTokens, totalOutputTokens, byAgent };
}
//# sourceMappingURL=token-tracker.js.map