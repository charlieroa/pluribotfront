// Provider health check service — validates API keys and tracks provider status

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'

export type ProviderStatus = 'active' | 'no_key' | 'invalid_key' | 'no_credits' | 'error'

export interface ProviderHealth {
  provider: 'anthropic' | 'openai' | 'google'
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

  const results = await Promise.all([
    checkAnthropic(),
    checkOpenAI(),
    checkGoogle(),
  ])

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
export async function isProviderAvailable(provider: 'anthropic' | 'openai' | 'google'): Promise<boolean> {
  const disabled = await getDisabledProviders()
  return !disabled.has(provider)
}

// ─── Individual provider checks ───

async function checkAnthropic(): Promise<ProviderHealth> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const base: Pick<ProviderHealth, 'provider' | 'label'> = { provider: 'anthropic', label: 'Anthropic (Claude)' }

  if (!apiKey) {
    return { ...base, status: 'no_key', message: 'API key no configurada', checkedAt: new Date().toISOString() }
  }

  try {
    const client = new Anthropic({ apiKey })
    // Minimal API call — count tokens only (cheapest operation)
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    // If we get here, the key works
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

async function checkOpenAI(): Promise<ProviderHealth> {
  const apiKey = process.env.OPENAI_API_KEY
  const base: Pick<ProviderHealth, 'provider' | 'label'> = { provider: 'openai', label: 'OpenAI (GPT)' }

  if (!apiKey) {
    return { ...base, status: 'no_key', message: 'API key no configurada', checkedAt: new Date().toISOString() }
  }

  try {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    if (response.choices[0]) {
      return { ...base, status: 'active', message: 'Funcionando correctamente', checkedAt: new Date().toISOString() }
    }
    return { ...base, status: 'active', message: 'Funcionando correctamente', checkedAt: new Date().toISOString() }
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    const status = err?.status ?? 0

    if (status === 401 || msg.includes('Incorrect API key') || msg.includes('invalid_api_key')) {
      return { ...base, status: 'invalid_key', message: 'API key invalida', checkedAt: new Date().toISOString() }
    }
    if (status === 429 || msg.includes('quota') || msg.includes('billing') || msg.includes('insufficient_quota') || msg.includes('rate_limit')) {
      return { ...base, status: 'no_credits', message: 'Sin creditos o cuota agotada', checkedAt: new Date().toISOString() }
    }
    return { ...base, status: 'error', message: msg.slice(0, 200), checkedAt: new Date().toISOString() }
  }
}

async function checkGoogle(): Promise<ProviderHealth> {
  const apiKey = process.env.GOOGLE_API_KEY
  const base: Pick<ProviderHealth, 'provider' | 'label'> = { provider: 'google', label: 'Google (Gemini)' }

  if (!apiKey) {
    return { ...base, status: 'no_key', message: 'API key no configurada', checkedAt: new Date().toISOString() }
  }

  try {
    const client = new GoogleGenAI({ apiKey })
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      config: { maxOutputTokens: 1 },
    })
    if (response.candidates?.[0]) {
      return { ...base, status: 'active', message: 'Funcionando correctamente', checkedAt: new Date().toISOString() }
    }
    return { ...base, status: 'active', message: 'Funcionando correctamente', checkedAt: new Date().toISOString() }
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    const status = err?.status ?? 0

    if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
      return { ...base, status: 'invalid_key', message: 'API key invalida o sin permisos', checkedAt: new Date().toISOString() }
    }
    if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('billing')) {
      return { ...base, status: 'no_credits', message: 'Cuota agotada o sin billing habilitado', checkedAt: new Date().toISOString() }
    }
    return { ...base, status: 'error', message: msg.slice(0, 200), checkedAt: new Date().toISOString() }
  }
}
