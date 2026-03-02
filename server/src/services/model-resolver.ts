import type { LLMProviderConfig } from './llm/types.js'
import { isProviderAvailable } from './provider-health.js'
import { AVAILABLE_MODELS } from '../../../shared/types.js'

// Build model lookup from the single source of truth
const MODEL_LOOKUP: Record<string, LLMProviderConfig> = Object.fromEntries(
  AVAILABLE_MODELS.map(m => [m.id, { provider: m.provider, model: m.model }])
)

// Resolve a model override string to a provider config
export function resolveModelConfig(modelId: string, agentDefaults?: LLMProviderConfig): LLMProviderConfig | null {
  const override = MODEL_LOOKUP[modelId]
  if (!override) return null
  return {
    ...override,
    maxTokens: agentDefaults?.maxTokens,
    temperature: agentDefaults?.temperature,
    jsonMode: agentDefaults?.jsonMode,
  }
}

// Default fallback order when a provider is unavailable
export const FALLBACK_MODELS: Record<string, LLMProviderConfig[]> = {
  anthropic: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'google', model: 'gemini-2.5-pro' },
  ],
  openai: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    { provider: 'google', model: 'gemini-2.5-pro' },
  ],
  google: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    { provider: 'openai', model: 'gpt-4o' },
  ],
  deepseek: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    { provider: 'openai', model: 'gpt-4o' },
  ],
}

export async function resolveAvailableConfig(config: LLMProviderConfig): Promise<LLMProviderConfig | null> {
  // First check if the requested provider is available
  if (await isProviderAvailable(config.provider as any)) {
    return config
  }

  console.warn(`[Provider] ${config.provider} unavailable, trying fallbacks...`)

  // Try fallback providers
  const fallbacks = FALLBACK_MODELS[config.provider] ?? []
  for (const fb of fallbacks) {
    if (await isProviderAvailable(fb.provider)) {
      console.log(`[Provider] Falling back to ${fb.provider} (${fb.model})`)
      return {
        ...fb,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        jsonMode: config.jsonMode,
      }
    }
  }

  // No provider available
  console.error('[Provider] No providers available!')
  return null
}
