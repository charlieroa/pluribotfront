import { useState, useEffect, useCallback } from 'react'
import { CreditCard, DollarSign, TrendingUp, Percent, BarChart3, Zap, Image, Video, AlertTriangle, Wallet, Plus, Database, MessageSquare } from 'lucide-react'

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

interface BudgetStatus {
  budget: number
  used: number
  remaining: number
  alert: boolean
  setAt: string
}

interface CacheStats {
  totalCacheCreationTokens: number
  totalCacheReadTokens: number
  totalInputTokens: number
  cacheHitRate: number
  estimatedSavings: number
}

interface TopConversation {
  conversationId: string
  title: string
  totalCost: number
  calls: number
  inputTokens: number
  outputTokens: number
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
  budgetStatus?: Record<string, BudgetStatus | null>
  cacheStats?: CacheStats
  topConversations?: TopConversation[]
}

const agentNames: Record<string, string> = {
  seo: 'Lupa', web: 'Pixel', ads: 'Metric', video: 'Reel', base: 'Pluria',
}
const agentColors: Record<string, string> = {
  seo: '#3b82f6', web: '#a78bfa', ads: '#10b981', video: '#ef4444', base: '#6366f1',
}

const BUDGET_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic (Claude)', color: '#d97706' },
  { key: 'midjourney', label: 'Midjourney', color: '#a78bfa' },
]

