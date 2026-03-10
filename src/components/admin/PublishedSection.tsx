import { useState, useEffect, useCallback } from 'react'
import { Globe, Trash2, Eye, EyeOff, ExternalLink, Search, RefreshCw } from 'lucide-react'

interface PublishedSite {
  id: string
  title: string
  type: string
  agent: string
  botType: string
  slug: string
  url: string
  publishedAt: string | null
  isPublic: boolean
  thumbnailUrl: string | null
  customDomain: string | null
  customDomainStatus: string | null
  createdAt: string
  user: { id: string; name: string; email: string } | null
}

const PublishedSection = () => {
  const [sites, setSites] = useState<PublishedSite[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('plury_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchSites = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/published', { headers: getAuthHeaders() })
      if (res.ok) setSites(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchSites() }, [fetchSites])

  const togglePublic = async (id: string, isPublic: boolean) => {
    try {
      const res = await fetch(`/api/admin/published/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPublic }),
      })
      if (res.ok) {
        setSites(prev => prev.map(s => s.id === id ? { ...s, isPublic } : s))
      }
    } catch {}
  }

  const unpublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/published/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        setSites(prev => prev.filter(s => s.id !== id))
        setConfirmDelete(null)
      }
    } catch {}
  }

  const filtered = sites.filter(s => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.user?.name?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Sitios Publicados</h2>
          <p className="text-xs text-ink-faint mt-0.5">{sites.length} sitios en total</p>
        </div>
        <button
          onClick={fetchSites}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-ink bg-subtle rounded-lg transition-colors"
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por titulo, slug o usuario..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface border border-edge rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-faint text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-faint text-sm">
          {query ? 'No se encontraron sitios' : 'No hay sitios publicados'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(site => (
            <div
              key={site.id}
              className="flex items-center gap-4 p-4 bg-surface border border-edge rounded-xl hover:border-primary/30 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-16 h-12 rounded-lg bg-subtle flex-shrink-0 overflow-hidden">
                {site.thumbnailUrl ? (
                  <img src={site.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Globe size={16} className="text-ink-faint" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink truncate">{site.title}</h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    site.isPublic
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : 'text-ink-faint bg-subtle'
                  }`}>
                    {site.isPublic ? 'Publico' : 'Privado'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    {site.slug}.plury.co <ExternalLink size={10} />
                  </a>
                  {site.customDomain && (
                    <span className="text-[11px] text-ink-faint">
                      {site.customDomain} ({site.customDomainStatus})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-ink-faint">
                    {site.user?.name || site.user?.email || 'Anonimo'}
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    {site.agent} &middot; {site.botType}
                  </span>
                  {site.publishedAt && (
                    <span className="text-[10px] text-ink-faint">
                      {new Date(site.publishedAt).toLocaleDateString('es')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => togglePublic(site.id, !site.isPublic)}
                  className={`p-2 rounded-lg transition-colors ${
                    site.isPublic
                      ? 'text-emerald-500 hover:bg-emerald-500/10'
                      : 'text-ink-faint hover:bg-subtle'
                  }`}
                  title={site.isPublic ? 'Hacer privado' : 'Hacer publico'}
                >
                  {site.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                {confirmDelete === site.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => unpublish(site.id)}
                      className="px-2 py-1 text-[10px] font-bold text-white bg-red-500 rounded-lg hover:bg-red-600"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-[10px] font-medium text-ink-faint bg-subtle rounded-lg hover:bg-edge"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(site.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Despublicar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PublishedSection
