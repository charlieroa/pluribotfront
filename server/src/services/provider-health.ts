// Provider health check service — validates Anthropic API key and tracks status

import Anthropic from '@anthropic-ai/sdk'

export type ProviderStatus = 'active' | 'no_key' | 'invalid_key' | 'no_credits' | 'error'

export interface ProviderHealth {
  provider: 'anthropic'
  status: ProviderStatus
  label: string
  message: string
  checkedAt: string
}

interface HealthCache {
  results: ProviderHealth[]
  checkedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let healthCache: HealthCache | null = null

// Force refresh on next call
export function invalidateHealthCache(): void {
  healthCache = null
}

// Get cached or fresh health check results
export async function getProviderHealthStatus(): Promise<ProviderHealth[]> {
  if (healthCache && Date.now() - healthCache.checkedAt < CACHE_TTL_MS) {
    return healthCache.results
  }

  const results = await Promise.all([checkAnthropic()])

  healthCache = { results, checkedAt: Date.now() }
  return results
}

// Get list of disabled providers (no_key, invalid_key, no_credits, error)
export async function getDisabledProviders(): Promise<Set<string>> {
  const health = await getProviderHealthStatus()
  const disabled = new Set<string>()
  for (const h of health) {
    if (h.status !== 'active') {
      disabled.add(h.provider)
    }
  }
  return disabled
}

// Check if a specific provider is available
export async function isProviderAvailable(provider: 'anthropic'): Promise<boolean> {
  const disabled = await getDisabledProviders()
  return !disabled.has(provider)
}

// ─── Anthropic check ───

async function checkAnthropic(): Promise<ProviderHealth> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const base: Pick<ProviderHealth, 'provider' | 'label'> = { provider: 'anthropic', label: 'Anthropic (Claude)' }

  if (!apiKey) {
    return { ...base, status: 'no_key', message: 'API key no configurada', checkedAt: new Date().toISOString() }
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      return { ...base, status: 'active', message: 'Funcionando correctamente', checkedAt: new Date().toISOString() }
    }
    return { ...base, status: 'active', message: 'Funcionando correctamente', checkedAt: new Date().toISOString() }
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    const status = err?.status ?? 0

    if (status === 401 || msg.includes('invalid_api_key') || msg.includes('authentication')) {
      return { ...base, status: 'invalid_key', message: 'API key invalida', checkedAt: new Date().toISOString() }
    }
    if (status === 429 || msg.includes('rate_limit') || msg.includes('credit') || msg.includes('billing')) {
      return { ...base, status: 'no_credits', message: 'Sin creditos o limite alcanzado', checkedAt: new Date().toISOString() }
    }
    return { ...base, status: 'error', message: msg.slice(0, 200), checkedAt: new Date().toISOString() }
  }
}
