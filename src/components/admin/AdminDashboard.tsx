import { useState, useEffect, useCallback } from 'react'
import { Users, Building2, Bot, CreditCard, Wifi, Star, AlertTriangle, DollarSign } from 'lucide-react'
import UsersSection from './UsersSection'
import AgenciesSection from './AgenciesSection'
import BotsSection from './BotsSection'
import CreditsSection from './CreditsSection'
import ApisSection from './ApisSection'
import SeniorManagement from './SeniorManagement'

interface AdminStats {
  totalUsers: number
  totalOrgs: number
  activeBots: number
  totalBots: number
  monthlyRevenue: number
}

interface CostsData {
  totalApiCost: number
  byProvider: Record<string, { cost: number; tokens: { input: number; output: number } }>
}

interface ProviderHealth {
  provider: string
  label: string
  status: string
  message: string
}

// Spending limits — superadmin can mentally adjust these
const SPENDING_LIMITS: Record<string, number> = {
  anthropic: 50, // USD/month alert threshold
  openai: 20,
  google: 30,
}

export type AdminTab = 'users' | 'agencies' | 'bots' | 'credits' | 'apis' | 'senior'

interface AdminDashboardProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
}

const AdminDashboard = ({ activeTab, onTabChange }: AdminDashboardProps) => {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [costsData, setCostsData] = useState<CostsData | null>(null)
  const [providers, setProviders] = useState<ProviderHealth[]>([])

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchStats = useCallback(async () => {
    try {
      const [usersRes, orgsRes, botsRes, costsRes, providerRes] = await Promise.all([
        fetch('/api/admin/users', { headers: getAuthHeaders() }),
        fetch('/api/admin/organizations', { headers: getAuthHeaders() }),
        fetch('/api/admin/bots', { headers: getAuthHeaders() }),
        fetch('/api/admin/costs', { headers: getAuthHeaders() }),
        fetch('/api/admin/provider-status', { headers: getAuthHeaders() }),
      ])

      const users = usersRes.ok ? await usersRes.json() : []
      const orgs = orgsRes.ok ? await orgsRes.json() : []
      const bots = botsRes.ok ? await botsRes.json() : []
      const costs = costsRes.ok ? await costsRes.json() : { totalRevenue: 0, totalApiCost: 0, byProvider: {} }
      const providerData = providerRes.ok ? await providerRes.json() : []

      setStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalOrgs: Array.isArray(orgs) ? orgs.length : 0,
        activeBots: Array.isArray(bots) ? bots.filter((b: { isActive: boolean }) => b.isActive).length : 0,
        totalBots: Array.isArray(bots) ? bots.length : 0,
        monthlyRevenue: costs.totalRevenue ?? 0,
      })
      setCostsData({ totalApiCost: costs.totalApiCost ?? 0, byProvider: costs.byProvider ?? {} })
      setProviders(Array.isArray(providerData) ? providerData : [])
    } catch (err) {
      console.error('[Admin] Stats error:', err)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // Compute spending alerts
  const spendingAlerts = costsData
    ? Object.entries(costsData.byProvider)
        .map(([provider, data]) => {
          const limit = SPENDING_LIMITS[provider] ?? 50
          const pct = (data.cost / limit) * 100
          return { provider, cost: data.cost, limit, pct }
        })
        .filter(a => a.pct >= 50) // show alerts at 50%+
        .sort((a, b) => b.pct - a.pct)
    : []

  const hasWarning = spendingAlerts.some(a => a.pct >= 80)

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'agencies', label: 'Agencias', icon: Building2 },
    { id: 'bots', label: 'Bots', icon: Bot },
    { id: 'credits', label: 'Creditos', icon: CreditCard },
    { id: 'apis', label: 'APIs', icon: Wifi },
    { id: 'senior', label: 'Senior', icon: Star },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-page">
      {/* Stats bar */}
      {stats && (
        <div className="px-4 md:px-8 py-3 md:py-4 border-b border-edge bg-surface flex flex-wrap gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Users size={16} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{stats.totalUsers}</p>
              <p className="text-[10px] text-ink-faint">Usuarios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Building2 size={16} className="text-purple-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{stats.totalOrgs}</p>
              <p className="text-[10px] text-ink-faint">Agencias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Bot size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{stats.activeBots}/{stats.totalBots}</p>
              <p className="text-[10px] text-ink-faint">Bots Activos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CreditCard size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">${stats.monthlyRevenue.toFixed(0)}</p>
              <p className="text-[10px] text-ink-faint">Ingresos/mes</p>
            </div>
          </div>
        </div>
      )}

      {/* Spending alerts */}
      {spendingAlerts.length > 0 && (
        <div className={`px-4 md:px-8 py-3 border-b ${
          hasWarning
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={hasWarning ? 'text-red-500' : 'text-amber-500'} />
            <span className={`text-xs font-bold ${hasWarning ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {hasWarning ? 'Alerta de gasto API' : 'Aviso de gasto API'}
            </span>
            <span className="text-[10px] text-ink-faint ml-auto">
              Total: ${costsData?.totalApiCost.toFixed(2)} USD este mes
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {spendingAlerts.map(alert => (
              <div key={alert.provider} className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-ink capitalize">{alert.provider}</span>
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      alert.pct >= 90 ? 'bg-red-500' : alert.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(alert.pct, 100)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${
                  alert.pct >= 90 ? 'text-red-600' : alert.pct >= 70 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  ${alert.cost.toFixed(2)} / ${alert.limit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider status */}
      {providers.length > 0 && (
        <div className="px-4 md:px-8 py-2 border-b border-edge bg-surface flex flex-wrap gap-3">
          {providers.map(p => (
            <div key={p.provider} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                p.status === 'ok' ? 'bg-emerald-500' : p.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-[10px] text-ink-faint">{p.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <DollarSign size={10} className="text-ink-faint" />
            <span className="text-[10px] text-ink-faint">
              Costo API total: ${costsData?.totalApiCost.toFixed(2) ?? '0.00'} USD
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 md:px-8 pt-4 flex gap-1 bg-surface border-b border-edge overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary border-primary bg-page'
                : 'text-ink-faint border-transparent hover:text-ink hover:bg-subtle'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeTab === 'users' && <UsersSection />}
        {activeTab === 'agencies' && <AgenciesSection />}
        {activeTab === 'bots' && <BotsSection />}
        {activeTab === 'credits' && <CreditsSection />}
        {activeTab === 'apis' && <ApisSection />}
        {activeTab === 'senior' && <SeniorManagement />}
      </div>
    </div>
  )
}

export default AdminDashboard
