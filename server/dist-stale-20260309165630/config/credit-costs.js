// Credit costs per model (per 1K tokens) and per tool (fixed)
const modelCosts = {
    // Anthropic
    'claude-opus-4-6': { inputPer1K: 3.0, outputPer1K: 15.0 },
    'claude-sonnet-4-5-20250929': { inputPer1K: 0.6, outputPer1K: 3.0 },
    'claude-haiku-4-5-20251001': { inputPer1K: 0.2, outputPer1K: 1.0 },
    // OpenAI
    'gpt-4.5-preview': { inputPer1K: 1.5, outputPer1K: 7.5 },
    'gpt-4o': { inputPer1K: 0.5, outputPer1K: 2.5 },
    'gpt-4o-mini': { inputPer1K: 0.03, outputPer1K: 0.12 },
    // Google
    'gemini-2.5-pro': { inputPer1K: 0.25, outputPer1K: 1.0 },
    'gemini-2.5-flash': { inputPer1K: 0.015, outputPer1K: 0.06 },
};
const toolCosts = {
    generate_image: 10,
    generate_video: 200,
    search_stock_photo: 0,
    search_web: 0,
    run_code: 0,
    deploy_site: 0,
};
export function calculateTokenCredits(model, inputTokens, outputTokens) {
    const cost = modelCosts[model];
    if (!cost) {
        // Fallback: assume mid-range cost
        return Math.ceil((inputTokens / 1000) * 0.5 + (outputTokens / 1000) * 2.5);
    }
    const raw = (inputTokens / 1000) * cost.inputPer1K + (outputTokens / 1000) * cost.outputPer1K;
    return Math.max(1, Math.ceil(raw)); // minimum 1 credit per call
}
export function getToolCreditCost(toolName) {
    return toolCosts[toolName] ?? 0;
}
//# sourceMappingURL=credit-costs.js.map