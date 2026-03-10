import { AnthropicProvider } from './anthropic.js';
const providerCache = new Map();
export function getProvider(config) {
    const cacheKey = `${config.provider}:${config.model}:${config.apiKey ?? 'env'}:${config.maxTokens ?? 'default'}:${config.temperature ?? 'default'}:${config.budgetTokens ?? 0}:${config.jsonMode ?? false}`;
    const cached = providerCache.get(cacheKey);
    if (cached)
        return cached;
    if (config.provider !== 'anthropic') {
        throw new Error(`Unsupported LLM provider: ${config.provider}. Only 'anthropic' is supported.`);
    }
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new Error('ANTHROPIC_API_KEY not configured');
    const provider = new AnthropicProvider(apiKey, config.model, config.maxTokens, config.temperature, config.budgetTokens);
    providerCache.set(cacheKey, provider);
    return provider;
}
//# sourceMappingURL=router.js.map