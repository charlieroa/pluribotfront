import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, ShieldAlert, CheckCircle, CreditCard, AlertCircle, Key, Trash2, Plus, Eye, EyeOff } from 'lucide-react'

// ─── Provider Health ───

interface ProviderHealth {
  provider: 'anthropic' | 'openai' | 'google'
  status: 'active' | 'no_key' | 'invalid_key' | 'no_credits' | 'error'
  label: string
  message: string
  checkedAt: string
}

const providerStatusConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  active: { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  no_key: { color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
  invalid_key: { color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  no_credits: { color: 'text-amber-600', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  error: { color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  no_key: 'Sin API Key',
  invalid_key: 'Key invalida',
  no_credits: 'Sin creditos',
  error: 'Error',
}

// ─── API Keys ───

interface ApiKeyData {
  id: string
  provider: string
  key: string
  isActive: boolean
}

const ApisSection = () => {
  const [providers, setProviders] = useState<ProviderHealth[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // New key form
  const [showAddKey, setShowAddKey] = useState(false)
  const [newProvider, setNewProvider] = useState('anthropic')
  const [newKey, setNewKey] = useState('')
  const [addingKey, setAddingKey] = useState(false)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchProviders = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/admin/provider-status/refresh' : '/api/admin/provider-status'
      const method = forceRefresh ? 'POST' : 'GET'
      const res = await fetch(url, { method, headers: getAuthHeaders() })
      console.log('[Admin] Provider status response:', res.status)
      if (res.ok) {
        const data = await res.json()
        setProviders(Array.isArray(data) ? data : [])
      } else {
        console.warn('[Admin] Provider status failed:', res.status, res.statusText)
      }
    } catch (err) {
      console.error('[Admin] Provider status error:', err)
    } finally {
      setLoadingProviders(false)
      setRefreshing(false)
    }
  }, [])

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-keys', { headers: getAuthHeaders() })
      console.log('[Admin] API keys response:', res.status)
      if (res.ok) {
        const data = await res.json()
        setApiKeys(Array.isArray(data) ? data : [])
      } else {
        console.warn('[Admin] API keys failed:', res.status, res.statusText)
      }
    } catch (err) {
      console.error('[Admin] API keys error:', err)
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
    fetchApiKeys()
  }, [fetchProviders, fetchApiKeys])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchProviders(true)
  }

  const handleAddKey = async () => {
    if (!newKey.trim()) return
    setAddingKey(true)
    try {
      await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ provider: newProvider, key: newKey.trim() }),
      })
      setNewKey('')
      setShowAddKey(false)
      fetchApiKeys()
      // Refresh provider status after adding key
      setTimeout(() => fetchProviders(true), 1000)
    } catch (err) {
      console.error('[Admin] Add key error:', err)
    } finally {
      setAddingKey(false)
    }
  }

  const handleToggleKey = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !isActive }),
      })
      fetchApiKeys()
    } catch (err) {
      console.error('[Admin] Toggle key error:', err)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Eliminar esta API key?')) return
    try {
      await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      fetchApiKeys()
    } catch (err) {
      console.error('[Admin] Delete key error:', err)
    }
  }

  const activeCount = providers.filter(p => p.status === 'active').length
  const problemCount = providers.filter(p => p.status !== 'active').length

  return (
    <div className="max-w-5xl space-y-6">
      {/* ─── Provider Status ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Wifi size={18} className="text-primary" />
              Estado de APIs
            </h2>
            <p className="text-xs text-ink-faint">
              {activeCount} de {providers.length} proveedores activos
              {problemCount > 0 && (
                <span className="text-red-500 font-semibold ml-2">
                  — {problemCount} con problemas
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Verificar
          </button>
        </div>

        {problemCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                Proveedores con problemas detectados
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                Los modelos de proveedores inactivos se ocultan automaticamente del selector en el chat.
              </p>
            </div>
          </div>
        )}

        {loadingProviders ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map(p => {
              const cfg = providerStatusConfig[p.status] ?? providerStatusConfig.error
              const StatusIcon = p.status === 'active' ? CheckCircle : p.status === 'no_credits' ? CreditCard : p.status === 'no_key' ? WifiOff : AlertCircle
              return (
                <div key={p.provider} className={`relative overflow-hidden bg-surface border rounded-xl p-4 ${cfg.borderColor}`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    p.status === 'active' ? 'bg-emerald-500' :
                    p.status === 'no_credits' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />

                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-ink">{p.label}</h4>
                    <div className={`w-8 h-8 rounded-lg ${cfg.bgColor} flex items-center justify-center`}>
                      <StatusIcon size={16} className={cfg.color} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.bgColor} ${cfg.color}`}>
                      {statusLabels[p.status]}
                    </span>
                  </div>

                  <p className="text-[11px] text-ink-faint">{p.message}</p>

                  {p.checkedAt && (
                    <p className="text-[9px] text-ink-faint mt-2">
                      Verificado: {new Date(p.checkedAt).toLocaleTimeString('es-CO')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── API Keys Management ─── */}
      <div className="border-t border-edge pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Key size={18} className="text-primary" />
              API Keys
            </h2>
            <p className="text-xs text-ink-faint">Gestionar las claves de acceso a proveedores de IA</p>
          </div>
          <button
            onClick={() => setShowAddKey(!showAddKey)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-primary rounded-lg hover:opacity-90 transition-all"
          >
            <Plus size={12} /> Agregar Key
          </button>
        </div>

        {/* Add key form */}
        {showAddKey && (
          <div className="bg-surface border border-edge rounded-xl p-4 mb-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">Proveedor</label>
                <select
                  value={newProvider}
                  onChange={e => setNewProvider(e.target.value)}
                  className="px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">API Key</label>
                <input
                  type="password"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-sm bg-page border border-edge rounded-lg focus:outline-none focus:border-primary text-ink font-mono"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddKey}
                  disabled={addingKey || !newKey.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {addingKey ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingKeys ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-10 bg-surface border border-edge rounded-xl">
            <Key size={32} className="mx-auto text-ink-faint/20 mb-2" />
            <p className="text-sm text-ink-faint">No hay API keys configuradas</p>
          </div>
        ) : (
          <div className="bg-surface border border-edge rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-subtle">
                  <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Proveedor</th>
                  <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Key</th>
                  <th className="text-left px-4 py-2.5 font-bold text-ink-faint uppercase">Estado</th>
                  <th className="text-right px-4 py-2.5 font-bold text-ink-faint uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(k => (
                  <tr key={k.id} className="border-t border-edge hover:bg-subtle/50">
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-ink capitalize">{k.provider}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-ink-faint">{k.key}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        k.isActive
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {k.isActive ? 'Activa' : 'Desactivada'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleToggleKey(k.id, k.isActive)}
                          className="p-1.5 text-ink-faint hover:text-primary hover:bg-primary/10 rounded transition-all"
                          title={k.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {k.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-1.5 text-ink-faint hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApisSection
