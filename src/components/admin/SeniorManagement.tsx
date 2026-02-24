import { useState, useEffect, useCallback } from 'react'
import {
  Users, ListTodo, CreditCard, BarChart3, Plus, X, Clock,
  UserCheck, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink, Send, Star, Briefcase, Code, Palette, Search,
  Megaphone, TrendingUp, Target, Video, CircleDot
} from 'lucide-react'

// ─── Types ───

interface SeniorMember {
  id: string
  name: string
  email: string
  role: string
  status: string
  capacity: number
  currentLoad: number
  tasks: { id: string; title: string; status: string }[]
}

interface SeniorTask {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category: string
  organizationId: string | null
  requestedById: string
  requestedBy: { id: string; name: string; email: string; organizationId?: string }
  seniorId: string | null
  senior: { id: string; name: string; role: string } | null
  requestedAt: string
  startedAt: string | null
  deliveredAt: string | null
  slaDeadline: string | null
  deliveryNotes: string | null
  deliveryUrl: string | null
  createdAt: string
}

interface SeniorSubscription {
  id: string
  organizationId: string | null
  userId: string
  user: { id: string; name: string; email: string; organizationId?: string }
  tier: string
  price: number
  maxConcurrent: number
  slaHours: number
  status: string
  activeTasks: number
  createdAt: string
}

interface SeniorStats {
  activeTasks: number
  totalDelivered: number
  avgDeliveryHours: number
  slaCompliance: number
  monthlyRevenue: number
  tasksByCategory: { category: string; count: number }[]
  tasksByStatus: { status: string; count: number }[]
}

type SeniorTab = 'team' | 'tasks' | 'subscriptions' | 'stats'

// ─── Helpers ───

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('pluribots_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const formatSlaCountdown = (deadline: string | null) => {
  if (!deadline) return null
  const remaining = new Date(deadline).getTime() - Date.now()
  if (remaining <= 0) return { text: 'Vencido', overdue: true }
  const hrs = Math.floor(remaining / (1000 * 60 * 60))
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return { text: `${hrs}h ${mins}m`, overdue: false }
}

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Pendiente' },
    in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'En progreso' },
    review: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'En revisión' },
    delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Entregada' },
    cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Cancelada' },
  }
  const s = map[status] ?? { bg: 'bg-gray-500/10', text: 'text-gray-500', label: status }
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

const memberStatusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    available: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Disponible' },
    busy: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Ocupado' },
    offline: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Offline' },
  }
  const s = map[status] ?? { bg: 'bg-gray-500/10', text: 'text-gray-500', label: status }
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

const priorityBadge = (priority: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    urgent: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Urgente' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Alta' },
    normal: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Normal' },
    low: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Baja' },
  }
  const s = map[priority] ?? { bg: 'bg-gray-500/10', text: 'text-gray-500', label: priority }
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

const categoryIcon = (category: string) => {
  const map: Record<string, typeof Palette> = {
    design: Palette,
    development: Code,
    seo: Search,
    ads: Megaphone,
    strategy: Target,
    branding: Star,
    video: Video,
  }
  const Icon = map[category] ?? Briefcase
  return <Icon size={14} />
}

const categoryLabel = (category: string) => {
  const map: Record<string, string> = {
    design: 'Diseño',
    development: 'Desarrollo',
    seo: 'SEO',
    ads: 'Publicidad',
    strategy: 'Estrategia',
    branding: 'Branding',
    video: 'Video',
  }
  return map[category] ?? category
}

const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    designer: 'Diseñador',
    developer: 'Desarrollador',
    strategist: 'Estratega',
    seo: 'SEO',
    ads: 'Publicidad',
  }
  return map[role] ?? role
}

const tierBadge = (tier: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    basic: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Básico' },
    pro: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Pro' },
    dedicated: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Dedicado' },
  }
  const s = map[tier] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: tier }
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

