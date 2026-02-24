import type { LLMProvider, LLMProviderConfig } from './types.js'
import { AnthropicProvider } from './anthropic.js'
import { OpenAIProvider } from './openai.js'
import { GeminiProvider } from './gemini.js'

const providerCache = new Map<string, LLMProvider>()

export function getProvider(config: LLMProviderConfig): LLMProvider {
  const cacheKey = `${config.provider}:${config.model}:${config.apiKey ?? 'env'}:${config.maxTokens ?? 'default'}:${config.temperature ?? 'default'}:${config.budgetTokens ?? 0}`

  const cached = providerCache.get(cacheKey)
  if (cached) return cached

  let provider: LLMProvider

  switch (config.provider) {
    case 'anthropic': {
      const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
      provider = new AnthropicProvider(apiKey, config.model, config.maxTokens, config.temperature, config.budgetTokens)
      break
    }
    case 'openai': {
      const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
      provider = new OpenAIProvider(apiKey, config.model, config.temperature)
      break
    }
    case 'google': {
      const apiKey = config.apiKey ?? process.env.GOOGLE_API_KEY
      if (!apiKey) throw new Error('GOOGLE_API_KEY not configured')
      provider = new GeminiProvider(apiKey, config.model, config.temperature)
      break
    }
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }

  providerCache.set(cacheKey, provider)
  return provider
}
