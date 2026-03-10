import { useState, useEffect, useRef } from 'react'
import { Moon, Sun, Shield, User, CreditCard, Settings, Mail, Briefcase, Building, Zap, Check, Palette, Users, Image, Upload, Plus, Star, ShoppingCart, Clock, Send, X, AlertTriangle, MessageSquare, Award, Github, TrendingUp, Unplug, ExternalLink, ChevronDown } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import OrganizationSettings from '../admin/OrganizationSettings'
import { plans } from '../../data/pricing'

type Section = 'profile' | 'plan' | 'config' | 'github' | 'meta' | 'api' | 'whitelabel' | 'team'

const API_BASE = '/api'



const agentNames: Record<string, string> = {
  seo: 'Lupa',
  web: 'Pixel',
  ads: 'Metric',
  dev: 'Code',
  base: 'Plury',
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a78bfa',
  ads: '#10b981',
  dev: '#f59e0b',
  base: '#6366f1',
}

const SettingsView = () => {
  const { isDark, toggle } = useTheme()
  const { user } = useAuth()
  const [section, setSection] = useState<Section>(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('section')
    if (s && ['profile', 'plan', 'config', 'github', 'meta', 'api', 'whitelabel', 'team'].includes(s)) {
      return s as Section
    }
    return 'profile'
  })

  const isAgency = user?.role === 'org_admin' || user?.role === 'superadmin'
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'
  const planLabel = user?.planId === 'agency' ? 'Agency' : user?.planId === 'starter' ? 'Starter' : user?.planId ?? 'Free'

  const navItems: { id: Section; label: string; icon: React.ReactNode; desc: string; agencyOnly?: boolean }[] = [
    { id: 'profile', label: 'Datos personales', icon: <User size={18} />, desc: 'Tu información y perfil' },
    { id: 'plan', label: 'Plan y facturación', icon: <CreditCard size={18} />, desc: 'Suscripción y uso' },
    { id: 'config', label: 'Configuración', icon: <Settings size={18} />, desc: 'Apariencia y preferencias' },
    { id: 'github', label: 'GitHub', icon: <Github size={18} />, desc: 'Conectar repositorios' },
    { id: 'meta', label: 'Meta Ads', icon: <TrendingUp size={18} />, desc: 'Facebook e Instagram Ads' },
    { id: 'api', label: 'API', icon: <Unplug size={18} />, desc: 'Integración programática', agencyOnly: true },
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
            <div className="w-14 h-14 bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] rounded-2xl flex items-center justify-center text-white text-xl font-bold">
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
          <p className="text-[10px] text-ink-faint text-center">Plury — Beta</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-page p-8">
        <div className="max-w-2xl">
          {section === 'profile' && <ProfileSection />}
          {section === 'plan' && <PlanSection />}
          {section === 'config' && <ConfigSection isDark={isDark} toggle={toggle} />}
          {section === 'github' && <GitHubSection />}
          {section === 'meta' && <MetaAdsSection />}
          {section === 'api' && isAgency && <ApiKeysSection />}
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
          <div className="w-20 h-20 bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
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
        const token = localStorage.getItem('plury_token')
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
    const token = localStorage.getItem('plury_token')
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
      const token = localStorage.getItem('plury_token')
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#a78bfa]/5 to-[#a78bfa]/5 border border-[#a78bfa]/10">
        <p className="text-sm text-ink leading-relaxed">
          <span className="font-bold">Plury = tu equipo completo.</span> Tus <span className="font-semibold text-[#8b5cf6] dark:text-[#a78bfa]">agentes de IA</span> ejecutan tareas de marketing, diseño y desarrollo al instante con créditos. Si necesitas apoyo experto, contrata un <span className="font-semibold text-amber-600 dark:text-amber-400">Senior humano</span> que trabaja en tus proyectos más complejos.
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
          {plans.map(plan => (
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
          <div className="p-2 bg-gradient-to-br from-[#a78bfa]/10 to-[#a78bfa]/10 rounded-xl">
            <Plus size={18} className="text-[#a78bfa]" />
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
                  ? 'border-[#a78bfa] bg-gradient-to-br from-[#a78bfa]/5 to-[#a78bfa]/5 shadow-sm shadow-[#a78bfa]/10'
                  : 'border-edge bg-subtle hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] text-white text-[10px] font-bold rounded-full">
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
                      ? 'bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] text-white hover:from-[#8b5cf6] hover:to-purple-700 shadow-sm'
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
                    ? 'border-[#a78bfa] bg-gradient-to-br from-[#a78bfa]/5 to-[#a78bfa]/5 shadow-sm shadow-[#a78bfa]/10'
                    : 'border-edge bg-subtle hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {/* Popular badge */}
                {tier.popular && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
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
                      onClick={() => window.open('mailto:senior@plury.co?subject=Contratar%20Senior%20-%20' + encodeURIComponent(tier.name), '_blank')}
                      className={`w-full py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                        tier.popular
                          ? 'bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] text-white hover:from-[#8b5cf6] hover:to-purple-700 shadow-sm'
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
              <div className="p-2.5 bg-gradient-to-br from-[#a78bfa]/10 to-[#a78bfa]/10 rounded-xl">
                <Briefcase size={20} className="text-[#a78bfa]" />
              </div>
              <div>
                <h3 className="font-bold text-ink">Mis tareas Senior</h3>
                <p className="text-xs text-ink-faint">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] rounded-xl hover:from-[#8b5cf6] hover:to-purple-700 transition-all shadow-sm"
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
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] rounded-xl hover:from-[#8b5cf6] hover:to-purple-700 transition-all disabled:opacity-50 shadow-sm"
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
const MetaAdsSection = () => {
  const [status, setStatus] = useState<{ connected: boolean; userName?: string; adAccountId?: string; expiresAt?: string } | null>(null)
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; status: string; currency: string }>>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [selectingAccount, setSelectingAccount] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const authToken = localStorage.getItem('plury_token')

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/meta/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await resp.json()
      setStatus(data)
      if (data.connected && !data.adAccountId) {
        fetchAccounts()
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const fetchAccounts = async () => {
    try {
      const resp = await fetch(`${API_BASE}/meta/accounts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await resp.json()
      setAccounts(data.accounts || [])
      setShowAccounts(true)
    } catch { /* ignore */ }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/meta/auth-url`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await resp.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'No se pudo obtener la URL de autorizacion. Verifica que FACEBOOK_APP_ID y FACEBOOK_APP_SECRET esten configurados en el servidor.')
      }
    } catch {
      setError('Error de conexion con el servidor. Intenta de nuevo.')
    }
    setConnecting(false)
  }

  const handleSelectAccount = async (adAccountId: string) => {
    setSelectingAccount(true)
    try {
      await fetch(`${API_BASE}/meta/select-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ adAccountId }),
      })
      setShowAccounts(false)
      fetchStatus()
    } catch { /* ignore */ }
    setSelectingAccount(false)
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch(`${API_BASE}/meta/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setStatus({ connected: false })
      setAccounts([])
    } catch { /* ignore */ }
    setDisconnecting(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink mb-1">Meta Ads</h2>
          <p className="text-sm text-ink-faint">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">Meta Ads</h2>
        <p className="text-sm text-ink-faint">Conecta tu cuenta de Meta para crear campanas reales en Facebook e Instagram</p>
      </div>

      {!status?.connected ? (
        <div className="bg-surface border border-edge rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp size={24} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-ink mb-2">Conectar con Meta</h3>
              <p className="text-sm text-ink-faint mb-4">
                Al conectar tu cuenta de Meta, el agente Metric podra crear y gestionar campanas publicitarias reales directamente desde el chat. Podras:
              </p>
              <ul className="text-sm text-ink-faint space-y-1.5 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Crear campanas en Facebook e Instagram</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Configurar audiencias y segmentacion</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Ver metricas de rendimiento en tiempo real</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Todas las campanas se crean en PAUSED por seguridad</li>
              </ul>
              {error && (
                <div className="p-3 mb-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ExternalLink size={16} />
                {connecting ? 'Conectando...' : 'Conectar con Meta'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-edge rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                Cuenta conectada
              </h3>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Unplug size={14} />
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>

            <div className="space-y-3">
              {status.userName && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-ink-faint">Usuario</span>
                  <span className="text-sm font-medium text-ink">{status.userName}</span>
                </div>
              )}
              {status.adAccountId && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-ink-faint">Cuenta de anuncios</span>
                  <span className="text-sm font-mono text-ink">{status.adAccountId}</span>
                </div>
              )}
              {status.expiresAt && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-ink-faint">Token expira</span>
                  <span className="text-sm text-ink">{new Date(status.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {!status.adAccountId && (
              <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-600 font-medium mb-2">Selecciona una cuenta de anuncios</p>
                <p className="text-xs text-ink-faint mb-3">Necesitas seleccionar una cuenta de anuncios para que Metric pueda crear campanas.</p>
                <button
                  onClick={fetchAccounts}
                  className="px-4 py-2 text-sm font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ChevronDown size={14} />
                  Cargar cuentas
                </button>
              </div>
            )}
          </div>

          {showAccounts && accounts.length > 0 && (
            <div className="bg-surface border border-edge rounded-2xl p-6">
              <h3 className="font-bold text-ink mb-4">Seleccionar cuenta de anuncios</h3>
              <div className="space-y-2">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc.id)}
                    disabled={selectingAccount}
                    className="w-full flex items-center justify-between p-3 bg-subtle hover:bg-edge/50 border border-edge rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink">{acc.name}</p>
                      <p className="text-xs text-ink-faint">{acc.id} - {acc.currency}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                      {acc.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {status.adAccountId && (
            <div className="bg-surface border border-edge rounded-2xl p-6">
              <h3 className="font-bold text-ink mb-2 flex items-center gap-2">
                <Zap size={16} className="text-emerald-500" />
                Listo para usar
              </h3>
              <p className="text-sm text-ink-faint">
                El agente Metric ahora puede crear campanas reales. Prueba en el chat: "Crea una campana de trafico para mi tienda online".
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const GitHubSection = () => {
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [ghUser, setGhUser] = useState<{ username: string; avatarUrl: string } | null>(null)
  const [saved, setSaved] = useState(false)

  // Load existing connection status
  useEffect(() => {
    const authToken = localStorage.getItem('token')
    if (!authToken) return
    fetch('/api/github/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ token: '' }),
    }).catch(() => {})
  }, [])

  const handleValidate = async () => {
    if (!token) return
    setValidating(true)
    setGhUser(null)
    try {
      const resp = await fetch('/api/github/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ token }),
      })
      const data = await resp.json()
      if (data.valid) {
        setGhUser({ username: data.username, avatarUrl: data.avatarUrl })
      }
    } catch { /* ignore */ }
    setValidating(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/github/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ token }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">GitHub</h2>
        <p className="text-sm text-ink-faint">Conecta tu cuenta de GitHub para hacer push de tus proyectos</p>
      </div>

      <div className="bg-surface border border-edge rounded-2xl p-6">
        <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
          <Github size={18} />
          Personal Access Token
        </h3>
        <div className="space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => { setToken(e.target.value); setGhUser(null); setSaved(false); }}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 bg-subtle border border-edge rounded-xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[11px] text-ink-faint">
            Genera un token en GitHub Settings &gt; Developer settings &gt; Personal access tokens &gt; Fine-grained tokens.
            Necesita permisos de &quot;Contents&quot; (read and write).
          </p>

          {ghUser && (
            <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <img src={ghUser.avatarUrl} alt={ghUser.username} className="w-8 h-8 rounded-full" />
              <div>
                <p className="text-sm font-bold text-ink">{ghUser.username}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Token valido</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleValidate}
              disabled={!token || validating}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-edge rounded-xl hover:bg-subtle disabled:opacity-50 transition-colors"
            >
              {validating ? 'Validando...' : 'Validar token'}
            </button>
            <button
              onClick={handleSave}
              disabled={!token || !ghUser || saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  review: { label: 'En revisión', color: 'text-purple-700 dark:text-[#a78bfa]', bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' },
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

/* ───── API Keys Section ───── */

interface ApiKeyItem {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  rateLimit: number
}

const ApiKeysSection = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showDocs, setShowDocs] = useState(false)

  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('plury_token')
      const res = await fetch(`${API_BASE}/api-keys`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) setKeys(await res.json())
    } catch (err) {
      console.error('Fetch API keys error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  const createKey = async () => {
    setCreating(true)
    try {
      const token = localStorage.getItem('plury_token')
      const res = await fetch(`${API_BASE}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: newKeyName || 'Default' }),
      })
      if (res.ok) {
        const data = await res.json()
        setRevealedKey(data.key)
        setNewKeyName('')
        fetchKeys()
      }
    } catch (err) {
      console.error('Create API key error:', err)
    } finally {
      setCreating(false)
    }
  }

  const toggleKey = async (id: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('plury_token')
      await fetch(`${API_BASE}/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ isActive: !isActive }),
      })
      fetchKeys()
    } catch (err) {
      console.error('Toggle API key error:', err)
    }
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Eliminar esta API key permanentemente?')) return
    try {
      const token = localStorage.getItem('plury_token')
      await fetch(`${API_BASE}/api-keys/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      fetchKeys()
    } catch (err) {
      console.error('Delete API key error:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink mb-1">API Keys</h2>
        <p className="text-sm text-ink-faint">Integra Plury en tus proyectos mediante nuestra API REST</p>
      </div>

      {/* Quick Start */}
      <div className="bg-surface border border-edge rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm">Quick Start</h3>
          <button onClick={() => setShowDocs(!showDocs)} className="text-xs text-primary hover:underline flex items-center gap-1">
            {showDocs ? 'Ocultar' : 'Ver documentacion'}
            <ExternalLink size={12} />
          </button>
        </div>

        {showDocs && (
          <div className="space-y-3 text-xs">
            <div className="bg-page rounded-lg p-4 font-mono text-ink-faint overflow-x-auto">
              <div className="text-ink-faint mb-2"># Generar una landing page</div>
              <div className="text-ink">curl -X POST https://plury.co/api/v1/generate \</div>
              <div className="text-ink pl-4">-H "X-API-Key: pk_live_tu_key_aqui" \</div>
              <div className="text-ink pl-4">-H "Content-Type: application/json" \</div>
              <div className="text-ink pl-4">{`-d '{"prompt": "Landing page para pizzeria con delivery", "agent": "dev"}'`}</div>
            </div>
            <div className="bg-page rounded-lg p-4 font-mono text-ink-faint overflow-x-auto">
              <div className="text-ink-faint mb-2"># Consultar resultado</div>
              <div className="text-ink">curl https://plury.co/api/v1/generations/GENERATION_ID \</div>
              <div className="text-ink pl-4">-H "X-API-Key: pk_live_tu_key_aqui"</div>
            </div>
            <div className="bg-page rounded-lg p-4 font-mono text-ink-faint overflow-x-auto">
              <div className="text-ink-faint mb-2"># Ver creditos disponibles</div>
              <div className="text-ink">curl https://plury.co/api/v1/usage \</div>
              <div className="text-ink pl-4">-H "X-API-Key: pk_live_tu_key_aqui"</div>
            </div>
            <p className="text-ink-faint">
              Documentacion completa: <a href="https://plury.co/api/v1/docs" target="_blank" rel="noopener" className="text-primary hover:underline">plury.co/api/v1/docs</a>
            </p>
            <div className="border-t border-edge pt-3">
              <p className="font-semibold text-ink mb-2">Endpoints disponibles:</p>
              <table className="w-full text-left">
                <tbody className="divide-y divide-edge-soft">
                  <tr><td className="py-1.5 font-mono text-primary">POST /api/v1/generate</td><td className="py-1.5 text-ink-faint">Genera web, landing, reporte, contenido</td></tr>
                  <tr><td className="py-1.5 font-mono text-primary">GET /api/v1/generations/:id</td><td className="py-1.5 text-ink-faint">Estado y resultado de una generacion</td></tr>
                  <tr><td className="py-1.5 font-mono text-primary">GET /api/v1/generations</td><td className="py-1.5 text-ink-faint">Lista todas las generaciones</td></tr>
                  <tr><td className="py-1.5 font-mono text-primary">GET /api/v1/usage</td><td className="py-1.5 text-ink-faint">Balance de creditos y uso</td></tr>
                  <tr><td className="py-1.5 font-mono text-primary">GET /api/v1/agents</td><td className="py-1.5 text-ink-faint">Agentes disponibles</td></tr>
                  <tr><td className="py-1.5 font-mono text-primary">GET /api/v1/docs</td><td className="py-1.5 text-ink-faint">OpenAPI spec (JSON)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="border-t border-edge pt-3">
              <p className="font-semibold text-ink mb-2">Rate Limits:</p>
              <p className="text-ink-faint">Agency: 100 req/hora | Enterprise: 500 req/hora</p>
            </div>
          </div>
        )}
      </div>

      {/* Revealed key warning */}
      {revealedKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-400">Guarda esta key — no se mostrara de nuevo</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-page rounded-lg px-3 py-2 text-xs font-mono text-ink select-all break-all">{revealedKey}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(revealedKey); }}
              className="px-3 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors"
            >
              Copiar
            </button>
          </div>
          <button onClick={() => setRevealedKey(null)} className="text-xs text-ink-faint hover:text-ink">Cerrar</button>
        </div>
      )}

      {/* Create new key */}
      <div className="bg-surface border border-edge rounded-xl p-5">
        <h3 className="font-semibold text-ink text-sm mb-3">Crear nueva API Key</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Nombre (ej: Mi App, Produccion)"
            className="flex-1 bg-page border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={createKey}
            disabled={creating}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus size={14} />
            {creating ? 'Creando...' : 'Crear Key'}
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-ink-faint py-8 text-center">Cargando...</div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-ink-faint py-8 text-center">No tienes API keys. Crea una para comenzar.</div>
        ) : (
          keys.map(k => (
            <div key={k.id} className={`bg-surface border rounded-xl p-4 flex items-center gap-4 ${k.isActive ? 'border-edge' : 'border-edge opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-ink">{k.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${k.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {k.isActive ? 'ACTIVA' : 'INACTIVA'}
                  </span>
                </div>
                <code className="text-xs text-ink-faint font-mono">{k.keyPrefix}</code>
                <div className="flex gap-3 mt-1 text-[11px] text-ink-faint">
                  <span>Creada: {new Date(k.createdAt).toLocaleDateString()}</span>
                  {k.lastUsedAt && <span>Ultimo uso: {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                  <span>Limite: {k.rateLimit} req/h</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => toggleKey(k.id, k.isActive)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-edge hover:bg-page transition-colors text-ink-faint"
                >
                  {k.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SettingsView