const SeniorManagement = () => {
  const [activeTab, setActiveTab] = useState<SeniorTab>('tasks')

  const tabs: { id: SeniorTab; label: string; icon: typeof Users }[] = [
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'tasks', label: 'Tareas', icon: ListTodo },
    { id: 'subscriptions', label: 'Suscripciones', icon: CreditCard },
    { id: 'stats', label: 'Métricas', icon: BarChart3 },
  ]

  return (
    <div className="max-w-6xl space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-surface border border-edge rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-ink-faint hover:text-ink hover:bg-subtle'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'team' && <TeamSection />}
      {activeTab === 'tasks' && <TasksSection />}
      {activeTab === 'subscriptions' && <SubscriptionsSection />}
      {activeTab === 'stats' && <StatsSection />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: Team
// ═══════════════════════════════════════════════════════════════

const TeamSection = () => {
  const [team, setTeam] = useState<SeniorMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'designer', capacity: '3' })
  const [saving, setSaving] = useState(false)

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/senior/admin/team', { headers: getAuthHeaders() })
      if (res.ok) setTeam(await res.json())
    } catch (err) {
      console.error('[Senior] Team error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const handleAddMember = async () => {
    if (!formData.name || !formData.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/senior/admin/team', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          capacity: parseInt(formData.capacity) || 3,
        }),
      })
      if (res.ok) {
        setFormData({ name: '', email: '', role: 'designer', capacity: '3' })
        setShowForm(false)
        fetchTeam()
      }
    } catch (err) {
      console.error('[Senior] Add member error:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (member: SeniorMember) => {
    const nextStatus = member.status === 'available' ? 'busy' : member.status === 'busy' ? 'offline' : 'available'
    try {
      await fetch(`/api/senior/admin/team/${member.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      })
      fetchTeam()
    } catch (err) {
      console.error('[Senior] Toggle status error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Equipo Senior ({team.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Cancelar' : 'Agregar Senior'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-surface border border-edge rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@example.com"
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Rol</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              >
                <option value="designer">Diseñador</option>
                <option value="developer">Desarrollador</option>
                <option value="strategist">Estratega</option>
                <option value="seo">SEO</option>
                <option value="ads">Publicidad</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Capacidad</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                min={1}
                max={10}
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              />
            </div>
          </div>
          <button
            onClick={handleAddMember}
            disabled={saving || !formData.name || !formData.email}
            className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando...' : 'Agregar miembro'}
          </button>
        </div>
      )}

      {/* Team table */}
      {team.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="mx-auto text-ink-faint/20 mb-3" />
          <p className="text-sm text-ink-faint">No hay miembros senior registrados</p>
        </div>
      ) : (
        <div className="bg-surface border border-edge rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-subtle">
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Nombre</th>
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Rol</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">Status</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">Carga</th>
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Tareas activas</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member.id} className="border-t border-edge hover:bg-subtle/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{member.name}</p>
                    <p className="text-ink-faint">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-ink-light font-medium">{roleLabel(member.role)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleStatus(member)} className="inline-block cursor-pointer hover:opacity-80 transition-opacity">
                      {memberStatusBadge(member.status)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 bg-subtle h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            member.currentLoad >= member.capacity ? 'bg-red-500' :
                            member.currentLoad >= member.capacity * 0.7 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min((member.currentLoad / member.capacity) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-ink font-bold text-[10px]">{member.currentLoad}/{member.capacity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.tasks.length > 0 ? (
                      <div className="space-y-1">
                        {member.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-1.5">
                            <CircleDot size={8} className="text-blue-500 flex-shrink-0" />
                            <span className="text-ink-light truncate max-w-[200px]">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-ink-faint">Sin tareas</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: Tasks
// ═══════════════════════════════════════════════════════════════

const TasksSection = () => {
  const [tasks, setTasks] = useState<SeniorTask[]>([])
  const [team, setTeam] = useState<SeniorMember[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, { seniorId?: string; status?: string; deliveryNotes?: string; deliveryUrl?: string }>>({})
  const [savingTask, setSavingTask] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const url = statusFilter ? `/api/senior/admin/tasks?status=${statusFilter}` : '/api/senior/admin/tasks'
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.ok) setTasks(await res.json())
    } catch (err) {
      console.error('[Senior] Tasks error:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/senior/admin/team', { headers: getAuthHeaders() })
      if (res.ok) setTeam(await res.json())
    } catch (err) {
      console.error('[Senior] Team error:', err)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchTeam() }, [fetchTeam])

  const handleUpdateTask = async (taskId: string) => {
    const data = editData[taskId]
    if (!data) return
    setSavingTask(taskId)
    try {
      const res = await fetch(`/api/senior/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditData(prev => { const copy = { ...prev }; delete copy[taskId]; return copy })
        fetchTasks()
        fetchTeam()
      }
    } catch (err) {
      console.error('[Senior] Update task error:', err)
    } finally {
      setSavingTask(null)
    }
  }

  const updateEditField = (taskId: string, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], [field]: value },
    }))
  }

  const statusFilters = [
    { id: '', label: 'Todas' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'in_progress', label: 'En progreso' },
    { id: 'review', label: 'En revisión' },
    { id: 'delivered', label: 'Entregadas' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {statusFilters.map(f => (
          <button
            key={f.id}
            onClick={() => { setStatusFilter(f.id); setLoading(true) }}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              statusFilter === f.id
                ? 'text-primary bg-primary/10'
                : 'text-ink-faint bg-subtle hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="text-center py-16">
          <ListTodo size={40} className="mx-auto text-ink-faint/20 mb-3" />
          <p className="text-sm text-ink-faint">No hay tareas {statusFilter ? 'con este filtro' : 'registradas'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const isExpanded = expandedTask === task.id
            const sla = formatSlaCountdown(task.slaDeadline)
            const isOverdue = sla?.overdue && !['delivered', 'cancelled'].includes(task.status)
            const currentEdit = editData[task.id] ?? {}

            return (
              <div
                key={task.id}
                className={`bg-surface border rounded-xl transition-all ${
                  isOverdue ? 'border-red-500/40' : 'border-edge hover:border-primary/30'
                }`}
              >
                {/* Card header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-ink-faint">{categoryIcon(task.category)}</span>
                        <p className="text-sm font-bold text-ink">{task.title}</p>
                        {statusBadge(task.status)}
                        {priorityBadge(task.priority)}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-ink-faint">
                        <span>
                          <span className="font-semibold text-ink-light">{task.requestedBy.name}</span>
                          {' '}({task.requestedBy.email})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimeAgo(task.requestedAt)}
                        </span>
                        {task.senior ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <UserCheck size={10} />
                            {task.senior.name}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-semibold">Sin asignar</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sla && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          SLA: {sla.text}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-ink-faint" /> : <ChevronDown size={16} className="text-ink-faint" />}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-edge pt-4 space-y-4">
                    {/* Description */}
                    <div>
                      <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Descripción</label>
                      <p className="text-sm text-ink-light bg-subtle rounded-lg p-3 whitespace-pre-wrap">{task.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Assign senior */}
                      <div>
                        <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Asignar Senior</label>
                        <select
                          value={currentEdit.seniorId ?? task.seniorId ?? ''}
                          onChange={e => updateEditField(task.id, 'seniorId', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                        >
                          <option value="">Sin asignar</option>
                          {team
                            .filter(m => m.status !== 'offline')
                            .map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({roleLabel(m.role)}) — {m.currentLoad}/{m.capacity}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Change status */}
                      <div>
                        <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Cambiar estado</label>
                        <select
                          value={currentEdit.status ?? task.status}
                          onChange={e => updateEditField(task.id, 'status', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="in_progress">En progreso</option>
                          <option value="review">En revisión</option>
                          <option value="delivered">Entregada</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      </div>

                      {/* Delivery notes */}
                      <div>
                        <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Notas de entrega</label>
                        <textarea
                          value={currentEdit.deliveryNotes ?? task.deliveryNotes ?? ''}
                          onChange={e => updateEditField(task.id, 'deliveryNotes', e.target.value)}
                          placeholder="Notas sobre la entrega..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink resize-none"
                        />
                      </div>

                      {/* Delivery URL */}
                      <div>
                        <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">URL de entrega</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={currentEdit.deliveryUrl ?? task.deliveryUrl ?? ''}
                            onChange={e => updateEditField(task.id, 'deliveryUrl', e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                          />
                          {task.deliveryUrl && (
                            <a
                              href={task.deliveryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-2 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Save button */}
                    {Object.keys(currentEdit).length > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleUpdateTask(task.id)}
                          disabled={savingTask === task.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          <Send size={14} />
                          {savingTask === task.id ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    )}

                    {/* Timeline info */}
                    <div className="flex gap-4 text-[10px] text-ink-faint pt-2 border-t border-edge">
                      <span>Solicitada: {new Date(task.requestedAt).toLocaleString('es-CO')}</span>
                      {task.startedAt && <span>Iniciada: {new Date(task.startedAt).toLocaleString('es-CO')}</span>}
                      {task.deliveredAt && <span>Entregada: {new Date(task.deliveredAt).toLocaleString('es-CO')}</span>}
                      {task.slaDeadline && <span>SLA: {new Date(task.slaDeadline).toLocaleString('es-CO')}</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: Subscriptions
// ═══════════════════════════════════════════════════════════════

const SubscriptionsSection = () => {
  const [subscriptions, setSubscriptions] = useState<SeniorSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ userId: '', tier: 'basic', organizationId: '' })
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/senior/admin/subscriptions', { headers: getAuthHeaders() })
      if (res.ok) setSubscriptions(await res.json())
    } catch (err) {
      console.error('[Senior] Subscriptions error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/billing', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users.map((u: { id: string; name: string; email: string }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })))
      }
    } catch (err) {
      console.error('[Senior] Users error:', err)
    }
  }, [])

  useEffect(() => { fetchSubscriptions() }, [fetchSubscriptions])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreateSubscription = async () => {
    if (!formData.userId || !formData.tier) return
    setSaving(true)
    try {
      const res = await fetch('/api/senior/admin/subscriptions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: formData.userId,
          tier: formData.tier,
          organizationId: formData.organizationId || undefined,
        }),
      })
      if (res.ok) {
        setFormData({ userId: '', tier: 'basic', organizationId: '' })
        setShowForm(false)
        fetchSubscriptions()
      }
    } catch (err) {
      console.error('[Senior] Create subscription error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Suscripciones Senior ({subscriptions.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Cancelar' : 'Nueva Suscripción'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-surface border border-edge rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Usuario</label>
              <select
                value={formData.userId}
                onChange={e => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              >
                <option value="">Seleccionar usuario...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={e => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              >
                <option value="basic">Básico ($499/mes)</option>
                <option value="pro">Pro ($999/mes)</option>
                <option value="dedicated">Dedicado ($1999/mes)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateSubscription}
            disabled={saving || !formData.userId}
            className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Creando...' : 'Crear suscripción'}
          </button>
        </div>
      )}

      {/* Table */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard size={40} className="mx-auto text-ink-faint/20 mb-3" />
          <p className="text-sm text-ink-faint">No hay suscripciones senior</p>
        </div>
      ) : (
        <div className="bg-surface border border-edge rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-subtle">
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Usuario</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">Tier</th>
                <th className="text-right px-4 py-2.5 font-bold text-ink-faint uppercase">Precio</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">Estado</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">Tareas activas</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">Máx. simultáneas</th>
                <th className="text-center px-4 py-2.5 font-bold text-ink-faint uppercase">SLA</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => (
                <tr key={sub.id} className="border-t border-edge hover:bg-subtle/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{sub.user.name}</p>
                    <p className="text-ink-faint">{sub.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tierBadge(sub.tier)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-ink">
                    ${sub.price}/mes
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                      sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                      sub.status === 'paused' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {sub.status === 'active' ? 'Activa' : sub.status === 'paused' ? 'Pausada' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-ink">
                    {sub.activeTasks}
                  </td>
                  <td className="px-4 py-3 text-center text-ink-light">
                    {sub.maxConcurrent}
                  </td>
                  <td className="px-4 py-3 text-center text-ink-light">
                    {sub.slaHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 4: Stats
// ═══════════════════════════════════════════════════════════════

const StatsSection = () => {
  const [stats, setStats] = useState<SeniorStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/senior/admin/stats', { headers: getAuthHeaders() })
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error('[Senior] Stats error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return <p className="text-sm text-ink-faint text-center py-10">No se pudieron cargar las métricas</p>
  }

  const maxCategoryCount = Math.max(...stats.tasksByCategory.map(c => c.count), 1)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ListTodo size={16} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink">{stats.activeTasks}</p>
          <p className="text-[10px] font-bold text-ink-faint uppercase">Tareas activas</p>
        </div>

        <div className="bg-surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock size={16} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink">{stats.avgDeliveryHours}h</p>
          <p className="text-[10px] font-bold text-ink-faint uppercase">Tiempo promedio entrega</p>
        </div>

        <div className="bg-surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink">{stats.slaCompliance}%</p>
          <p className="text-[10px] font-bold text-ink-faint uppercase">Cumplimiento SLA</p>
        </div>

        <div className="bg-surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CreditCard size={16} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink">${stats.monthlyRevenue.toLocaleString('es-CO')}</p>
          <p className="text-[10px] font-bold text-ink-faint uppercase">Ingresos mensuales senior</p>
        </div>
      </div>

      {/* Tasks by category */}
      {stats.tasksByCategory.length > 0 && (
        <div className="bg-surface border border-edge rounded-xl p-4">
          <h3 className="text-sm font-bold text-ink mb-4">Tareas por categoría</h3>
          <div className="space-y-3">
            {stats.tasksByCategory.sort((a, b) => b.count - a.count).map(cat => {
              const pct = (cat.count / maxCategoryCount) * 100
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32">
                    <span className="text-ink-faint">{categoryIcon(cat.category)}</span>
                    <span className="text-[11px] font-semibold text-ink">{categoryLabel(cat.category)}</span>
                  </div>
                  <div className="flex-1 bg-subtle h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-ink w-8 text-right">{cat.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks by status */}
      {stats.tasksByStatus.length > 0 && (
        <div className="bg-surface border border-edge rounded-xl p-4">
          <h3 className="text-sm font-bold text-ink mb-4">Tareas por estado</h3>
          <div className="flex flex-wrap gap-3">
            {stats.tasksByStatus.map(s => (
              <div key={s.status} className="flex items-center gap-2 bg-subtle rounded-lg px-3 py-2">
                {statusBadge(s.status)}
                <span className="text-sm font-bold text-ink">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="bg-surface border border-edge rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-ink-faint uppercase">Total entregadas</p>
            <p className="text-lg font-bold text-ink">{stats.totalDelivered}</p>
          </div>
          <CheckCircle size={24} className="text-emerald-500/30" />
        </div>
      </div>
    </div>
  )
}

export default SeniorManagement
