import Anthropic from '@anthropic-ai/sdk'

export type ProviderStatus = 'active' | 'no_key' | 'invalid_key' | 'no_credits' | 'error'
export type ProviderId =
  | 'anthropic'
  | 'ideogram'
  | 'ltx'
  | 'meshy'
  | 'unsplash'
  | 'meta'
  | 'stripe'

export interface ProviderHealth {
  provider: ProviderId
  status: ProviderStatus
  label: string
  message: string
  checkedAt: string
}

interface HealthCache {
  results: ProviderHealth[]
  checkedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
let healthCache: HealthCache | null = null

export function invalidateHealthCache(): void {
  healthCache = null
}

export async function getProviderHealthStatus(): Promise<ProviderHealth[]> {
  if (healthCache && Date.now() - healthCache.checkedAt < CACHE_TTL_MS) {
    return healthCache.results
  }

  const results = await Promise.all([
    checkAnthropic(),
    checkEnvProvider('ideogram', 'Ideogram', ['IDEOGRAM_API_KEY']),
    checkEnvProvider('ltx', 'LTX Video', ['LTX_API_KEY']),
    checkEnvProvider('meshy', 'Meshy', ['MESHY_API_KEY']),
    checkEnvProvider('unsplash', 'Unsplash', ['UNSPLASH_ACCESS_KEY']),
    checkEnvProvider('meta', 'Meta Ads', ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']),
    checkStripe(),
  ])

  healthCache = { results, checkedAt: Date.now() }
  return results
}

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

export async function isProviderAvailable(provider: 'anthropic'): Promise<boolean> {
  const disabled = await getDisabledProviders()
  return !disabled.has(provider)
}

function checkEnvProvider(
  provider: Exclude<ProviderId, 'anthropic' | 'stripe'>,
  label: string,
  envKeys: string[]
): ProviderHealth {
  const missing = envKeys.filter(key => !process.env[key])
  if (missing.length > 0) {
    return {
      provider,
      label,
      status: 'no_key',
      message: `Faltan variables: ${missing.join(', ')}`,
      checkedAt: new Date().toISOString(),
    }
  }

  return {
    provider,
    label,
    status: 'active',
    message: 'Configurada en servidor',
    checkedAt: new Date().toISOString(),
  }
}

function checkStripe(): ProviderHealth {
  const hasSecret = !!process.env.STRIPE_SECRET_KEY
  const hasWebhook = !!process.env.STRIPE_WEBHOOK_SECRET

  if (!hasSecret && !hasWebhook) {
    return {
      provider: 'stripe',
      label: 'Stripe',
      status: 'no_key',
      message: 'Faltan STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET',
      checkedAt: new Date().toISOString(),
    }
  }

  if (!hasSecret || !hasWebhook) {
    return {
      provider: 'stripe',
      label: 'Stripe',
      status: 'error',
      message: !hasSecret ? 'Falta STRIPE_SECRET_KEY' : 'Falta STRIPE_WEBHOOK_SECRET',
      checkedAt: new Date().toISOString(),
    }
  }

  return {
    provider: 'stripe',
    label: 'Stripe',
    status: 'active',
    message: 'Checkout y webhooks configurados',
    checkedAt: new Date().toISOString(),
  }
}

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
