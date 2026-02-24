import { useState, useEffect } from 'react'
import { X, Database, Loader2, Check, AlertTriangle, Unplug } from 'lucide-react'

interface SupabaseConnectModalProps {
  conversationId: string
  onClose: () => void
  onConnectionChange?: (connected: boolean) => void
}

const URL_KEY = 'pluribots_supabase_url'
const KEY_KEY = 'pluribots_supabase_key'

export default function SupabaseConnectModal({ conversationId, onClose, onConnectionChange }: SupabaseConnectModalProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'connected' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const savedUrl = localStorage.getItem(URL_KEY)
    const savedKey = localStorage.getItem(KEY_KEY)
    if (savedUrl) setSupabaseUrl(savedUrl)
    if (savedKey) setAnonKey(savedKey)

    // Fetch current config
    fetch(`/api/conversations/${conversationId}/supabase`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.connected) {
          setStatus('connected')
          if (data.supabaseUrl) setSupabaseUrl(data.supabaseUrl)
          if (data.supabaseAnonKey) setAnonKey(data.supabaseAnonKey)
        }
      })
      .catch(() => {})
  }, [conversationId])

  const handleConnect = async () => {
    setStatus('saving')
    setErrorMsg(null)

    localStorage.setItem(URL_KEY, supabaseUrl)
    localStorage.setItem(KEY_KEY, anonKey)

    try {
      const res = await fetch(`/api/conversations/${conversationId}/supabase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: anonKey.trim() }),
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('connected')
        onConnectionChange?.(true)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Error desconocido')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error de red')
    }
  }

  const handleDisconnect = async () => {
    setStatus('saving')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/conversations/${conversationId}/supabase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: '', supabaseAnonKey: '' }),
      })

      if (res.ok) {
        setStatus('idle')
        onConnectionChange?.(false)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Error al desconectar')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1e2e] border border-slate-700/50 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Database size={18} className={status === 'connected' ? 'text-emerald-400' : 'text-white'} />
            <h3 className="text-sm font-semibold text-white">Conectar Supabase</h3>
            {status === 'connected' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <Check size={10} /> Conectado
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Supabase Project URL</label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
              placeholder="https://abc123.supabase.co"
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Anon Key</label>
            <input
              type="password"
              value={anonKey}
              onChange={e => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-600 mt-1">Settings &rarr; API en tu dashboard de Supabase</p>
          </div>

          {/* Status feedback */}
          {status === 'connected' && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Check size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] text-emerald-300">Supabase conectado. Logic usara tus credenciales reales.</p>
            </div>
          )}
          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-[11px] text-red-300">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between px-5 py-3 border-t border-slate-700/50">
          <div>
            {status === 'connected' && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
              >
                <Unplug size={12} /> Desconectar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
            >
              Cerrar
            </button>
            {status !== 'connected' && (
              <button
                onClick={handleConnect}
                disabled={!supabaseUrl || !anonKey || status === 'saving'}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                {status === 'saving' ? 'Conectando...' : 'Conectar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
