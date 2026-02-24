import { useState, useEffect, useCallback } from 'react'
import { Bot } from 'lucide-react'
import { agents } from '../../data/agents'
import BotAvatar3D from '../avatars/BotAvatar3D'

interface BotConfig {
  botId: string
  name: string
  role: string
  isActive: boolean
}

const BotsSection = () => {
  const [bots, setBots] = useState<BotConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pluribots_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchBots = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/bots', { headers: getAuthHeaders() })
      console.log('[Admin] Bots response:', res.status)
      if (!res.ok) {
        setError(`Error ${res.status}: ${res.statusText}`)
        return
      }
      const data = await res.json()
      setBots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[Admin] Bots error:', err)
      setError('Error de conexion al cargar bots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBots() }, [fetchBots])

  const handleToggle = async (botId: string, isActive: boolean) => {
    setToggling(botId)
    try {
      await fetch(`/api/admin/bots/${botId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !isActive }),
      })
      fetchBots()
    } catch (err) {
      console.error('[Admin] Toggle bot error:', err)
    } finally {
      setToggling(null)
    }
  }

  const activeCount = bots.filter(b => b.isActive).length

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
        <Bot size={48} className="mx-auto text-red-500/30 mb-4" />
        <p className="text-sm text-red-500 font-semibold">{error}</p>
        <button onClick={fetchBots} className="mt-3 text-xs font-bold text-primary hover:underline">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <Bot size={18} className="text-primary" />
          Bots Globales ({activeCount}/{bots.length} activos)
        </h2>
        <p className="text-xs text-ink-faint">Activar o desactivar bots globalmente para toda la plataforma</p>
      </div>

      {bots.length === 0 ? (
        <div className="text-center py-20">
          <Bot size={48} className="mx-auto text-ink-faint/20 mb-4" />
          <p className="text-sm text-ink-faint">No se encontraron bots configurados</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots.map(bot => {
          const agentMeta = agents.find(a => a.id === bot.botId)
          const color = agentMeta?.color ?? '#6b7280'
          const isTogglingThis = toggling === bot.botId

          return (
            <div
              key={bot.botId}
              className={`relative overflow-hidden bg-surface border rounded-xl p-4 transition-all ${
                bot.isActive ? 'border-edge' : 'border-red-500/30 opacity-60'
              }`}
            >
              {/* Status bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-colors"
                style={{ backgroundColor: bot.isActive ? color : '#ef4444' }}
              />

              <div className="flex items-center justify-between mb-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <BotAvatar3D seed={bot.name} color={color} isActive={bot.isActive} size="md" />
                  <div>
                    <p className="text-sm font-bold text-ink">{bot.name}</p>
                    <p className="text-[10px] text-ink-faint">{bot.role}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  bot.isActive
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-red-500/10 text-red-600'
                }`}>
                  {bot.isActive ? 'Activo' : 'Desactivado'}
                </span>

                {/* Toggle switch */}
                <button
                  onClick={() => handleToggle(bot.botId, bot.isActive)}
                  disabled={isTogglingThis}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    bot.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${isTogglingThis ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    bot.isActive ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {bots.some(b => !b.isActive) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Los bots desactivados no procesaran solicitudes de ningun usuario. Los pasos que dependan de un bot desactivado se omitiran con un mensaje de advertencia.
          </p>
        </div>
      )}
    </div>
  )
}

export default BotsSection
