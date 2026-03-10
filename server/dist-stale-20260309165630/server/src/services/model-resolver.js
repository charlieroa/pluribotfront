import { AVAILABLE_MODELS } from '../../../shared/types.js';
// Build model lookup from the single source of truth
const MODEL_LOOKUP = Object.fromEntries(AVAILABLE_MODELS.map(m => [m.id, { provider: m.provider, model: m.model }]));
// Resolve a model override string to a provider config
export function resolveModelConfig(modelId, agentDefaults) {
    const override = MODEL_LOOKUP[modelId];
    if (!override)
        return null;
    return {
        ...override,
        maxTokens: agentDefaults?.maxTokens,
        temperature: agentDefaults?.temperature,
        jsonMode: agentDefaults?.jsonMode,
    };
}
// Pass config through — let the actual LLM call handle provider errors
// instead of blocking with a cached health check that may be stale.
export async function resolveAvailableConfig(config) {
    return config;
}
//# sourceMappingURL=model-resolver.js.map