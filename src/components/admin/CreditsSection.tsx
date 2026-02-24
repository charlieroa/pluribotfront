import { useState, useEffect, useCallback } from 'react'
import { CreditCard, DollarSign, TrendingUp, Percent, BarChart3, Zap, Image, Video } from 'lucide-react'

interface BillingData {
  totalConsumed: number
  totalGranted: number
  users: Array<{
    id: string
    name: string
    email: string
    planId: string
    creditBalance: number
    consumed: number
    organization: string | null
  }>
  byModel: Array<{ model: string; credits: number }>
  byAgent: Array<{ agentId: string; credits: number }>
  byOrganization: Array<{ id: string; name: string; consumed: number; balance: number; userCount: number }>
}

interface CostsData {
  totalApiCost: number
  totalCreditsConsumed: number
  totalRevenue: number
  margin: number
  marginPercent: number
  byProvider: Record<string, { cost: number; tokens: { input: number; output: number } }>
  byModel: Array<{ model: string; calls: number; cost: number; creditsCharged: number }>
  toolCosts: Record<string, { calls: number; cost: number }>
}

const agentNames: Record<string, string> = {
  seo: 'Lupa', brand: 'Nova', web: 'Pixel', social: 'Spark', ads: 'Metric', dev: 'Logic', video: 'Reel', base: 'Pluria',
}
const agentColors: Record<string, string> = {
  seo: '#3b82f6', brand: '#ec4899', web: '#a855f7', social: '#f97316', ads: '#10b981', dev: '#f59e0b', video: '#ef4444', base: '#6366f1',
}

