import { useState, useEffect, useCallback } from 'react'
import { Users, Gift, Zap, Search, Trash2, ChevronDown } from 'lucide-react'

interface UserData {
  id: string
  email: string
  name: string
  role: string
  planId: string
  creditBalance: number
  organizationId: string | null
  organization: { name: string } | null
  createdAt: string
}

const ROLES = ['user', 'agent', 'org_admin', 'superadmin'] as const
const PLANS = ['starter', 'pro', 'agency', 'enterprise'] as const

const roleBadge: Record<string, { bg: string; text: string }> = {
  user: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  agent: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
  org_admin: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
  superadmin: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
}

const planBadge: Record<string, { bg: string; text: string }> = {
  starter: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  pro: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
  agency: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
  enterprise: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300' },
}

const UsersSection = () => {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [grantModal, setGrantModal] = useState<{ userId: string; userName: string } | null>(null)
  const [grantAmount, setGrantAmount] = useState('')
  const [grantReason, setGrantReason] = useState('')
  const [granting, setGranting] = useState(false)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchUsers = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() })
      console.log('[Admin] Users response:', res.status)
      if (!res.ok) {
        setError(`Error ${res.status}: ${res.statusText}`)
        return
      }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[Admin] Users error:', err)
      setError('Error de conexion al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleGrant = async () => {
    if (!grantModal || !grantAmount) return
    setGranting(true)
    try {
      await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: grantModal.userId, amount: parseInt(grantAmount), reason: grantReason || 'Creditos admin' }),
      })
      setGrantModal(null)
      setGrantAmount('')
      setGrantReason('')
      fetchUsers()
    } catch (err) {
      console.error('[Admin] Grant error:', err)
    } finally {
      setGranting(false)
    }
  }

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      })
      fetchUsers()
    } catch (err) {
      console.error('[Admin] Change role error:', err)
    }
  }

  const handleChangePlan = async (userId: string, planId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId }),
      })
      fetchUsers()
    } catch (err) {
      console.error('[Admin] Change plan error:', err)
    }
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Eliminar usuario "${name}"? Esta accion no se puede deshacer.`)) return
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      fetchUsers()
    } catch (err) {
      console.error('[Admin] Delete user error:', err)
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-CO')

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

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
        <Users size={48} className="mx-auto text-red-500/30 mb-4" />
        <p className="text-sm text-red-500 font-semibold">{error}</p>
        <button onClick={fetchUsers} className="mt-3 text-xs font-bold text-primary hover:underline">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Usuarios ({users.length})
          </h2>
          <p className="text-xs text-ink-faint">Gestionar usuarios, roles, planes y creditos</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 pr-3 py-2 text-xs bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-subtle">
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Usuario</th>
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Rol</th>
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Plan</th>
                <th className="text-right px-4 py-2.5 font-bold text-ink-faint uppercase">Creditos</th>
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Organizacion</th>
                <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Registro</th>
                <th className="text-right px-4 py-2.5 font-bold text-ink-faint uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const rBadge = roleBadge[u.role] ?? roleBadge.user
                const pBadge = planBadge[u.planId] ?? planBadge.starter
                return (
                  <tr key={u.id} className="border-t border-edge hover:bg-subtle/50">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-ink">{u.name}</p>
                      <p className="text-ink-faint">{u.email}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="relative inline-block">
                        <select
                          value={u.role}
                          onChange={e => handleChangeRole(u.id, e.target.value)}
                          className={`appearance-none pr-5 pl-2 py-0.5 rounded text-[9px] font-bold cursor-pointer border-0 ${rBadge.bg} ${rBadge.text}`}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="relative inline-block">
                        <select
                          value={u.planId}
                          onChange={e => handleChangePlan(u.id, e.target.value)}
                          className={`appearance-none pr-5 pl-2 py-0.5 rounded text-[9px] font-bold cursor-pointer border-0 ${pBadge.bg} ${pBadge.text}`}
                        >
                          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-bold ${u.creditBalance <= 0 ? 'text-red-500' : 'text-ink'}`}>
                        {fmt(u.creditBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-light">
                      {u.organization?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-faint">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setGrantModal({ userId: u.id, userName: u.name })}
                          className="px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded transition-all flex items-center gap-1"
                        >
                          <Gift size={10} /> Creditos
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant modal */}
      {grantModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setGrantModal(null)}>
          <div className="bg-surface rounded-2xl border border-edge shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-ink mb-1">Dar creditos</h3>
            <p className="text-xs text-ink-faint mb-4">Para: {grantModal.userName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Cantidad</label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={e => setGrantAmount(e.target.value)}
                  placeholder="100"
                  min={1}
                  className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Razon (opcional)</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={e => setGrantReason(e.target.value)}
                  placeholder="Compensacion, bonus, etc."
                  className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleGrant}
                  disabled={granting || !grantAmount}
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={14} />
                  {granting ? 'Otorgando...' : 'Otorgar'}
                </button>
                <button
                  onClick={() => setGrantModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-ink-light bg-subtle rounded-lg hover:bg-surface-alt transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersSection
