import { describe, it, expect } from 'vitest'
import { resolveModelConfig, FALLBACK_MODELS } from './model-resolver.js'

describe('resolveModelConfig', () => {
  it('resolves a known model ID to a provider config', () => {
    const result = resolveModelConfig('claude-sonnet')
    expect(result).not.toBeNull()
    expect(result!.provider).toBe('anthropic')
    expect(result!.model).toContain('claude-sonnet')
  })

  it('resolves gpt-4o correctly', () => {
    const result = resolveModelConfig('gpt-4o')
    expect(result).not.toBeNull()
    expect(result!.provider).toBe('openai')
    expect(result!.model).toBe('gpt-4o')
  })

  it('resolves gemini-2.5-pro correctly', () => {
    const result = resolveModelConfig('gemini-2.5-pro')
    expect(result).not.toBeNull()
    expect(result!.provider).toBe('google')
    expect(result!.model).toBe('gemini-2.5-pro')
  })

  it('returns null for an unknown model ID', () => {
    const result = resolveModelConfig('unknown-model')
    expect(result).toBeNull()
  })

  it('carries over maxTokens and temperature from agent defaults', () => {
    const defaults = { provider: 'anthropic' as const, model: 'default', maxTokens: 4096, temperature: 0.7 }
    const result = resolveModelConfig('gpt-4o', defaults)
    expect(result).not.toBeNull()
    expect(result!.maxTokens).toBe(4096)
    expect(result!.temperature).toBe(0.7)
    expect(result!.provider).toBe('openai')
  })
})

describe('FALLBACK_MODELS', () => {
  it('has fallbacks for anthropic', () => {
    expect(FALLBACK_MODELS['anthropic']).toBeDefined()
    expect(FALLBACK_MODELS['anthropic'].length).toBeGreaterThan(0)
  })

  it('has fallbacks for openai', () => {
    expect(FALLBACK_MODELS['openai']).toBeDefined()
    expect(FALLBACK_MODELS['openai'].length).toBeGreaterThan(0)
  })

  it('has fallbacks for google', () => {
    expect(FALLBACK_MODELS['google']).toBeDefined()
    expect(FALLBACK_MODELS['google'].length).toBeGreaterThan(0)
  })

  it('fallback providers differ from the primary', () => {
    for (const [primary, fallbacks] of Object.entries(FALLBACK_MODELS)) {
      for (const fb of fallbacks) {
        expect(fb.provider).not.toBe(primary)
      }
    }
  })
})
