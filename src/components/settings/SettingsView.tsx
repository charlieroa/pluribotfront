import { useState, useEffect } from 'react'
import { Moon, Sun, Bell, Shield, User, CreditCard, Settings, ChevronRight, Mail, MapPin, Phone, Building, Zap, Check } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

type Section = 'profile' | 'plan' | 'config'

const API_BASE = '/api'

interface UsageData {
  totalInputTokens: number
  totalOutputTokens: number
  tokenLimit: number
  byAgent: Array<{
    agentId: string
    inputTokens: number
    outputTokens: number
  }>
  period: {
    start: string
    end: string
  }
}

const agentNames: Record<string, string> = {
  seo: 'Lupa',
  web: 'Pixel',
  ads: 'Metric',
  dev: 'Logic',
  base: 'Pluria',
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  base: '#2563eb',
}

const SettingsView = () => {
  const { isDark, toggle } = useTheme()
  const [section, setSection] = useState<Section>('profile')

  const navItems: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'profile', label: 'Datos Personales', icon: <User size={18} />, desc: 'Tu informacion y perfil' },
    { id: 'plan', label: 'Plan y Facturacion', icon: <CreditCard size={18} />, desc: 'Suscripcion y uso' },
    { id: 'config', label: 'Configuracion', icon: <Settings size={18} />, desc: 'Apariencia y notificaciones' },
  ]

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-72 bg-surface border-r border-edge flex flex-col overflow-y-auto custom-scrollbar">
        {/* Profile Summary */}
        <div className="p-6 border-b border-edge-soft">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-fg text-xl font-bold">
              UA
            </div>
            <div>
              <h3 className="font-bold text-ink">Usuario Admin</h3>
              <p className="text-xs text-ink-faint">admin@pluribots.com</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">Pro Business</span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="p-4 flex-1">
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  section === item.id
                    ? 'bg-primary-soft text-primary border-l-4 border-primary'
                    : 'text-ink-light hover:bg-surface-alt border-l-4 border-transparent'
                }`}
              >
                {item.icon}
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-[10px] text-ink-faint">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-edge-soft">
          <p className="text-[10px] text-ink-faint text-center">Pluribots v1.0.0</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-page p-8">
        <div className="max-w-2xl">
          {section === 'profile' && <ProfileSection />}
          {section === 'plan' && <PlanSection />}
          {section === 'config' && <ConfigSection isDark={isDark} toggle={toggle} />}
        </div>
      </div>
    </div>
  )
}

/* ───── Profile Section ───── */
const ProfileSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-ink mb-1">Datos Personales</h2>
      <p className="text-sm text-ink-faint">Gestiona tu informacion de perfil</p>
    </div>

    <div className="bg-surface border border-edge rounded-2xl p-6">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-primary-fg text-3xl font-bold">
          UA
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">Usuario Admin</h3>
          <p className="text-sm text-ink-faint">Administrador del workspace</p>
          <button className="mt-2 text-xs text-primary font-semibold hover:underline">Cambiar avatar</button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Nombre</label>
            <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
              <User size={14} className="text-ink-faint flex-shrink-0" />
              <span className="text-sm text-ink">Juan Administrador</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Email</label>
            <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
              <Mail size={14} className="text-ink-faint flex-shrink-0" />
              <span className="text-sm text-ink">admin@pluribots.com</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Telefono</label>
            <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
              <Phone size={14} className="text-ink-faint flex-shrink-0" />
              <span className="text-sm text-ink">+57 300 123 4567</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Ubicacion</label>
            <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
              <MapPin size={14} className="text-ink-faint flex-shrink-0" />
              <span className="text-sm text-ink">Bogota, Colombia</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Empresa</label>
          <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
            <Building size={14} className="text-ink-faint flex-shrink-0" />
            <span className="text-sm text-ink">Tupeluekria -- Salon de Belleza</span>
          </div>
        </div>
      </div>

      <button className="mt-6 px-5 py-2.5 bg-primary text-primary-fg text-sm font-semibold rounded-xl hover:opacity-90 transition-all">
        Editar Perfil
      </button>
    </div>

    {/* Security */}
    <div className="bg-surface border border-edge rounded-2xl p-6">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        <Shield size={18} /> Seguridad
      </h3>
      <div className="space-y-3">
        <button className="w-full flex items-center justify-between p-4 bg-subtle rounded-xl hover:bg-surface-alt transition-all text-left">
          <div>
            <p className="text-sm font-bold text-ink">Cambiar Contrasena</p>
            <p className="text-xs text-ink-faint">Ultima actualizacion hace 30 dias</p>
          </div>
          <ChevronRight size={16} className="text-ink-faint" />
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-subtle rounded-xl hover:bg-surface-alt transition-all text-left">
          <div>
            <p className="text-sm font-bold text-ink">Autenticacion en 2 Pasos</p>
            <p className="text-xs text-emerald-500 font-medium">Activada</p>
          </div>
          <ChevronRight size={16} className="text-ink-faint" />
        </button>
      </div>
    </div>
  </div>
)

/* ───── Plan Section with Real Usage Data ───── */
const PlanSection = () => {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = localStorage.getItem('pluribots_token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        const res = await fetch(`${API_BASE}/usage`, { headers })
        if (res.ok) {
          const data = await res.json()
          setUsage(data)
        }
      } catch (err) {
        console.error('[Settings] Error fetching usage:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [])

  const totalTokens = usage ? usage.totalInputTokens + usage.totalOutputTokens : 0
  const tokenLimit = usage?.tokenLimit ?? 1000000
  const usagePercent = Math.min((totalTokens / tokenLimit) * 100, 100)

  const formatNumber = (n: number) => n.toLocaleString('es-CO')

  const periodLabel = usage?.period
    ? `${new Date(usage.period.start).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
    : 'Periodo actual'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">Plan y Facturacion</h2>
        <p className="text-sm text-ink-faint">Gestiona tu suscripcion y consumo</p>
      </div>

      {/* Current Plan */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-soft rounded-xl text-primary">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-ink">Plan Pro Business</h3>
              <p className="text-xs text-ink-faint">Renovacion: 15 Mar 2026</p>
            </div>
          </div>
          <span className="text-lg font-bold text-ink">$49<span className="text-xs text-ink-faint font-normal">/mes</span></span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-1.5">
                  <div className="h-3 w-24 bg-subtle rounded" />
                  <div className="h-3 w-16 bg-subtle rounded" />
                </div>
                <div className="w-full bg-subtle h-2 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total tokens */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-light font-medium">Tokens consumidos ({periodLabel})</span>
                <span className="text-ink font-bold">{formatNumber(totalTokens)} / {formatNumber(tokenLimit)}</span>
              </div>
              <div className="w-full bg-subtle h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Input vs Output breakdown */}
            {usage && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-subtle rounded-xl">
                  <p className="text-[10px] font-bold text-ink-faint uppercase">Tokens entrada</p>
                  <p className="text-sm font-bold text-ink mt-0.5">{formatNumber(usage.totalInputTokens)}</p>
                </div>
                <div className="p-3 bg-subtle rounded-xl">
                  <p className="text-[10px] font-bold text-ink-faint uppercase">Tokens salida</p>
                  <p className="text-sm font-bold text-ink mt-0.5">{formatNumber(usage.totalOutputTokens)}</p>
                </div>
              </div>
            )}

            {/* Per-agent breakdown */}
            {usage && usage.byAgent.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-2">Desglose por agente</p>
                <div className="space-y-2">
                  {usage.byAgent.map(a => {
                    const agentTotal = a.inputTokens + a.outputTokens
                    const agentPercent = totalTokens > 0 ? (agentTotal / totalTokens) * 100 : 0
                    return (
                      <div key={a.agentId} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                          style={{ backgroundColor: agentColors[a.agentId] ?? '#6b7280' }}
                        >
                          {(agentNames[a.agentId] ?? a.agentId).charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="font-semibold text-ink">{agentNames[a.agentId] ?? a.agentId}</span>
                            <span className="text-ink-faint">{formatNumber(agentTotal)} ({agentPercent.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${agentPercent}%`, backgroundColor: agentColors[a.agentId] ?? '#6b7280' }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Agents active */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-light font-medium">Agentes activos</span>
                <span className="text-ink font-bold">4 / 10</span>
              </div>
              <div className="w-full bg-subtle h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
          </div>
        )}

        <button className="mt-6 px-5 py-2.5 bg-primary text-primary-fg text-sm font-semibold rounded-xl hover:opacity-90 transition-all">
          Upgrade a Enterprise
        </button>
      </div>

      {/* Plan Comparison */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <h3 className="font-bold text-ink mb-4">Comparar Planes</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Starter', price: 'Free', features: ['2 agentes', '500 mensajes/mes', 'Soporte email'] },
            { name: 'Pro Business', price: '$49/mes', features: ['10 agentes', '10K mensajes/mes', 'Soporte prioritario', 'Workspace ilimitados'], current: true },
            { name: 'Enterprise', price: '$149/mes', features: ['Agentes ilimitados', 'Mensajes ilimitados', 'Soporte 24/7', 'API access', 'SSO'] },
          ].map(plan => (
            <div key={plan.name} className={`p-4 rounded-xl border ${plan.current ? 'border-primary bg-primary-soft' : 'border-edge bg-subtle'}`}>
              <p className="text-sm font-bold text-ink">{plan.name}</p>
              <p className="text-lg font-bold text-ink mt-1">{plan.price}</p>
              <div className="mt-3 space-y-2">
                {plan.features.map(f => (
                  <p key={f} className="text-[11px] text-ink-light flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-500 flex-shrink-0" /> {f}
                  </p>
                ))}
              </div>
              {plan.current && <p className="mt-3 text-[10px] font-bold text-primary">Plan actual</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <h3 className="font-bold text-ink mb-4">Historial de Facturacion</h3>
        <div className="space-y-2">
          {[
            { date: 'Feb 2026', amount: '$49.00', status: 'Pagado' },
            { date: 'Ene 2026', amount: '$49.00', status: 'Pagado' },
            { date: 'Dic 2025', amount: '$49.00', status: 'Pagado' },
          ].map(inv => (
            <div key={inv.date} className="flex items-center justify-between p-3 bg-subtle rounded-xl">
              <div>
                <p className="text-sm font-semibold text-ink">{inv.date}</p>
                <p className="text-xs text-ink-faint">{inv.amount}</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───── Config Section ───── */
const ConfigSection = ({ isDark, toggle }: { isDark: boolean; toggle: () => void }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-ink mb-1">Configuracion</h2>
      <p className="text-sm text-ink-faint">Apariencia, notificaciones y preferencias</p>
    </div>

    {/* Appearance */}
    <div className="bg-surface border border-edge rounded-2xl p-6">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
        Apariencia
      </h3>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 bg-subtle rounded-xl hover:bg-surface-alt transition-all"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-ink">Modo Oscuro</p>
          <p className="text-xs text-ink-faint">Cambia entre tema claro y oscuro</p>
        </div>
        <div className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-inset'}`}>
          <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${isDark ? 'translate-x-5' : ''}`} />
        </div>
      </button>
    </div>

    {/* Notifications */}
    <div className="bg-surface border border-edge rounded-2xl p-6">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        <Bell size={18} /> Notificaciones
      </h3>
      <div className="space-y-3">
        {[
          { label: 'Alertas de Agentes', desc: 'Recibir alertas cuando un agente termina', on: true },
          { label: 'Resumen Diario', desc: 'Email con resumen de actividad', on: false },
          { label: 'Actualizaciones del Sistema', desc: 'Nuevas funciones y mejoras', on: true },
        ].map(n => (
          <div key={n.label} className="flex items-center justify-between p-4 bg-subtle rounded-xl">
            <div>
              <p className="text-sm font-bold text-ink">{n.label}</p>
              <p className="text-xs text-ink-faint">{n.desc}</p>
            </div>
            <div className={`relative w-12 h-7 rounded-full ${n.on ? 'bg-primary' : 'bg-inset'}`}>
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm ${n.on ? 'translate-x-5' : ''}`} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Workspace */}
    <div className="bg-surface border border-edge rounded-2xl p-6">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        <Building size={18} /> Workspace
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
          <div>
            <p className="text-sm font-bold text-ink">Nombre del Workspace</p>
            <p className="text-xs text-ink-faint">Cliente_01 -- Tupeluekria</p>
          </div>
          <ChevronRight size={16} className="text-ink-faint" />
        </div>
        <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
          <div>
            <p className="text-sm font-bold text-ink">Idioma del Sistema</p>
            <p className="text-xs text-ink-faint">Espanol (Latinoamerica)</p>
          </div>
          <ChevronRight size={16} className="text-ink-faint" />
        </div>
        <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
          <div>
            <p className="text-sm font-bold text-ink">Zona Horaria</p>
            <p className="text-xs text-ink-faint">America/Bogota (UTC-5)</p>
          </div>
          <ChevronRight size={16} className="text-ink-faint" />
        </div>
      </div>
    </div>
  </div>
)

export default SettingsView