const CreditsSection = () => {
  const [data, setData] = useState<BillingData | null>(null)
  const [costsData, setCostsData] = useState<CostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchBilling = useCallback(async () => {
    try {
      setError(null)
      const [billingRes, costsRes] = await Promise.all([
        fetch('/api/admin/billing', { headers: getAuthHeaders() }),
        fetch('/api/admin/costs', { headers: getAuthHeaders() }),
      ])
      console.log('[Admin] Billing response:', billingRes.status, '| Costs response:', costsRes.status)
      if (billingRes.ok) setData(await billingRes.json())
      else console.warn('[Admin] Billing failed:', billingRes.status, billingRes.statusText)
      if (costsRes.ok) setCostsData(await costsRes.json())
      else console.warn('[Admin] Costs failed:', costsRes.status, costsRes.statusText)
      if (!billingRes.ok && !costsRes.ok) {
        setError(`Error al cargar datos: Billing ${billingRes.status}, Costs ${costsRes.status}`)
      }
    } catch (err) {
      console.error('[Admin] Billing error:', err)
      setError('Error de conexion al cargar datos de facturacion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBilling() }, [fetchBilling])

  const fmt = (n: number) => n.toLocaleString('es-CO')
  const fmtUSD = (n: number) => `$${n.toFixed(2)}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <CreditCard size={48} className="mx-auto text-red-500/30 mb-4" />
        <p className="text-sm text-red-500 font-semibold">{error}</p>
        <button onClick={fetchBilling} className="mt-3 text-xs font-bold text-primary hover:underline">Reintentar</button>
      </div>
    )
  }

  if (!data && !costsData) {
    return <p className="text-sm text-ink-faint text-center py-10">No se pudieron cargar los datos de facturacion</p>
  }

  const providerConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    anthropic: { label: 'Anthropic', color: '#d97706', bgColor: 'bg-amber-500' },
    openai: { label: 'OpenAI', color: '#10b981', bgColor: 'bg-emerald-500' },
    google: { label: 'Google', color: '#3b82f6', bgColor: 'bg-blue-500' },
  }

  const toolDisplayNames: Record<string, { label: string; icon: typeof Image }> = {
    generate_image: { label: 'Generacion de imagenes', icon: Image },
    generate_video: { label: 'Generacion de video', icon: Video },
  }

  const totalProviderCost = costsData
    ? Object.values(costsData.byProvider).reduce((sum, p) => sum + p.cost, 0)
    : 0

  return (
    <div className="max-w-5xl space-y-6">

      {/* Costos y Rentabilidad */}
      {costsData && (
        <>
          <div>
            <h2 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              Costos y Rentabilidad
            </h2>
            <p className="text-xs text-ink-faint mb-4">Costos reales de APIs vs ingresos por planes</p>
          </div>

          {/* 4 Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-surface border border-edge rounded-xl p-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-red-500" />
                </div>
                <p className="text-[10px] font-bold text-ink-faint uppercase">Costo APIs</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{fmtUSD(costsData.totalApiCost)}</p>
              <p className="text-[10px] text-ink-faint mt-0.5">USD gasto real</p>
            </div>

            <div className="relative overflow-hidden bg-surface border border-edge rounded-xl p-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp size={16} className="text-emerald-500" />
                </div>
                <p className="text-[10px] font-bold text-ink-faint uppercase">Ingresos Planes</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{fmtUSD(costsData.totalRevenue)}</p>
              <p className="text-[10px] text-ink-faint mt-0.5">USD/mes suscripciones</p>
            </div>

            <div className="relative overflow-hidden bg-surface border border-edge rounded-xl p-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CreditCard size={16} className="text-blue-500" />
                </div>
                <p className="text-[10px] font-bold text-ink-faint uppercase">Margen Bruto</p>
              </div>
              <p className={`text-2xl font-bold ${costsData.margin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {fmtUSD(costsData.margin)}
              </p>
              <p className="text-[10px] text-ink-faint mt-0.5">USD diferencia</p>
            </div>

            <div className="relative overflow-hidden bg-surface border border-edge rounded-xl p-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Percent size={16} className="text-indigo-500" />
                </div>
                <p className="text-[10px] font-bold text-ink-faint uppercase">% Margen</p>
              </div>
              <p className={`text-2xl font-bold ${costsData.marginPercent >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {costsData.marginPercent.toFixed(1)}%
              </p>
              <p className="text-[10px] text-ink-faint mt-0.5">rentabilidad</p>
            </div>
          </div>

          {/* Provider breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(costsData.byProvider).map(([key, provider]) => {
              const config = providerConfig[key] ?? { label: key, color: '#6b7280', bgColor: 'bg-gray-500' }
              const proportion = totalProviderCost > 0 ? (provider.cost / totalProviderCost) * 100 : 0
              return (
                <div key={key} className="bg-surface border border-edge rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-ink">{config.label}</h4>
                    <span className="text-lg font-bold" style={{ color: config.color }}>
                      {fmtUSD(provider.cost)}
                    </span>
                  </div>
                  <div className="w-full bg-subtle h-2.5 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${config.bgColor}`}
                      style={{ width: `${proportion}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-subtle rounded-lg p-2">
                      <p className="text-ink-faint uppercase font-bold">Input tokens</p>
                      <p className="text-ink font-bold mt-0.5">{fmt(provider.tokens.input)}</p>
                    </div>
                    <div className="bg-subtle rounded-lg p-2">
                      <p className="text-ink-faint uppercase font-bold">Output tokens</p>
                      <p className="text-ink font-bold mt-0.5">{fmt(provider.tokens.output)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tool costs */}
          {Object.keys(costsData.toolCosts).length > 0 && (
            <div className="bg-surface border border-edge rounded-xl overflow-hidden">
              <div className="p-4 border-b border-edge">
                <h3 className="text-sm font-bold text-ink">Costos de herramientas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-subtle">
                      <th className="text-left px-4 py-2 font-bold text-ink-faint uppercase">Herramienta</th>
                      <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Llamadas</th>
                      <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Costo USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(costsData.toolCosts)
                      .sort(([, a], [, b]) => b.cost - a.cost)
                      .map(([toolName, tool]) => {
                        const display = toolDisplayNames[toolName]
                        const ToolIcon = display?.icon ?? Zap
                        return (
                          <tr key={toolName} className="border-t border-edge hover:bg-subtle/50">
                            <td className="px-4 py-2.5 flex items-center gap-2">
                              <ToolIcon size={14} className="text-ink-faint" />
                              <span className="font-semibold text-ink">{display?.label ?? toolName}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-ink">{fmt(tool.calls)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-red-600">{fmtUSD(tool.cost)}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cost per model */}
          {costsData.byModel.length > 0 && (
            <div className="bg-surface border border-edge rounded-xl overflow-hidden">
              <div className="p-4 border-b border-edge">
                <h3 className="text-sm font-bold text-ink">Costo real por modelo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-subtle">
                      <th className="text-left px-4 py-2 font-bold text-ink-faint uppercase">Modelo</th>
                      <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Llamadas</th>
                      <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Creditos</th>
                      <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Costo USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costsData.byModel.map(m => (
                      <tr key={m.model} className="border-t border-edge hover:bg-subtle/50">
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-semibold text-ink">{m.model}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-ink">{fmt(m.calls)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-ink-light">{fmt(m.creditsCharged)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">{fmtUSD(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Credit summary cards */}
      {data && (
        <>
          <div className="border-t border-edge pt-6">
            <h2 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              Creditos Plataforma
            </h2>
            <p className="text-xs text-ink-faint mb-4">Consumo global de creditos</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-edge rounded-xl p-4">
              <p className="text-[10px] font-bold text-ink-faint uppercase">Total consumido</p>
              <p className="text-2xl font-bold text-ink mt-1">{fmt(data.totalConsumed)}</p>
              <p className="text-xs text-ink-faint">creditos</p>
            </div>
            <div className="bg-surface border border-edge rounded-xl p-4">
              <p className="text-[10px] font-bold text-ink-faint uppercase">Total otorgado</p>
              <p className="text-2xl font-bold text-ink mt-1">{fmt(data.totalGranted)}</p>
              <p className="text-xs text-ink-faint">creditos</p>
            </div>
            <div className="bg-surface border border-edge rounded-xl p-4">
              <p className="text-[10px] font-bold text-ink-faint uppercase">Usuarios</p>
              <p className="text-2xl font-bold text-ink mt-1">{data.users.length}</p>
              <p className="text-xs text-ink-faint">registrados</p>
            </div>
          </div>

      {/* By model */}
      {data.byModel.length > 0 && (
        <div className="bg-surface border border-edge rounded-xl p-4">
          <h3 className="text-sm font-bold text-ink mb-3">Consumo por modelo</h3>
          <div className="space-y-2">
            {data.byModel.sort((a, b) => b.credits - a.credits).map(m => {
              const pct = data.totalConsumed > 0 ? (m.credits / data.totalConsumed) * 100 : 0
              return (
                <div key={m.model} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-ink-light w-40 truncate">{m.model}</span>
                  <div className="flex-1 bg-subtle h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-ink w-20 text-right">{fmt(m.credits)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* By agent */}
      {data.byAgent.length > 0 && (
        <div className="bg-surface border border-edge rounded-xl p-4">
          <h3 className="text-sm font-bold text-ink mb-3">Consumo por bot</h3>
          <div className="grid grid-cols-4 gap-2">
            {data.byAgent.sort((a, b) => b.credits - a.credits).map(a => (
              <div key={a.agentId} className="flex items-center gap-2 p-2 bg-subtle rounded-lg">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: agentColors[a.agentId] ?? '#6b7280' }}
                >
                  {(agentNames[a.agentId] ?? a.agentId).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-ink truncate">{agentNames[a.agentId] ?? a.agentId}</p>
                  <p className="text-[10px] text-ink-faint">{fmt(a.credits)} cr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default CreditsSection
