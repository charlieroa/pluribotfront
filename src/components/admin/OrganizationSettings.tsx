import { useState, useEffect, useCallback } from 'react'
import { Users, Trash2, Plus, Building2, Image, Pencil } from 'lucide-react'

interface OrgMember {
  id: string
  name: string
  email: string
  role: string
  specialty?: string | null
  specialtyColor?: string | null
  createdAt: string
}

interface Organization {
  id: string
  name: string
  logoUrl: string | null
  createdAt: string
}

const OrganizationSettings = () => {
  const [_org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [orgName, setOrgName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [inviteSpecialty, setInviteSpecialty] = useState('')
  const [inviteSpecialtyColor, setInviteSpecialtyColor] = useState('#8b5cf6')
  const [inviteSpecialtyKeywords, setInviteSpecialtyKeywords] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editSpecialtyColor, setEditSpecialtyColor] = useState('#8b5cf6')
  const [editSpecialtyKeywords, setEditSpecialtyKeywords] = useState('')

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch('/api/organization', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        if (data.organization) {
          setOrg(data.organization)
          setOrgName(data.organization.name)
          setLogoUrl(data.organization.logoUrl || '')
        }
      }
    } catch (err) {
      console.error('[Org] Fetch error:', err)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/organization/members', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
      }
    } catch (err) {
      console.error('[Org] Members error:', err)
    }
  }, [])

  useEffect(() => { fetchOrg(); fetchMembers() }, [fetchOrg, fetchMembers])

  const handleSaveOrg = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: orgName, logoUrl: logoUrl || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrg(data.organization)
      }
    } catch (err) {
      console.error('[Org] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return
    try {
      const res = await fetch('/api/organization/members', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
          ...(inviteSpecialty.trim() ? { specialty: inviteSpecialty.trim() } : {}),
          ...(inviteSpecialty.trim() ? { specialtyColor: inviteSpecialtyColor } : {}),
          ...(inviteSpecialtyKeywords.trim() ? { specialtyKeywords: inviteSpecialtyKeywords.trim() } : {}),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.tempPassword) setTempPassword(data.tempPassword)
        setInviteEmail('')
        setInviteName('')
        setInviteSpecialty('')
        setInviteSpecialtyColor('#8b5cf6')
        setInviteSpecialtyKeywords('')
        setShowInviteForm(false)
        fetchMembers()
        fetchOrg()
      }
    } catch (err) {
      console.error('[Org] Invite error:', err)
    }
  }

  const handleStartEdit = (member: OrgMember) => {
    setEditingMemberId(member.id)
    setEditSpecialty(member.specialty || '')
    setEditSpecialtyColor(member.specialtyColor || '#8b5cf6')
    setEditSpecialtyKeywords('')
  }

  const handleSaveEdit = async (memberId: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          specialty: editSpecialty.trim() || '',
          specialtyColor: editSpecialty.trim() ? editSpecialtyColor : '',
          specialtyKeywords: editSpecialtyKeywords.trim() || '',
        }),
      })
      if (res.ok) {
        setEditingMemberId(null)
        fetchMembers()
      }
    } catch (err) {
      console.error('[Org] Edit member error:', err)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) fetchMembers()
    } catch (err) {
      console.error('[Org] Remove error:', err)
    }
  }

  const roleLabels: Record<string, string> = {
    superadmin: 'Super Admin',
    org_admin: 'Admin Org',
    agent: 'Agente',
    user: 'Usuario',
  }

  const roleColors: Record<string, string> = {
    superadmin: 'bg-red-500/10 text-red-600',
    org_admin: 'bg-violet-500/10 text-violet-600',
    agent: 'bg-blue-500/10 text-blue-600',
    user: 'bg-slate-500/10 text-slate-600',
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Organization Branding */}
      <div className="bg-surface border border-edge rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-primary" />
          <h3 className="text-sm font-bold text-ink">Organización (White-Label)</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-faint mb-1">Nombre de la organización</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Mi Agencia"
              className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-faint mb-1">
              <Image size={12} className="inline mr-1" />
              URL del logo
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
            />
            {logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img src={logoUrl} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover border border-edge" />
                <span className="text-[11px] text-ink-faint">Vista previa del logo</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveOrg}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-surface border border-edge rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-ink">Equipo</h3>
            <span className="text-[10px] font-bold bg-subtle text-ink-faint px-1.5 py-0.5 rounded-full">{members.length}</span>
          </div>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all"
          >
            <Plus size={12} />
            Invitar
          </button>
        </div>

        {/* Temp password notification */}
        {tempPassword && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">Contraseña temporal del nuevo miembro:</p>
            <code className="text-sm font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded">{tempPassword}</code>
            <button
              onClick={() => setTempPassword(null)}
              className="ml-3 text-[10px] text-amber-600 hover:text-amber-800 font-semibold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Invite form */}
        {showInviteForm && (
          <div className="mb-4 p-4 bg-page border border-edge rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-ink-faint mb-1">Nombre</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 text-sm bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink-faint mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                  className="w-full px-3 py-2 text-sm bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-ink-faint mb-1">Rol</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
              >
                <option value="agent">Agente</option>
                <option value="org_admin">Admin de Organización</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-ink-faint mb-1">Especialidad (opcional)</label>
                <input
                  type="text"
                  value={inviteSpecialty}
                  onChange={(e) => setInviteSpecialty(e.target.value)}
                  placeholder="Desarrollador, Ilustrador..."
                  className="w-full px-3 py-2 text-sm bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink-faint mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={inviteSpecialtyColor}
                    onChange={(e) => setInviteSpecialtyColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-edge cursor-pointer"
                  />
                  <span className="text-[11px] text-ink-faint font-mono">{inviteSpecialtyColor}</span>
                </div>
              </div>
            </div>
            {inviteSpecialty.trim() && (
              <div>
                <label className="block text-[10px] font-semibold text-ink-faint mb-1">Palabras clave para auto-asignación</label>
                <input
                  type="text"
                  value={inviteSpecialtyKeywords}
                  onChange={(e) => setInviteSpecialtyKeywords(e.target.value)}
                  placeholder="desarrollo, código, programar, bug"
                  className="w-full px-3 py-2 text-sm bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                />
                <p className="text-[9px] text-ink-faint mt-0.5">Separadas por coma. Se usan para asignar automáticamente este especialista.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleInvite}
                className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:opacity-90 transition-all"
              >
                Invitar miembro
              </button>
              <button
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Members list */}
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users size={32} className="mx-auto text-ink-faint/20 mb-3" />
            <p className="text-xs text-ink-faint">No hay miembros en el equipo</p>
            <p className="text-[10px] text-ink-faint mt-1">Invita a tu primer agente para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id} className="p-3 bg-page border border-edge rounded-lg group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={member.specialty ? 'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white' : 'w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold'}
                      style={member.specialty ? { backgroundColor: member.specialtyColor || '#8b5cf6' } : {}}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{member.name}</p>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${roleColors[member.role] || roleColors.user}`}>
                          {roleLabels[member.role] || member.role}
                        </span>
                        {member.specialty && (
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white"
                            style={{ backgroundColor: member.specialtyColor || '#8b5cf6' }}
                          >
                            {member.specialty}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-faint">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editingMemberId === member.id ? setEditingMemberId(null) : handleStartEdit(member)}
                      className="p-1.5 text-ink-faint/0 group-hover:text-ink-faint hover:!text-primary rounded transition-all"
                      title="Editar especialidad"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-ink-faint/0 group-hover:text-ink-faint hover:!text-red-500 rounded transition-all"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Edit specialty inline form */}
                {editingMemberId === member.id && (
                  <div className="mt-3 pt-3 border-t border-edge space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold text-ink-faint mb-0.5">Especialidad</label>
                        <input
                          type="text"
                          value={editSpecialty}
                          onChange={(e) => setEditSpecialty(e.target.value)}
                          placeholder="Desarrollador, Ilustrador..."
                          className="w-full px-2 py-1.5 text-xs bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-ink-faint mb-0.5">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editSpecialtyColor}
                            onChange={(e) => setEditSpecialtyColor(e.target.value)}
                            className="w-8 h-8 rounded border border-edge cursor-pointer"
                          />
                          <span className="text-[10px] text-ink-faint font-mono">{editSpecialtyColor}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-ink-faint mb-0.5">Palabras clave</label>
                      <input
                        type="text"
                        value={editSpecialtyKeywords}
                        onChange={(e) => setEditSpecialtyKeywords(e.target.value)}
                        placeholder="desarrollo, código, programar"
                        className="w-full px-2 py-1.5 text-xs bg-surface border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(member.id)}
                        className="px-3 py-1.5 text-[10px] font-bold text-white bg-primary rounded-lg hover:opacity-90 transition-all"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="px-3 py-1.5 text-[10px] font-semibold text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizationSettings
