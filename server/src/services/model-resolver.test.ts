import { describe, it, expect } from 'vitest'
import { resolveModelConfig } from './model-resolver.js'

describe('resolveModelConfig', () => {
  it('resolves a known model ID to a provider config', () => {
    const result = resolveModelConfig('claude-sonnet')
    expect(result).not.toBeNull()
    expect(result!.provider).toBe('anthropic')
    expect(result!.model).toContain('claude-sonnet')
  })

  it('resolves claude-opus correctly', () => {
    const result = resolveModelConfig('claude-opus')
    expect(result).not.toBeNull()
    expect(result!.provider).toBe('anthropic')
    expect(result!.model).toContain('claude-opus')
  })

  it('resolves claude-haiku correctly', () => {
    const result = resolveModelConfig('claude-haiku')
    expect(result).not.toBeNull()
    expect(result!.provider).toBe('anthropic')
    expect(result!.model).toContain('claude-haiku')
  })

  it('returns null for an unknown model ID', () => {
    const result = resolveModelConfig('unknown-model')
    expect(result).toBeNull()
  })

  it('returns null for removed providers', () => {
    expect(resolveModelConfig('gpt-4o')).toBeNull()
    expect(resolveModelConfig('gemini-2.5-pro')).toBeNull()
  })

  it('carries over maxTokens and temperature from agent defaults', () => {
    const defaults = { provider: 'anthropic' as const, model: 'default', maxTokens: 4096, temperature: 0.7 }
    const result = resolveModelConfig('claude-sonnet', defaults)
    expect(result).not.toBeNull()
    expect(result!.maxTokens).toBe(4096)
    expect(result!.temperature).toBe(0.7)
    expect(result!.provider).toBe('anthropic')
  })
})