const CreditsSection = () => {
  const [data, setData] = useState<BillingData | null>(null)
  const [costsData, setCostsData] = useState<CostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})
  const [savingBudget, setSavingBudget] = useState<string | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('plury_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchBilling = useCallback(async () => {
    try {
      setError(null)
      const [billingRes, costsRes] = await Promise.all([
        fetch('/api/admin/billing', { headers: getAuthHeaders() }),
        fetch('/api/admin/costs', { headers: getAuthHeaders() }),
      ])
      if (billingRes.ok) setData(await billingRes.json())
      if (costsRes.ok) setCostsData(await costsRes.json())
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

  const handleSetBudget = async (provider: string) => {
    const value = parseFloat(budgetInputs[provider] || '0')
    if (!value || value <= 0) return
    setSavingBudget(provider)
    try {
      await fetch('/api/admin/budgets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ provider, budget: value }),
      })
      setBudgetInputs(prev => ({ ...prev, [provider]: '' }))
      await fetchBilling()
    } catch (err) {
      console.error('Error setting budget:', err)
    } finally {
      setSavingBudget(null)
    }
  }

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
  }

  const toolDisplayNames: Record<string, { label: string; icon: typeof Image }> = {
    generate_image: { label: 'Generacion de imagenes', icon: Image },
    generate_video: { label: 'Generacion de video', icon: Video },
  }

  const totalProviderCost = costsData
    ? Object.values(costsData.byProvider).reduce((sum, p) => sum + p.cost, 0)
    : 0

  // Check if any budget has alert
  const hasAnyAlert = costsData?.budgetStatus
    ? Object.values(costsData.budgetStatus).some(b => b?.alert)
    : false

  return (
    <div className="max-w-5xl space-y-6">

      {/* Budget Alerts Banner */}
      {hasAnyAlert && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-600">Alerta de presupuesto bajo</p>
            <p className="text-xs text-red-500/80 mt-1">
              {Object.entries(costsData?.budgetStatus ?? {})
                .filter(([, b]) => b?.alert)
                .map(([key, b]) => {
                  const label = BUDGET_PROVIDERS.find(p => p.key === key)?.label ?? key
                  return `${label}: $${b!.remaining.toFixed(2)} restantes`
                })
                .join(' | ')}
            </p>
          </div>
        </div>
      )}

      {/* Provider Budgets */}
      {costsData && (
        <>
          <div>
            <h2 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              Presupuesto por Proveedor
            </h2>
            <p className="text-xs text-ink-faint mb-4">Configura cuanto cargaste en cada API para medir el consumo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BUDGET_PROVIDERS.map(({ key, label, color }) => {
              const budget = costsData.budgetStatus?.[key]
              const isAlert = budget?.alert
              const pctUsed = budget ? Math.min(100, (budget.used / budget.budget) * 100) : 0

              return (
                <div
                  key={key}
                  className={`bg-surface border rounded-xl p-4 ${isAlert ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-edge'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isAlert && <AlertTriangle size={14} className="text-red-500" />}
                      <h4 className="text-sm font-bold text-ink">{label}</h4>
                    </div>
                    {budget && (
                      <span className={`text-lg font-bold ${isAlert ? 'text-red-500' : 'text-emerald-500'}`}>
                        {fmtUSD(budget.remaining)}
                      </span>
                    )}
                  </div>

                  {budget ? (
                    <>
                      {/* Progress bar */}
                      <div className="w-full bg-subtle h-3 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${isAlert ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pctUsed}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="bg-subtle rounded-lg p-2 text-center">
                          <p className="text-ink-faint uppercase font-bold">Cargado</p>
                          <p className="text-ink font-bold mt-0.5" style={{ color }}>{fmtUSD(budget.budget)}</p>
                        </div>
                        <div className="bg-subtle rounded-lg p-2 text-center">
                          <p className="text-ink-faint uppercase font-bold">Gastado</p>
                          <p className="text-red-500 font-bold mt-0.5">{fmtUSD(budget.used)}</p>
                        </div>
                        <div className="bg-subtle rounded-lg p-2 text-center">
                          <p className="text-ink-faint uppercase font-bold">Restante</p>
                          <p className={`font-bold mt-0.5 ${isAlert ? 'text-red-500' : 'text-emerald-500'}`}>
                            {fmtUSD(budget.remaining)}
                          </p>
                        </div>
                      </div>
                      {/* Re-load button */}
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Nueva recarga USD"
                          className="flex-1 bg-subtle border border-edge rounded-lg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-primary"
                          value={budgetInputs[key] || ''}
                          onChange={e => setBudgetInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleSetBudget(key)}
                          disabled={savingBudget === key}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {savingBudget === key ? '...' : 'Recargar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* No budget set */
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="USD cargados"
                        className="flex-1 bg-subtle border border-edge rounded-lg px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-primary"
                        value={budgetInputs[key] || ''}
                        onChange={e => setBudgetInputs(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                      <button
                        onClick={() => handleSetBudget(key)}
                        disabled={savingBudget === key}
                        className="flex items-center gap-1 px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Plus size={12} />
                        {savingBudget === key ? '...' : 'Configurar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Costos y Rentabilidad */}
      {costsData && (
        <>
          <div className="border-t border-edge pt-6">
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
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-[#a78bfa]" />
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
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a78bfa] to-[#a78bfa]" />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#a78bfa]/10 flex items-center justify-center">
                  <Percent size={16} className="text-[#a78bfa]" />
                </div>
                <p className="text-[10px] font-bold text-ink-faint uppercase">% Margen</p>
              </div>
              <p className={`text-2xl font-bold ${costsData.marginPercent >= 0 ? 'text-[#8b5cf6]' : 'text-red-600'}`}>
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

          {/* Cache Performance */}
          {costsData.cacheStats && (costsData.cacheStats.totalInputTokens > 0 || costsData.cacheStats.totalCacheReadTokens > 0) && (
            <div className="border-t border-edge pt-6">
              <h2 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
                <Database size={18} className="text-primary" />
                Cache Performance
              </h2>
              <p className="text-xs text-ink-faint mb-4">Prompt caching de Anthropic — tokens reutilizados vs generados</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-edge rounded-xl p-4">
                  <p className="text-[10px] font-bold text-ink-faint uppercase">Hit Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${costsData.cacheStats.cacheHitRate >= 30 ? 'text-emerald-600' : costsData.cacheStats.cacheHitRate >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                    {costsData.cacheStats.cacheHitRate}%
                  </p>
                  <p className="text-[10px] text-ink-faint">de input desde cache</p>
                </div>
                <div className="bg-surface border border-edge rounded-xl p-4">
                  <p className="text-[10px] font-bold text-ink-faint uppercase">Cache Reads</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(costsData.cacheStats.totalCacheReadTokens)}</p>
                  <p className="text-[10px] text-ink-faint">tokens reutilizados</p>
                </div>
                <div className="bg-surface border border-edge rounded-xl p-4">
                  <p className="text-[10px] font-bold text-ink-faint uppercase">Cache Writes</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{fmt(costsData.cacheStats.totalCacheCreationTokens)}</p>
                  <p className="text-[10px] text-ink-faint">tokens escritos al cache</p>
                </div>
                <div className="bg-surface border border-edge rounded-xl p-4">
                  <p className="text-[10px] font-bold text-ink-faint uppercase">Ahorro Estimado</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{fmtUSD(costsData.cacheStats.estimatedSavings)}</p>
                  <p className="text-[10px] text-ink-faint">USD ahorrados</p>
                </div>
              </div>

              {/* Cache hit rate visual bar */}
              {costsData.cacheStats.totalInputTokens > 0 && (
                <div className="bg-surface border border-edge rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-ink">Distribucion de tokens de entrada</span>
                    <span className="text-[10px] text-ink-faint">{fmt(costsData.cacheStats.totalInputTokens + costsData.cacheStats.totalCacheReadTokens + costsData.cacheStats.totalCacheCreationTokens)} total</span>
                  </div>
                  <div className="w-full h-4 rounded-full overflow-hidden flex bg-subtle">
                    {(() => {
                      const total = costsData.cacheStats.totalInputTokens + costsData.cacheStats.totalCacheReadTokens + costsData.cacheStats.totalCacheCreationTokens
                      const readPct = total > 0 ? (costsData.cacheStats.totalCacheReadTokens / total) * 100 : 0
                      const createPct = total > 0 ? (costsData.cacheStats.totalCacheCreationTokens / total) * 100 : 0
                      const normalPct = 100 - readPct - createPct
                      return (
                        <>
                          <div className="h-full bg-emerald-500" style={{ width: `${readPct}%` }} title={`Cache reads: ${readPct.toFixed(1)}%`} />
                          <div className="h-full bg-amber-500" style={{ width: `${createPct}%` }} title={`Cache writes: ${createPct.toFixed(1)}%`} />
                          <div className="h-full bg-slate-400" style={{ width: `${normalPct}%` }} title={`Normal input: ${normalPct.toFixed(1)}%`} />
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cache read (0.1x)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Cache write (1.25x)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Normal (1x)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Conversations by Cost */}
          {costsData.topConversations && costsData.topConversations.length > 0 && (
            <div className="border-t border-edge pt-6">
              <h2 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
                <MessageSquare size={18} className="text-primary" />
                Top Conversaciones por Costo
              </h2>
              <p className="text-xs text-ink-faint mb-4">Las 20 conversaciones mas costosas</p>

              <div className="bg-surface border border-edge rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-subtle">
                        <th className="text-left px-4 py-2 font-bold text-ink-faint uppercase">Conversacion</th>
                        <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Llamadas</th>
                        <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Input</th>
                        <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Output</th>
                        <th className="text-right px-4 py-2 font-bold text-ink-faint uppercase">Costo USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costsData.topConversations.map((c, i) => (
                        <tr key={c.conversationId} className="border-t border-edge hover:bg-subtle/50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-ink-faint w-4">{i + 1}</span>
                              <span className="font-semibold text-ink truncate max-w-[200px]">{c.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink">{fmt(c.calls)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-light">{fmt(c.inputTokens)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-light">{fmt(c.outputTokens)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-red-600">{fmtUSD(c.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
