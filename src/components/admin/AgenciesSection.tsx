import { useState, useEffect, useCallback } from 'react'
import { Building2, Trash2, Pencil, X, Check } from 'lucide-react'

interface OrgData {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  createdAt: string
  memberCount: number
}

const AgenciesSection = () => {
  const [orgs, setOrgs] = useState<OrgData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchOrgs = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/organizations', { headers: getAuthHeaders() })
      console.log('[Admin] Organizations response:', res.status)
      if (!res.ok) {
        setError(`Error ${res.status}: ${res.statusText}`)
        return
      }
      const data = await res.json()
      setOrgs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[Admin] Organizations error:', err)
      setError('Error de conexion al cargar organizaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const startEditing = (org: OrgData) => {
    setEditingId(org.id)
    setEditName(org.name)
    setEditColor(org.primaryColor ?? '#6366f1')
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      await fetch(`/api/admin/organizations/${editingId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: editName, primaryColor: editColor }),
      })
      setEditingId(null)
      fetchOrgs()
    } catch (err) {
      console.error('[Admin] Edit org error:', err)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar organizacion "${name}"? Los miembros seran desvinculados.`)) return
    try {
      await fetch(`/api/admin/organizations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      fetchOrgs()
    } catch (err) {
      console.error('[Admin] Delete org error:', err)
    }
  }

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
        <Building2 size={48} className="mx-auto text-red-500/30 mb-4" />
        <p className="text-sm text-red-500 font-semibold">{error}</p>
        <button onClick={fetchOrgs} className="mt-3 text-xs font-bold text-primary hover:underline">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <Building2 size={18} className="text-primary" />
          Agencias / Organizaciones ({orgs.length})
        </h2>
        <p className="text-xs text-ink-faint">Gestionar organizaciones y sus miembros</p>
      </div>

      {orgs.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={48} className="mx-auto text-ink-faint/20 mb-4" />
          <p className="text-sm text-ink-faint">No hay organizaciones registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgs.map(org => (
            <div key={org.id} className="bg-surface border border-edge rounded-xl p-4 relative overflow-hidden">
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: org.primaryColor ?? '#6366f1' }}
              />

              {editingId === org.id ? (
                /* Edit mode */
                <div className="space-y-3 pt-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-ink-faint">Color:</label>
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-edge"
                    />
                    <span className="text-[10px] font-mono text-ink-faint">{editColor}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-primary rounded-lg hover:opacity-90"
                    >
                      <Check size={12} /> Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-ink-faint bg-subtle rounded-lg hover:bg-surface-alt"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: org.primaryColor ?? '#6366f1' }}
                      >
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{org.name}</p>
                        <p className="text-[10px] text-ink-faint">{org.memberCount} miembros</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(org)}
                        className="p-1.5 text-ink-faint hover:text-primary hover:bg-primary/10 rounded transition-all"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        className="p-1.5 text-ink-faint hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full border border-edge" style={{ backgroundColor: org.primaryColor ?? '#6366f1' }} />
                      <span className="font-mono">{org.primaryColor ?? '#6366f1'}</span>
                    </div>
                    <span>Creada: {new Date(org.createdAt).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AgenciesSection
