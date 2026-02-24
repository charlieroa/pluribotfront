import type { LLMProviderConfig } from './llm/types.js'
import { isProviderAvailable } from './provider-health.js'

// Resolve a model override string to a provider config
export function resolveModelConfig(modelId: string, agentDefaults?: LLMProviderConfig): LLMProviderConfig | null {
  const models: Record<string, LLMProviderConfig> = {
    'claude-opus': { provider: 'anthropic', model: 'claude-opus-4-6' },
    'claude-sonnet': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    'claude-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
    'gpt-4.5': { provider: 'openai', model: 'gpt-4.5-preview' },
    'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
    'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
    'gemini-2.5-pro': { provider: 'google', model: 'gemini-2.5-pro' },
    'gemini-2.5-flash': { provider: 'google', model: 'gemini-2.5-flash' },
  }
  const override = models[modelId]
  if (!override) return null
  return {
    ...override,
    maxTokens: agentDefaults?.maxTokens,
    temperature: agentDefaults?.temperature,
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
}

export async function resolveAvailableConfig(config: LLMProviderConfig): Promise<LLMProviderConfig | null> {
  // First check if the requested provider is available
  if (await isProviderAvailable(config.provider)) {
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
      }
    }
  }

  // No provider available
  console.error('[Provider] No providers available!')
  return null
}
