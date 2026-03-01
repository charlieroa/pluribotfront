import { useState, useEffect, useRef } from 'react'
import { History, ChevronDown, RotateCcw, Check, GitCompareArrows } from 'lucide-react'

interface VersionMeta {
  id: string
  version: number
  title: string
  agent: string
  createdAt: string
}

interface VersionSelectorProps {
  deliverableId: string
  currentVersion?: number
  versionCount?: number
  conversationId: string
  onSelectVersion: (deliverable: any) => void
  onCompare?: (oldVersion: { version: number; content: string }) => void
}

const API_BASE = '/api'

const VersionSelector = ({
  deliverableId,
  currentVersion = 1,
  versionCount = 1,
  conversationId,
  onSelectVersion,
  onCompare,
}: VersionSelectorProps) => {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const fetchVersions = async () => {
    if (versions.length > 0) return
    setLoading(true)
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch(
        `${API_BASE}/conversations/${conversationId}/deliverables/${deliverableId}/versions`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (res.ok) {
        setVersions(await res.json())
      }
    } catch (err) {
      console.error('Error fetching versions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) fetchVersions()
  }

  const handleSelectVersion = async (versionId: string) => {
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch(
        `${API_BASE}/conversations/${conversationId}/deliverables/${versionId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (res.ok) {
        const data = await res.json()
        onSelectVersion(data)
        setOpen(false)
      }
    } catch (err) {
      console.error('Error fetching version:', err)
    }
  }

  const handleCompare = async (e: React.MouseEvent, versionId: string, version: number) => {
    e.stopPropagation()
    if (!onCompare) return
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch(
        `${API_BASE}/conversations/${conversationId}/deliverables/${versionId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (res.ok) {
        const data = await res.json()
        onCompare({ version, content: data.content })
        setOpen(false)
      }
    } catch (err) {
      console.error('Error fetching version for compare:', err)
    }
  }

  const handleRestore = async (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation()
    setRestoring(versionId)
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch(
        `${API_BASE}/conversations/${conversationId}/deliverables/${versionId}/restore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        onSelectVersion(data)
        setOpen(false)
        setVersions([]) // Force re-fetch next time
      }
    } catch (err) {
      console.error('Error restoring version:', err)
    } finally {
      setRestoring(null)
    }
  }

  if (versionCount <= 1) return null

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
      >
        <History size={12} />
        v{currentVersion}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-edge rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-edge">
            <p className="text-[11px] font-semibold text-ink">Historial de versiones</p>
            <p className="text-[10px] text-ink-faint">{versionCount} versiones</p>
          </div>

          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="px-3 py-4 text-center text-[11px] text-ink-faint">Cargando...</div>
            ) : (
              versions.map((v) => {
                const isCurrent = v.id === deliverableId
                return (
                  <div
                    key={v.id}
                    onClick={() => !isCurrent && handleSelectVersion(v.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-[11px] border-b border-edge/50 last:border-0 transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-subtle cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ink">v{v.version}</span>
                        {isCurrent && <Check size={10} className="text-blue-500" />}
                      </div>
                      <p className="text-[10px] text-ink-faint truncate">
                        {v.agent} &middot; {v.createdAt ? formatDate(v.createdAt) : ''}
                      </p>
                    </div>
                    {!isCurrent && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {onCompare && (
                          <button
                            onClick={(e) => handleCompare(e, v.id, v.version)}
                            className="p-1 text-ink-faint hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Comparar con version actual"
                          >
                            <GitCompareArrows size={12} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleRestore(e, v.id)}
                          disabled={restoring === v.id}
                          className="p-1 text-ink-faint hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
                          title="Restaurar esta version"
                        >
                          <RotateCcw size={12} className={restoring === v.id ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VersionSelector
