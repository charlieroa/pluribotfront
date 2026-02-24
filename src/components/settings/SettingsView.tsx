import { useState, useEffect, useRef } from 'react'
import { Moon, Sun, Shield, User, CreditCard, Settings, Mail, Briefcase, Building, Zap, Check, Palette, Users, Image, Upload, Plus, Star, ShoppingCart, Clock, Send, X, AlertTriangle, MessageSquare, Award } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import OrganizationSettings from '../admin/OrganizationSettings'

type Section = 'profile' | 'plan' | 'config' | 'whitelabel' | 'team'

const API_BASE = '/api'



const agentNames: Record<string, string> = {
  seo: 'Lupa',
  brand: 'Nova',
  web: 'Pixel',
  social: 'Spark',
  ads: 'Metric',
  dev: 'Logic',
  base: 'Pluribots',
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  brand: '#ec4899',
  web: '#a855f7',
  social: '#f97316',
  ads: '#10b981',
  dev: '#f59e0b',
  base: '#6366f1',
}

const SettingsView = () => {
  const { isDark, toggle } = useTheme()
  const { user } = useAuth()
  const [section, setSection] = useState<Section>('profile')

  const isAgency = user?.role === 'org_admin' || user?.role === 'superadmin'
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'
  const planLabel = user?.planId === 'agency' ? 'Agency' : user?.planId === 'starter' ? 'Starter' : user?.planId ?? 'Free'

  const navItems: { id: Section; label: string; icon: React.ReactNode; desc: string; agencyOnly?: boolean }[] = [
    { id: 'profile', label: 'Datos personales', icon: <User size={18} />, desc: 'Tu información y perfil' },
    { id: 'plan', label: 'Plan y facturación', icon: <CreditCard size={18} />, desc: 'Suscripción y uso' },
    { id: 'config', label: 'Configuración', icon: <Settings size={18} />, desc: 'Apariencia y preferencias' },
    { id: 'whitelabel', label: 'White Label', icon: <Palette size={18} />, desc: 'Marca y colores', agencyOnly: true },
    { id: 'team', label: 'Equipo', icon: <Users size={18} />, desc: 'Gestionar miembros', agencyOnly: true },
  ]

  const visibleNavItems = navItems.filter(item => !item.agencyOnly || isAgency)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-72 bg-surface border-r border-edge flex flex-col overflow-y-auto custom-scrollbar">
        {/* Profile Summary */}
        <div className="p-6 border-b border-edge-soft">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-ink">{user?.name ?? 'Usuario'}</h3>
              <p className="text-xs text-ink-faint">{user?.email ?? ''}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">{planLabel}</span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="p-4 flex-1">
          <div className="space-y-1">
            {visibleNavItems.map(item => (
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
          <p className="text-[10px] text-ink-faint text-center">Pluribots — Beta</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-page p-8">
        <div className="max-w-2xl">
          {section === 'profile' && <ProfileSection />}
          {section === 'plan' && <PlanSection />}
          {section === 'config' && <ConfigSection isDark={isDark} toggle={toggle} />}
          {section === 'whitelabel' && isAgency && <WhiteLabelSection />}
          {section === 'team' && isAgency && <TeamSection />}
        </div>
      </div>
    </div>
  )
}

/* ───── Profile Section ───── */
const ProfileSection = () => {
  const { user } = useAuth()
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">Datos personales</h2>
        <p className="text-sm text-ink-faint">Tu información de perfil</p>
      </div>

      <div className="bg-surface border border-edge rounded-2xl p-6">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">{user?.name ?? 'Usuario'}</h3>
            <p className="text-sm text-ink-faint">{user?.role === 'org_admin' ? 'Administrador de agencia' : user?.role === 'superadmin' ? 'Super Admin' : 'Usuario'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Nombre</label>
              <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
                <User size={14} className="text-ink-faint flex-shrink-0" />
                <span className="text-sm text-ink">{user?.name ?? '-'}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Email</label>
              <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
                <Mail size={14} className="text-ink-faint flex-shrink-0" />
                <span className="text-sm text-ink">{user?.email ?? '-'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Profesión</label>
              <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
                <Briefcase size={14} className="text-ink-faint flex-shrink-0" />
                <span className="text-sm text-ink">{user?.profession ?? 'No especificada'}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Rol</label>
              <div className="flex items-center gap-2 p-3 bg-subtle rounded-xl">
                <Shield size={14} className="text-ink-faint flex-shrink-0" />
                <span className="text-sm text-ink">{user?.role ?? 'user'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
          <Shield size={18} /> Seguridad
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
            <div>
              <p className="text-sm font-bold text-ink">Contraseña</p>
              <p className="text-xs text-ink-faint">Gestionada desde tu cuenta</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Segura</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
            <div>
              <p className="text-sm font-bold text-ink">Autenticación en 2 pasos</p>
              <p className="text-xs text-ink-faint">Próximamente disponible</p>
            </div>
            <span className="text-[10px] font-bold text-ink-faint bg-subtle px-2 py-1 rounded-full border border-edge">Próximamente</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───── Plan Section with Credits ───── */

interface CreditUsageData {
  balance: number
  monthlyCredits: number
  totalConsumed: number
  planId: string
  cycleStart: string
  byAgent: Array<{ agentId: string; credits: number }>
  byModel: Array<{ model: string; credits: number }>
}

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  popular: boolean
}

const creditPackages: CreditPackage[] = [
  { id: 'pack-500',  name: '500 Créditos',   credits: 500,  price: 29,  popular: false },
  { id: 'pack-2000', name: '2,000 Créditos', credits: 2000, price: 99,  popular: true  },
  { id: 'pack-5000', name: '5,000 Créditos', credits: 5000, price: 199, popular: false },
]

const PlanSection = () => {
  const { user, changePlan, updateCreditBalance } = useAuth()
  const [creditUsage, setCreditUsage] = useState<CreditUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  // Senior state
  const [subscription, setSubscription] = useState<SeniorSubscription | null>(null)
  const [tasks, setTasks] = useState<SeniorTask[]>([])
  const [loadingSub, setLoadingSub] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // New task form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('diseño')
  const [newPriority, setNewPriority] = useState('normal')

  const currentPlanId = user?.planId ?? 'starter'

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
          if (data.credits) setCreditUsage(data.credits)
        }
      } catch (err) {
        console.error('[Settings] Error fetching usage:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [])

  const getSeniorHeaders = () => {
    const token = localStorage.getItem('pluribots_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  // Fetch senior subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch(`${API_BASE}/senior/subscription`, { headers: getSeniorHeaders() })
        if (res.ok) {
          const data = await res.json()
          if (data.subscription) setSubscription(data.subscription)
        }
      } catch (err) {
        console.error('[Senior] Error fetching subscription:', err)
      } finally {
        setLoadingSub(false)
      }
    }
    fetchSubscription()
  }, [])

  // Fetch senior tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${API_BASE}/senior/tasks`, { headers: getSeniorHeaders() })
        if (res.ok) {
          const data = await res.json()
          if (data.tasks) setTasks(data.tasks)
        }
      } catch (err) {
        console.error('[Senior] Error fetching tasks:', err)
      } finally {
        setLoadingTasks(false)
      }
    }
    fetchTasks()
  }, [])

  const handleSubmitTask = async () => {
    if (!newTitle.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`${API_BASE}/senior/tasks`, {
        method: 'POST',
        headers: getSeniorHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          priority: newPriority,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear la tarea')
      }
      const data = await res.json()
      if (data.task) setTasks(prev => [data.task, ...prev])
      setNewTitle('')
      setNewDescription('')
      setNewCategory('diseño')
      setNewPriority('normal')
      setShowNewTask(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la tarea')
      setTimeout(() => setSubmitError(null), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  const subStatusBadge = subscription?.status === 'active'
    ? { label: 'Activo', cls: 'text-emerald-500 bg-emerald-500/10' }
    : subscription?.status === 'paused'
    ? { label: 'Pausado', cls: 'text-amber-500 bg-amber-500/10' }
    : { label: 'Cancelado', cls: 'text-red-500 bg-red-500/10' }

  const handleChangePlan = async (planId: string) => {
    setChangingPlan(planId)
    try {
      await changePlan(planId)
    } catch {
      // error handled in context
    } finally {
      setChangingPlan(null)
    }
  }

  const handlePurchaseCredits = async (packageId: string) => {
    setPurchasing(packageId)
    setPurchaseSuccess(null)
    setPurchaseError(null)
    try {
      const token = localStorage.getItem('pluribots_token')
      if (!token) {
        setPurchaseError('Debes iniciar sesión para comprar créditos')
        return
      }
      const res = await fetch(`${API_BASE}/usage/purchase-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al comprar créditos')
      }
      const data = await res.json()
      // Update balance in auth context and local state
      updateCreditBalance(data.newBalance)
      setCreditUsage(prev => prev ? { ...prev, balance: data.newBalance } : prev)
      setPurchaseSuccess(`+${data.package.credits.toLocaleString('es-CO')} créditos agregados`)
      setTimeout(() => setPurchaseSuccess(null), 4000)
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Error al procesar la compra')
      setTimeout(() => setPurchaseError(null), 4000)
    } finally {
      setPurchasing(null)
    }
  }

  const balance = creditUsage?.balance ?? user?.creditBalance ?? 0
  const monthlyCredits = creditUsage?.monthlyCredits ?? 100
  const totalConsumed = creditUsage?.totalConsumed ?? 0
  const balancePercent = monthlyCredits > 0 ? Math.min((Math.max(0, balance) / monthlyCredits) * 100, 100) : 0

  const formatNumber = (n: number) => n.toLocaleString('es-CO')

  const cycleLabel = creditUsage?.cycleStart
    ? `Desde ${new Date(creditUsage.cycleStart).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`
    : 'Ciclo actual'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">Tu equipo y facturación</h2>
        <p className="text-sm text-ink-faint">Gestiona tu equipo de agentes IA y expertos humanos</p>
      </div>

      {/* Explainer */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
        <p className="text-sm text-ink leading-relaxed">
          <span className="font-bold">Pluribots = tu equipo completo.</span> Tus <span className="font-semibold text-indigo-600 dark:text-indigo-400">agentes de IA</span> ejecutan tareas de marketing, diseño y desarrollo al instante con créditos. Si necesitas apoyo experto, contrata un <span className="font-semibold text-amber-600 dark:text-amber-400">Senior humano</span> que trabaja en tus proyectos más complejos.
        </p>
      </div>

      {/* Current Plan + Credits */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-soft rounded-xl text-primary">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-ink">Plan {currentPlanId === 'agency' ? 'Agency' : currentPlanId === 'pro' ? 'Pro' : 'Starter'}</h3>
              <p className="text-xs text-ink-faint">{cycleLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-ink">{formatNumber(Math.max(0, balance))}</p>
            <p className="text-[10px] text-ink-faint">créditos restantes</p>
          </div>
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
            {/* Credit balance bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-light font-medium">Balance de créditos</span>
                <span className="text-ink font-bold">{formatNumber(Math.max(0, balance))} / {formatNumber(monthlyCredits)}</span>
              </div>
              <div className="w-full bg-subtle h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${balancePercent < 20 ? 'bg-red-500' : balancePercent < 50 ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${balancePercent}%` }}
                />
              </div>
            </div>

            {/* Consumed vs Available */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-[10px] font-bold text-ink-faint uppercase">Consumidos</p>
                <p className="text-sm font-bold text-ink mt-0.5">{formatNumber(totalConsumed)}</p>
              </div>
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-[10px] font-bold text-ink-faint uppercase">Disponibles</p>
                <p className="text-sm font-bold text-ink mt-0.5">{formatNumber(Math.max(0, balance))}</p>
              </div>
            </div>

            {/* Per-agent breakdown */}
            {creditUsage && creditUsage.byAgent.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-2">Consumo por agente</p>
                <div className="space-y-2">
                  {creditUsage.byAgent.map(a => {
                    const agentPercent = totalConsumed > 0 ? (a.credits / totalConsumed) * 100 : 0
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
                            <span className="text-ink-faint">{formatNumber(a.credits)} créditos</span>
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
          </div>
        )}

      </div>

      {/* Plan Comparison */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <h3 className="font-bold text-ink mb-1">Planes de agentes IA</h3>
        <p className="text-xs text-ink-faint mb-4">Créditos para ejecutar tareas automáticas con tus bots</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'starter', name: 'Starter', price: 'Gratis', credits: '50', features: ['2 agentes', '50 créditos/mes', 'Soporte email'] },
            { id: 'pro', name: 'Pro', price: '$29/mes', credits: '500', features: ['7 agentes', '500 créditos/mes', 'Modelos premium', 'Soporte prioritario'] },
            { id: 'agency', name: 'Agency', price: '$99/mes', credits: '2,500', features: ['Agentes ilimitados', '2,500 créditos/mes', 'White Label', 'Equipo y staff', 'Soporte 24/7'] },
          ].map(plan => (
            <div key={plan.name} className={`p-4 rounded-xl border flex flex-col ${plan.id === currentPlanId ? 'border-primary bg-primary-soft' : 'border-edge bg-subtle'}`}>
              <p className="text-sm font-bold text-ink">{plan.name}</p>
              <p className="text-lg font-bold text-ink mt-1">{plan.price}</p>
              <p className="text-xs text-primary font-semibold">{plan.credits} créditos/mes</p>
              <div className="mt-3 space-y-2 flex-1">
                {plan.features.map(f => (
                  <p key={f} className="text-[11px] text-ink-light flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-500 flex-shrink-0" /> {f}
                  </p>
                ))}
              </div>
              {plan.id === currentPlanId ? (
                <p className="mt-3 text-[10px] font-bold text-primary">Plan actual</p>
              ) : (
                <button
                  onClick={() => handleChangePlan(plan.id)}
                  disabled={changingPlan !== null}
                  className="mt-3 w-full py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 bg-primary text-primary-fg hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {changingPlan === plan.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    'Seleccionar'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Credit Add-ons */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl">
            <Plus size={18} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="font-bold text-ink">Créditos Extra</h3>
            <p className="text-xs text-ink-faint">Compra paquetes adicionales de créditos</p>
          </div>
        </div>

        {/* Success/Error messages */}
        {purchaseSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
            <Check size={14} className="text-emerald-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{purchaseSuccess}</p>
          </div>
        )}
        {purchaseError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">{purchaseError}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4">
          {creditPackages.map(pkg => (
            <div
              key={pkg.id}
              className={`relative p-5 rounded-xl border-2 transition-all ${
                pkg.popular
                  ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 shadow-sm shadow-indigo-500/10'
                  : 'border-edge bg-subtle hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold rounded-full">
                  <Star size={10} className="fill-current" /> Popular
                </div>
              )}

              <div className="text-center">
                <p className="text-2xl font-bold text-ink mt-1">{pkg.credits.toLocaleString('es-CO')}</p>
                <p className="text-xs text-ink-faint">créditos</p>

                <div className="mt-3 mb-4">
                  <span className="text-xl font-bold text-ink">${pkg.price}</span>
                  <span className="text-xs text-ink-faint ml-1">USD</span>
                </div>

                <p className="text-[10px] text-ink-faint mb-3">
                  ${(pkg.price / pkg.credits * 100).toFixed(1)} centavos/crédito
                </p>

                <button
                  onClick={() => handlePurchaseCredits(pkg.id)}
                  disabled={purchasing !== null}
                  className={`w-full py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                  }`}
                >
                  {purchasing === pkg.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={14} />
                      Comprar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-ink-faint text-center mt-4">
          Los créditos extra se suman a tu balance y no expiran con el ciclo mensual.
        </p>
      </div>

      {/* ── Soporte Senior ── */}
      <div className="pt-2">
        <div className="border-t border-edge mb-6" />
        <h2 className="text-lg font-bold text-ink mb-1">Seniors humanos</h2>
        <p className="text-sm text-ink-faint mb-6">Suma expertos reales a tu equipo para tareas complejas</p>
      </div>

      {/* A) Current Subscription Status */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl">
            <Award size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-ink">Tu suscripción Senior</h3>
            <p className="text-xs text-ink-faint">Estado actual de tu plan de soporte</p>
          </div>
        </div>

        {loadingSub ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-4 w-32 bg-subtle rounded" />
                <div className="h-4 w-20 bg-subtle rounded" />
              </div>
            ))}
          </div>
        ) : subscription ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
              <div>
                <p className="text-sm font-bold text-ink">{subscription.tierName}</p>
                <p className="text-xs text-ink-faint">${subscription.price.toLocaleString('es-CO')}/mes</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${subStatusBadge.cls}`}>
                {subStatusBadge.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-[10px] font-bold text-ink-faint uppercase">Tareas simultáneas</p>
                <p className="text-sm font-bold text-ink mt-0.5">{subscription.maxConcurrent}</p>
              </div>
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-[10px] font-bold text-ink-faint uppercase">SLA de entrega</p>
                <p className="text-sm font-bold text-ink mt-0.5">{subscription.slaHours}h</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-subtle rounded-xl flex items-center gap-3">
            <MessageSquare size={16} className="text-ink-faint flex-shrink-0" />
            <p className="text-sm text-ink-light">No tienes un plan de soporte senior activo</p>
          </div>
        )}
      </div>

      {/* B) Senior Tiers Comparison */}
      <div className="bg-surface border border-edge rounded-2xl p-6">
        <h3 className="font-bold text-ink mb-1">Seniors para tu equipo</h3>
        <p className="text-xs text-ink-faint mb-5">Expertos humanos trabajando para tu negocio</p>

        <div className="grid grid-cols-3 gap-4">
          {seniorTiers.map(tier => {
            const isCurrent = subscription?.tierId === tier.id
            return (
              <div
                key={tier.id}
                className={`relative p-5 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary-soft shadow-sm shadow-primary/10'
                    : tier.popular
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 shadow-sm shadow-indigo-500/10'
                    : 'border-edge bg-subtle hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {/* Popular badge */}
                {tier.popular && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                    <Star size={10} className="fill-current" /> Más popular
                  </div>
                )}

                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                    <Check size={10} /> Plan actual
                  </div>
                )}

                <div className="text-center">
                  <p className="text-sm font-bold text-ink mt-1">{tier.name}</p>
                  <div className="mt-2 mb-3">
                    <span className="text-2xl font-bold text-ink">${tier.price.toLocaleString('es-CO')}</span>
                    <span className="text-xs text-ink-faint">/mes</span>
                  </div>

                  <div className="text-left space-y-2 mb-4">
                    {tier.features.map(f => (
                      <p key={f} className="text-[11px] text-ink-light flex items-start gap-1.5">
                        <Check size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                      </p>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-primary/10 text-primary border border-primary/20 text-center">
                      Plan actual
                    </div>
                  ) : (
                    <button
                      onClick={() => window.open('mailto:senior@pluribots.com?subject=Contratar%20Senior%20-%20' + encodeURIComponent(tier.name), '_blank')}
                      className={`w-full py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                        tier.popular
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm'
                          : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                      }`}
                    >
                      <Zap size={14} />
                      Contratar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* C) My Tasks (only if subscribed) */}
      {subscription && (
        <div className="bg-surface border border-edge rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl">
                <Briefcase size={20} className="text-indigo-500" />
              </div>
              <div>
                <h3 className="font-bold text-ink">Mis tareas Senior</h3>
                <p className="text-xs text-ink-faint">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
            >
              <Plus size={14} />
              Nueva tarea
            </button>
          </div>

          {/* Success message */}
          {submitSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
              <Check size={14} className="text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Tarea creada exitosamente</p>
            </div>
          )}

          {/* New Task Form */}
          {showNewTask && (
            <div className="mb-5 p-5 bg-subtle border border-edge rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-ink">Nueva tarea Senior</h4>
                <button onClick={() => setShowNewTask(false)} className="text-ink-faint hover:text-ink transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Título</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Rediseño de landing page"
                    className="w-full px-3 py-2.5 text-sm bg-page border border-edge rounded-xl focus:outline-none focus:border-primary text-ink placeholder:text-ink-faint/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Descripción</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe la tarea con el mayor detalle posible..."
                    rows={4}
                    className="w-full px-3 py-2.5 text-sm bg-page border border-edge rounded-xl focus:outline-none focus:border-primary text-ink placeholder:text-ink-faint/50 resize-none"
                  />
                </div>

                {/* Category + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Categoría</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-page border border-edge rounded-xl focus:outline-none focus:border-primary text-ink"
                    >
                      {seniorCategories.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Prioridad</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-page border border-edge rounded-xl focus:outline-none focus:border-primary text-ink"
                    >
                      {seniorPriorities.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Error */}
                {submitError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">{submitError}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowNewTask(false)}
                    className="px-4 py-2 text-xs font-semibold text-ink-light bg-page border border-edge rounded-xl hover:bg-subtle transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitTask}
                    disabled={submitting || !newTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        Crear tarea
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks List */}
          {loadingTasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-4 bg-subtle rounded-xl">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-48 bg-page rounded" />
                    <div className="h-4 w-20 bg-page rounded" />
                  </div>
                  <div className="h-3 w-32 bg-page rounded" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase size={32} className="mx-auto text-ink-faint/30 mb-3" />
              <p className="text-sm text-ink-faint">No tienes tareas aún</p>
              <p className="text-xs text-ink-faint/70 mt-1">Crea tu primera tarea Senior para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const statusCfg = seniorStatusConfig[task.status] ?? seniorStatusConfig.pending
                return (
                  <div key={task.id} className="p-4 bg-subtle rounded-xl hover:bg-surface-alt transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          <span className="text-[10px] text-ink-faint bg-page px-2 py-0.5 rounded-full border border-edge">
                            {seniorCategories.find(c => c.value === task.category)?.label ?? task.category}
                          </span>
                          {task.priority === 'urgente' && (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 flex items-center gap-0.5">
                              <AlertTriangle size={9} /> Urgente
                            </span>
                          )}
                          {task.priority === 'alta' && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                              Alta
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-ink-faint flex items-center gap-1 justify-end">
                          <Clock size={10} />
                          {new Date(task.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </p>
                        {task.deliveredAt && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 justify-end">
                            <Check size={10} />
                            {new Date(task.deliveredAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ───── Config Section ───── */
const ConfigSection = ({ isDark, toggle }: { isDark: boolean; toggle: () => void }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-ink mb-1">Configuración</h2>
      <p className="text-sm text-ink-faint">Apariencia y preferencias</p>
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
          <p className="text-sm font-bold text-ink">Modo oscuro</p>
          <p className="text-xs text-ink-faint">Cambia entre tema claro y oscuro</p>
        </div>
        <div className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-inset'}`}>
          <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${isDark ? 'translate-x-5' : ''}`} />
        </div>
      </button>
    </div>

    {/* Workspace */}
    <div className="bg-surface border border-edge rounded-2xl p-6">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        <Building size={18} /> Preferencias
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
          <div>
            <p className="text-sm font-bold text-ink">Idioma del sistema</p>
            <p className="text-xs text-ink-faint">Español (Latinoamérica)</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
          <div>
            <p className="text-sm font-bold text-ink">Zona horaria</p>
            <p className="text-xs text-ink-faint">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

/* ───── White Label Section ───── */
const WhiteLabelSection = () => {
  const { organization, updateOrganization } = useOrganization()
  const [orgName, setOrgName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name)
      setLogoUrl(organization.logoUrl || '')
      setPrimaryColor(organization.primaryColor || '#6366f1')
    }
  }, [organization])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateOrganization({
        name: orgName,
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        const fullUrl = `${window.location.protocol}//${window.location.hostname}:3001${data.url}`
        setLogoUrl(fullUrl)
      }
    } catch (err) {
      console.error('[WhiteLabel] Upload error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">White Label</h2>
        <p className="text-sm text-ink-faint">Personaliza tu marca, logo y colores</p>
      </div>

      <div className="bg-surface border border-edge rounded-2xl p-6">
        <div className="space-y-5">
          {/* Org Name */}
          <div>
            <label className="block text-xs font-semibold text-ink-faint mb-1.5">Nombre de la organización</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Mi Agencia"
              className="w-full px-3 py-2.5 text-sm bg-page border border-edge rounded-xl focus:outline-none focus:border-primary text-ink"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-semibold text-ink-faint mb-1.5 flex items-center gap-1">
              <Image size={12} />
              Logo
            </label>

            {logoUrl && (
              <div className="mb-3 flex items-center gap-3">
                <img src={logoUrl} alt="Logo preview" className="w-14 h-14 rounded-xl object-cover border border-edge" />
                <div>
                  <span className="text-[11px] text-ink-faint block">Logo actual</span>
                  <button
                    onClick={() => setLogoUrl('')}
                    className="text-[10px] text-red-500 font-semibold hover:underline mt-0.5"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 disabled:opacity-50 transition-all"
              >
                <Upload size={14} />
                {uploading ? 'Subiendo...' : 'Subir desde computador'}
              </button>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] font-semibold text-ink-faint mb-1">O pegar URL directamente</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-ink-faint mb-1.5 flex items-center gap-1">
              <Palette size={12} />
              Color primario
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-edge cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink font-mono"
              />
              <div
                className="flex-1 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: primaryColor, color: getContrastFg(primaryColor) }}
              >
                Vista previa
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-4 border border-edge rounded-xl bg-page">
            <p className="text-[10px] font-bold text-ink-faint uppercase mb-3">Vista previa</p>
            <div className="flex items-center gap-3 mb-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
                  {orgName ? orgName.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <span className="text-sm font-bold text-ink">{orgName || 'Mi Agencia'}</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-bold rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                Botón primario
              </button>
              <button className="px-3 py-1.5 text-xs font-bold rounded-lg" style={{ backgroundColor: primaryColor + '20', color: primaryColor }}>
                Botón secundario
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───── Team Section ───── */
const TeamSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-ink mb-1">Equipo</h2>
      <p className="text-sm text-ink-faint">Gestiona los miembros de tu organización</p>
    </div>
    <OrganizationSettings />
  </div>
)

/* ───── Senior Config (used by PlanSection) ───── */

interface SeniorSubscription {
  id: string
  tierId: string
  tierName: string
  price: number
  maxConcurrent: number
  slaHours: number
  status: 'active' | 'paused' | 'cancelled'
}

interface SeniorTask {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: 'pending' | 'in_progress' | 'review' | 'delivered' | 'cancelled'
  createdAt: string
  deliveredAt?: string
}

const seniorTiers = [
  {
    id: 'senior_basic',
    name: 'Senior Básico',
    price: 149,
    maxConcurrent: 1,
    slaHours: 48,
    features: [
      '1 tarea a la vez',
      'Entrega en 48 horas',
      'Revisiones ilimitadas',
      'Soporte por chat',
    ],
  },
  {
    id: 'senior_pro',
    name: 'Senior Pro',
    price: 349,
    maxConcurrent: 2,
    slaHours: 24,
    popular: true,
    features: [
      '2 tareas simultáneas',
      'Entrega en 24 horas',
      'Revisiones ilimitadas',
      'Soporte por chat y videollamada',
      'Prioridad en la cola',
    ],
  },
  {
    id: 'senior_dedicated',
    name: 'Senior Dedicado',
    price: 799,
    maxConcurrent: 5,
    slaHours: 24,
    features: [
      'Hasta 5 tareas simultáneas',
      'Entrega en 24 horas',
      'Senior dedicado a tu cuenta',
      'Revisiones ilimitadas',
      'Soporte prioritario 24/7',
      'Llamada semanal de seguimiento',
    ],
  },
]

const seniorStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' },
  in_progress: { label: 'En progreso', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' },
  review: { label: 'En revisión', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' },
  delivered: { label: 'Entregada', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'Cancelada', color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800' },
}

const seniorCategories = [
  { value: 'diseño', label: 'Diseño' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'seo', label: 'SEO' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'estrategia', label: 'Estrategia' },
  { value: 'branding', label: 'Branding' },
  { value: 'video', label: 'Video' },
]

const seniorPriorities = [
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

/* ───── Helper ───── */
function getContrastFg(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}

export default SettingsView
