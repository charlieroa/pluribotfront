// Credit costs per model (per 1K tokens) and per tool (fixed)
const modelCosts = {
    'claude-opus-4-6': { inputPer1K: 3.0, outputPer1K: 15.0 },
    'claude-sonnet-4-5-20250929': { inputPer1K: 0.6, outputPer1K: 3.0 },
    'claude-haiku-4-5-20251001': { inputPer1K: 0.2, outputPer1K: 1.0 },
};
const toolCosts = {
    generate_image: 10,
    generate_video: 200,
    search_stock_photo: 0,
    search_web: 0,
    run_code: 0,
    deploy_site: 0,
};
export function calculateTokenCredits(model, inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens) {
    const cost = modelCosts[model];
    if (!cost) {
        // Fallback: assume Sonnet-level cost
        return Math.ceil((inputTokens / 1000) * 0.6 + (outputTokens / 1000) * 3.0);
    }
    let raw = (inputTokens / 1000) * cost.inputPer1K + (outputTokens / 1000) * cost.outputPer1K;
    // Cache creation tokens cost 1.25x input rate
    if (cacheCreationInputTokens) {
        raw += (cacheCreationInputTokens / 1000) * cost.inputPer1K * 1.25;
    }
    // Cache read tokens cost 0.1x input rate
    if (cacheReadInputTokens) {
        raw += (cacheReadInputTokens / 1000) * cost.inputPer1K * 0.1;
    }
    return Math.max(1, Math.ceil(raw)); // minimum 1 credit per call
}
export function getToolCreditCost(toolName) {
    return toolCosts[toolName] ?? 0;
}
//# sourceMappingURL=credit-costs.js.map