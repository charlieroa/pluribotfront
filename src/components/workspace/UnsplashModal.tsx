import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2 } from 'lucide-react'

interface UnsplashPhoto {
  id: string
  url: string
  urlFull: string
  thumb: string
  alt: string
  photographer: string
  photographerUrl: string
}

interface UnsplashModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string, alt: string, photographer: string) => void
}

const API_BASE = '/api'

const UnsplashModal = ({ isOpen, onClose, onSelect }: UnsplashModalProps) => {
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setPhotos([])
      setSearched(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setPhotos([])
      setSearched(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/unsplash/search?query=${encodeURIComponent(query)}&per_page=12`)
        if (res.ok) {
          const data = await res.json()
          setPhotos(data.photos || [])
        }
      } catch (err) {
        console.error('[UnsplashModal] Search error:', err)
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface border border-edge rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-ink">Buscar fotos en Unsplash</h3>
          <button onClick={onClose} className="p-1 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-edge flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fotos... (ej: modern office, coffee shop)"
              className="w-full pl-9 pr-3 py-2 text-sm bg-subtle border border-edge rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint animate-spin" />}
          </div>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    onSelect(photo.urlFull, photo.alt, photo.photographer)
                    onClose()
                  }}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-edge hover:border-primary transition-all hover:shadow-md"
                >
                  <img
                    src={photo.thumb}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                    <p className="text-white text-[10px] px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full">
                      {photo.photographer}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : searched && !loading ? (
            <div className="flex items-center justify-center h-40 text-ink-faint text-sm">
              No se encontraron fotos para "{query}"
            </div>
          ) : !searched ? (
            <div className="flex items-center justify-center h-40 text-ink-faint text-sm">
              Escribe para buscar fotos de stock
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-edge flex-shrink-0">
          <p className="text-[10px] text-ink-faint text-center">
            Fotos de <a href="https://unsplash.com/?utm_source=pluribots&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-light">Unsplash</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default UnsplashModal
