// Real API costs in USD per 1M tokens (from Anthropic pricing page)
export const apiCostsPerMillionTokens = {
    'claude-opus-4-6': { input: 5.00, output: 25.00 },
    'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
    'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
};
// Real API costs in USD per tool call
export const toolApiCosts = {
    generate_image: 0.05, // ~average Imagen 4 cost
    generate_video: 2.50, // ~average Veo 3 cost
    search_stock_photo: 0,
    search_web: 0,
    run_code: 0,
    deploy_site: 0,
};
export function getProviderForModel(_model) {
    return 'anthropic';
}
export function calculateRealCost(model, inputTokens, outputTokens) {
    const costs = apiCostsPerMillionTokens[model] || { input: 3.00, output: 15.00 };
    return (inputTokens / 1_000_000 * costs.input) + (outputTokens / 1_000_000 * costs.output);
}
//# sourceMappingURL=api-costs.js.map