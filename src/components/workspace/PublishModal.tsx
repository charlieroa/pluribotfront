import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Globe, Check, AlertCircle, Copy, ExternalLink, Loader2 } from 'lucide-react'
import type { Deliverable } from '../../types'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  deliverable: Deliverable
  onPublished: (url: string, slug: string) => void
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
type PublishState = 'form' | 'publishing' | 'success'

const APP_DOMAIN = 'pluribots.com'

export default function PublishModal({ isOpen, onClose, deliverable, onPublished }: PublishModalProps) {
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugError, setSlugError] = useState<string | null>(null)
  const [publishState, setPublishState] = useState<PublishState>('form')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-suggest slug on open
  useEffect(() => {
    if (!isOpen) return

    // If already published, show the existing slug
    if (deliverable.publishSlug) {
      setSlug(deliverable.publishSlug)
      setSlugStatus('available')
      setSlugError(null)
      return
    }

    // Suggest slug from title
    const token = localStorage.getItem('pluribots_token')
    fetch('/api/deploy/suggest-slug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title: deliverable.title }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.slug) {
          setSlug(data.slug)
          setSlugStatus('available')
        }
      })
      .catch(() => { /* ignore */ })
  }, [isOpen, deliverable.title, deliverable.publishSlug])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setPublishState('form')
      setPublishedUrl(null)
      setCopied(false)
      setSlugStatus('idle')
      setSlugError(null)
    }
  }, [isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen && publishState === 'form') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, publishState])

  const checkSlug = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 3) {
      setSlugStatus(value.length === 0 ? 'idle' : 'invalid')
      setSlugError(value.length > 0 ? 'Mínimo 3 caracteres' : null)
      return
    }

    setSlugStatus('checking')
    setSlugError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/deploy/check-slug/${encodeURIComponent(value)}`)
        const data = await res.json()
        if (data.available) {
          setSlugStatus('available')
          setSlugError(null)
        } else {
          setSlugStatus(data.error ? 'invalid' : 'taken')
          setSlugError(data.error || 'Este nombre ya está en uso')
        }
      } catch {
        setSlugStatus('idle')
      }
    }, 300)
  }, [])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
    setSlug(value)

    // Skip check if this is a re-publish with same slug
    if (deliverable.publishSlug && value === deliverable.publishSlug) {
      setSlugStatus('available')
      setSlugError(null)
      return
    }

    checkSlug(value)
  }

  const handlePublish = async () => {
    if (slugStatus !== 'available' && !deliverable.publishSlug) return

    setPublishState('publishing')
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deliverableId: deliverable.id, slug }),
      })

      if (res.ok) {
        const data = await res.json()
        setPublishedUrl(data.url)
        setPublishState('success')
        onPublished(data.url, data.slug)
      } else {
        const err = await res.json().catch(() => ({}))
        setSlugError(err.error || 'Error al publicar')
        setPublishState('form')
      }
    } catch {
      setSlugError('Error de conexión')
      setPublishState('form')
    }
  }

  const handleCopy = async () => {
    if (!publishedUrl) return
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface border border-edge rounded-xl shadow-2xl w-[440px] animate-in fade-in zoom-in-95 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-ink">
              {deliverable.publishSlug ? 'Actualizar publicación' : 'Publicar sitio'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {publishState === 'success' ? (
            /* ─── Success state ─── */
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-ink mb-1">
                {deliverable.publishSlug ? '¡Sitio actualizado!' : '¡Sitio publicado!'}
              </p>
              <p className="text-xs text-ink-faint mb-4">Tu sitio ya está disponible en:</p>

              <div className="flex items-center gap-2 p-2.5 bg-subtle rounded-lg border border-edge mb-4">
                <Globe size={14} className="text-primary flex-shrink-0" />
                <span className="text-xs font-mono text-ink truncate flex-1">{publishedUrl}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 text-ink-faint hover:text-ink rounded transition-colors flex-shrink-0"
                  title="Copiar enlace"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="flex gap-2">
                <a
                  href={publishedUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-all"
                >
                  <ExternalLink size={14} /> Ver sitio
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-2 text-xs font-medium text-ink border border-edge rounded-lg hover:bg-subtle transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* ─── Form state ─── */
            <>
              <label className="block text-xs font-medium text-ink-faint mb-1.5">
                Nombre del sitio
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  maxLength={63}
                  placeholder="mi-sitio"
                  disabled={publishState === 'publishing'}
                  className="w-full px-3 py-2 text-sm bg-subtle border border-edge rounded-lg outline-none focus:border-primary text-ink placeholder:text-ink-faint/50 pr-8 font-mono"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && <Loader2 size={14} className="text-ink-faint animate-spin" />}
                  {slugStatus === 'available' && <Check size={14} className="text-emerald-500" />}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && <AlertCircle size={14} className="text-red-500" />}
                </div>
              </div>

              {/* URL preview */}
              {slug.length >= 3 && (
                <p className="mt-1.5 text-xs text-ink-faint font-mono truncate">
                  https://{slug}.{APP_DOMAIN}
                </p>
              )}

              {/* Error */}
              {slugError && (
                <p className="mt-1.5 text-xs text-red-500">{slugError}</p>
              )}

              {/* Publish button */}
              <button
                onClick={handlePublish}
                disabled={
                  publishState === 'publishing' ||
                  (slugStatus !== 'available' && !deliverable.publishSlug)
                }
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {publishState === 'publishing' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Globe size={14} />
                    {deliverable.publishSlug ? 'Actualizar' : 'Publicar'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
