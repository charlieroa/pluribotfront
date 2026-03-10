import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, Component, type ReactNode } from 'react'
import { X, Copy, Download, FileText, Code, Palette, MessageSquare, Monitor, Code2, Maximize2, Minimize2, Film, AlertTriangle, Save, Pencil, Smartphone, Tablet, Globe, ExternalLink, Columns2, Github } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import 'highlight.js/styles/github-dark.css'
import type { Deliverable } from '../../types'
import type { SelectedElement } from './VisualEditToolbar'
import UnsplashModal from './UnsplashModal'
import VersionSelector from './VersionSelector'
import DiffModal from './DiffModal'
import PublishModal from './PublishModal'
import GitHubPushModal from './GitHubPushModal'

hljs.registerLanguage('xml', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('css', css)

const SyntaxHighlightedCode = ({ content }: { content: string }) => {
  const highlighted = useMemo(() => {
    try {
      const result = hljs.highlight(content, { language: 'xml' })
      return result.value
    } catch {
      return content
    }
  }, [content])

  return (
    <pre className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  )
}

export interface SelectedLogo {
  index: number
  src: string
  style: string
}

interface WorkspacePanelProps {
  deliverable: Deliverable
  onClose: () => void
  editMode?: boolean
  onEditModeChange?: (enabled: boolean) => void
  onElementSelected?: (el: SelectedElement | null) => void
  onSwitchToEditTab?: () => void
  conversationId?: string
  onSelectVersion?: (d: Deliverable) => void
  onLogoSelected?: (logo: SelectedLogo | null) => void
  selectedImageUrl?: string | null
  isGenerating?: boolean
  generatingAgent?: string | null
}

const typeConfig: Record<Deliverable['type'], { icon: ReactNode; label: string; color: string }> = {
  report: { icon: <FileText size={18} />, label: 'Reporte', color: 'text-[#a78bfa] bg-[#a78bfa]/10' },
  code: { icon: <Code size={18} />, label: 'Codigo', color: 'text-emerald-500 bg-emerald-500/10' },
  design: { icon: <Palette size={18} />, label: 'Diseno', color: 'text-[#a78bfa] bg-[#a78bfa]/10' },
  copy: { icon: <MessageSquare size={18} />, label: 'Copy', color: 'text-amber-500 bg-amber-500/10' },
  video: { icon: <Film size={18} />, label: 'Video', color: 'text-rose-500 bg-rose-500/10' },
}

const isHtmlContent = (content: string): boolean => {
  const t = content.trimStart().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<!') || t.includes('<body')
}

/** Extract generated image URLs from HTML content (flyers, banners, etc.) */
const extractGeneratedImages = (content: string): string[] => {
  // Match /uploads/ paths with optional CDN prefix (e.g. https://plury.co/uploads/img-xxx.png)
  const regex = /<img[^>]+src=["']([^"']*\/uploads\/[^"']+\.(?:png|jpg|jpeg|webp))["']/gi
  const urls: string[] = []
  let m
  while ((m = regex.exec(content)) !== null) urls.push(m[1])
  return urls
}

/** True when the deliverable is essentially a wrapper around generated images (flyer, banner, social post) — not an editable HTML page */
const isImageDeliverable = (d: Deliverable): boolean => {
  if (d.type !== 'design') return false
  const images = extractGeneratedImages(d.content)
  if (images.length === 0) return false
  // If the title hints at a page/web/landing, it's editable HTML, not an image deliverable
  const t = d.title.toLowerCase()
  if (t.includes('landing') || t.includes('pagina') || t.includes('página') || t.includes('web') || t.includes('sitio') || t.includes('app')) return false
  return true
}

// ─── Image with skeleton for canvas ───
function CanvasImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative">
      {!loaded && (
        <div className="w-[400px] max-w-full aspect-[4/3] bg-white/[0.04] rounded-lg animate-pulse flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/10">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="w-24 h-2 rounded bg-white/[0.06]" />
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

const isMultiFileProject = (content: string): boolean => {
  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.path && parsed[0]?.content
  } catch {
    return false
  }
}

const LazyProjectWorkspace = lazy(() => import('./ProjectWorkspace'))

class ProjectWorkspaceErrorBoundary extends Component<{ children: ReactNode; onFallback: () => void }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode; onFallback: () => void }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error) {
    console.error('[ProjectWorkspace] Error boundary caught:', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] p-8">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Error al cargar el proyecto</h3>
            <p className="text-white/50 text-sm mb-4">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const WorkspacePanel = ({ deliverable, onClose, editMode = false, onEditModeChange, onElementSelected, onSwitchToEditTab, conversationId, onSelectVersion, onLogoSelected, selectedImageUrl, isGenerating = false, generatingAgent }: WorkspacePanelProps) => {
  const config = typeConfig[deliverable.type]
  const canPreview = isHtmlContent(deliverable.content)
  const isDevAgent = deliverable.botType === 'dev'

  // Multi-file project detection (dev v2)
  if (isMultiFileProject(deliverable.content)) {
    return (
      <ProjectWorkspaceErrorBoundary onFallback={() => {}}>
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0f]"><div className="text-white/40 text-sm">Cargando proyecto...</div></div>}>
          <LazyProjectWorkspace deliverable={deliverable} onClose={onClose} conversationId={conversationId} onSelectVersion={onSelectVersion} />
        </Suspense>
      </ProjectWorkspaceErrorBoundary>
    )
  }
  const isImageOnly = isImageDeliverable(deliverable)
  // Show only the clicked image, or fall back to first one
  const allImageUrls = isImageOnly ? extractGeneratedImages(deliverable.content) : []
  const imageUrls = selectedImageUrl ? [selectedImageUrl] : (allImageUrls.length > 0 ? [allImageUrls[0]] : [])
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>(canPreview ? 'preview' : 'code')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [iframeError, setIframeError] = useState<{ error: string; line: number } | null>(null)
  const [modifiedContent, setModifiedContent] = useState<string | null>(null)
  const [unsplashOpen, setUnsplashOpen] = useState(false)
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [compareVersion, setCompareVersion] = useState<{ version: number; content: string } | null>(null)
  const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'deployed'>('idle')
  const [deployUrl, setDeployUrl] = useState<string | null>(null)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [githubModalOpen, setGithubModalOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const currentContent = modifiedContent ?? deliverable.content

  // Sync edit mode to iframe
  const syncEditMode = useCallback((enabled: boolean) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'toggle-edit-mode', enabled }, '*')
    }
  }, [])

  // When editMode prop changes, sync to iframe
  useEffect(() => {
    syncEditMode(editMode)
    if (!editMode) {
      onElementSelected?.(null)
    }
  }, [editMode, syncEditMode, onElementSelected])

  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'iframe-error') {
        setIframeError({ error: event.data.error, line: event.data.line })
      }
      if (event.data?.type === 'element-selected') {
        const el: SelectedElement = {
          tag: event.data.tag,
          text: event.data.text,
          isImage: event.data.isImage,
          imageSrc: event.data.imageSrc,
          rect: event.data.rect,
          classes: event.data.classes,
        }
        onElementSelected?.(el)
        onSwitchToEditTab?.()
      }
      if (event.data?.type === 'element-deselected') {
        onElementSelected?.(null)
      }
      if (event.data?.type === 'content-updated') {
        setModifiedContent(event.data.html)
      }
      if (event.data?.type === 'logo-selected') {
        onLogoSelected?.({
          index: event.data.logoIndex,
          src: event.data.logoSrc,
          style: event.data.logoStyle,
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onElementSelected, onSwitchToEditTab, onLogoSelected])

  // Listen for custom events from EditPanel
  useEffect(() => {
    const handleOpenUnsplash = () => setUnsplashOpen(true)
    const handleApplyStyle = (e: Event) => {
      const styles = (e as CustomEvent).detail
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'apply-style', styles }, '*')
      }
    }
    const handleReplaceImage = (e: Event) => {
      const { url, alt } = (e as CustomEvent).detail
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'replace-image', url, alt }, '*')
      }
    }
    const handleEditorAction = (e: Event) => {
      const action = (e as CustomEvent).detail as string
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: action }, '*')
      }
    }

    window.addEventListener('open-unsplash-modal', handleOpenUnsplash)
    window.addEventListener('apply-style-to-iframe', handleApplyStyle)
    window.addEventListener('replace-image-in-iframe', handleReplaceImage)
    window.addEventListener('editor-action', handleEditorAction)
    return () => {
      window.removeEventListener('open-unsplash-modal', handleOpenUnsplash)
      window.removeEventListener('apply-style-to-iframe', handleApplyStyle)
      window.removeEventListener('replace-image-in-iframe', handleReplaceImage)
      window.removeEventListener('editor-action', handleEditorAction)
    }
  }, [])

  // Turn off edit mode when switching views or deliverable changes
  useEffect(() => {
    if (editMode) onEditModeChange?.(false)
    setModifiedContent(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverable.id, viewMode])

  // Reset viewMode to preview when deliverable changes
  useEffect(() => {
    setViewMode(canPreview ? 'preview' : 'code')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverable.id])

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent)
  }

  const handleExport = () => {
    const blob = new Blob([currentContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deliverable.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveChanges = () => {
    if (modifiedContent) {
      deliverable.content = modifiedContent
      setModifiedContent(null)
    }
  }

  const handlePublished = (url: string, _slug: string) => {
    setDeployUrl(url)
    setDeployState('deployed')
  }

  const handleUnsplashSelect = (url: string, alt: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'replace-image', url, alt }, '*')
    }
    onElementSelected?.(null)
  }

  const hasChanges = modifiedContent !== null && modifiedContent !== deliverable.content

  if (isFullscreen && canPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="h-10 px-4 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
          <span className="text-xs font-medium">{deliverable.title}</span>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <Minimize2 size={16} />
          </button>
        </div>
        <iframe
          srcDoc={currentContent}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={deliverable.title}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-surface border-l border-edge min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-edge flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${config.color}`}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-ink text-sm truncate">{deliverable.title}</h3>
            <p className="text-[10px] text-ink-faint">{deliverable.agent} &middot; {config.label}</p>
          </div>
          {conversationId && onSelectVersion && (
            <VersionSelector
              deliverableId={deliverable.id}
              currentVersion={deliverable.version}
              versionCount={deliverable.versionCount}
              conversationId={conversationId}
              onSelectVersion={onSelectVersion}
              onCompare={setCompareVersion}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {canPreview && !isImageOnly && (
            <>
              <div className="flex bg-subtle rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    viewMode === 'preview' && !editMode
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  <Monitor size={12} /> Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    viewMode === 'code'
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  <Code2 size={12} /> Codigo
                </button>
                {isDevAgent && (
                  <button
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      viewMode === 'split'
                        ? 'bg-surface text-ink shadow-sm'
                        : 'text-ink-faint hover:text-ink'
                    }`}
                  >
                    <Columns2 size={12} /> Split
                  </button>
                )}
                {!isDevAgent && (
                  <button
                    onClick={() => {
                      setViewMode('preview')
                      onEditModeChange?.(!editMode)
                      if (!editMode) onSwitchToEditTab?.()
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      editMode
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-ink-faint hover:text-ink'
                    }`}
                  >
                    <Pencil size={12} /> Editar
                  </button>
                )}
              </div>
              {viewMode === 'preview' && (
                <>
                  <div className="flex bg-subtle rounded-lg p-0.5">
                    <button
                      onClick={() => setViewport('mobile')}
                      className={`p-1.5 rounded-md transition-all ${viewport === 'mobile' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                      title="Mobile (375px)"
                    >
                      <Smartphone size={14} />
                    </button>
                    <button
                      onClick={() => setViewport('tablet')}
                      className={`p-1.5 rounded-md transition-all ${viewport === 'tablet' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                      title="Tablet (768px)"
                    >
                      <Tablet size={14} />
                    </button>
                    <button
                      onClick={() => setViewport('desktop')}
                      className={`p-1.5 rounded-md transition-all ${viewport === 'desktop' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                      title="Desktop (100%)"
                    >
                      <Monitor size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-1.5 text-ink-faint hover:text-ink transition-colors rounded-lg hover:bg-subtle"
                    title="Pantalla completa"
                  >
                    <Maximize2 size={16} />
                  </button>
                </>
              )}
            </>
          )}
          <button onClick={onClose} className="p-2 text-ink-faint hover:text-ink transition-colors rounded-lg hover:bg-subtle flex-shrink-0">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isImageOnly ? (
        <div className="flex-1 overflow-auto custom-scrollbar bg-[#0a0a1a] flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 max-w-full">
            {imageUrls.map((url, i) => (
              <CanvasImage
                key={i}
                src={url}
                alt={`${deliverable.title} ${imageUrls.length > 1 ? i + 1 : ''}`}
              />
            ))}
          </div>
        </div>
      ) : canPreview && viewMode === 'split' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Preview half */}
          <div className="w-1/2 overflow-hidden relative bg-white border-r border-edge">
            <iframe
              ref={iframeRef}
              srcDoc={currentContent}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title={deliverable.title}
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                <div className="bg-surface rounded-2xl shadow-2xl px-5 py-4 flex flex-col items-center gap-2 border border-edge">
                  <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold text-ink">Generando...</p>
                </div>
              </div>
            )}
            {iframeError && !isGenerating && (
              <button
                onClick={() => setIframeError(null)}
                className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500 text-white text-[11px] font-medium rounded-lg shadow-lg hover:bg-red-600 transition-colors z-10"
                title={`JS Error (line ${iframeError.line}): ${iframeError.error}`}
              >
                <AlertTriangle size={12} />
                Error linea {iframeError.line}
              </button>
            )}
          </div>
          {/* Code half */}
          <div className="w-1/2 overflow-auto custom-scrollbar bg-slate-950 p-4">
            <SyntaxHighlightedCode content={currentContent} />
          </div>
        </div>
      ) : canPreview && viewMode === 'preview' ? (
        <div className={`flex-1 overflow-hidden relative ${viewport !== 'desktop' ? 'bg-slate-100 flex justify-center' : 'bg-white'}`}>
          <iframe
            ref={iframeRef}
            srcDoc={currentContent}
            className={`h-full border-0 transition-all duration-300 ${
              viewport === 'mobile' ? 'w-[375px] shadow-xl rounded-lg border border-slate-200 my-2 bg-white' :
              viewport === 'tablet' ? 'w-[768px] shadow-xl rounded-lg border border-slate-200 my-2 bg-white' :
              'w-full'
            }`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={deliverable.title}
          />
          {/* Generating overlay — keeps previous preview visible underneath */}
          {isGenerating && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20 transition-opacity duration-300">
              <div className="bg-surface rounded-2xl shadow-2xl px-6 py-5 flex flex-col items-center gap-3 border border-edge">
                <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-semibold text-ink">{generatingAgent || 'Code'} esta generando...</p>
                <p className="text-xs text-ink-faint">El preview se actualizara automaticamente</p>
              </div>
            </div>
          )}
          {iframeError && !isGenerating && (
            <button
              onClick={() => setIframeError(null)}
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500 text-white text-[11px] font-medium rounded-lg shadow-lg hover:bg-red-600 transition-colors z-10"
              title={`JS Error (line ${iframeError.line}): ${iframeError.error}`}
            >
              <AlertTriangle size={12} />
              Error linea {iframeError.line}
            </button>
          )}
        </div>
      ) : canPreview && viewMode === 'code' ? (
        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950 p-4">
          <SyntaxHighlightedCode content={currentContent} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-2xl">
            {renderContent(deliverable.content)}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-edge flex items-center justify-between flex-shrink-0">
        <div className="flex gap-2">
          {isImageOnly ? (
            /* Image-only footer: download images */
            <>
              {imageUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all"
                >
                  <Download size={14} /> Descargar{imageUrls.length > 1 ? ` ${i + 1}` : ''}
                </a>
              ))}
            </>
          ) : (
            /* Normal footer */
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all"
              >
                <Copy size={14} /> Copiar
              </button>
              {canPreview && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all"
                >
                  <Download size={14} /> Exportar HTML
                </button>
              )}
              {hasChanges && (
                <button
                  onClick={handleSaveChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-all"
                >
                  <Save size={14} /> Guardar cambios
                </button>
              )}
              {canPreview && (
                <>
                  {deployState === 'deployed' && deployUrl && (
                    <a
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#a78bfa] hover:bg-[#8b5cf6] rounded-lg transition-all"
                    >
                      <ExternalLink size={14} /> Ver sitio
                    </a>
                  )}
                  <button
                    onClick={() => setPublishModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#a78bfa] hover:bg-[#8b5cf6] rounded-lg transition-all"
                  >
                    <Globe size={14} />
                    {deployState === 'deployed' ? 'Actualizar' : 'Publicar'}
                  </button>
                  {isDevAgent && (
                    <button
                      onClick={() => setGithubModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-ink bg-subtle rounded-lg transition-all"
                    >
                      <Github size={14} /> GitHub
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <p className="text-[10px] text-ink-faint">Generado por {deliverable.agent}</p>
      </div>

      {/* Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        deliverable={deliverable}
        onPublished={handlePublished}
      />

      {/* GitHub Push Modal */}
      <GitHubPushModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        deliverable={deliverable}
      />

      {/* Unsplash Modal */}
      <UnsplashModal
        isOpen={unsplashOpen}
        onClose={() => setUnsplashOpen(false)}
        onSelect={handleUnsplashSelect}
      />

      {/* Diff Modal */}
      {compareVersion && (
        <DiffModal
          open={true}
          onClose={() => setCompareVersion(null)}
          oldVersion={compareVersion.version}
          newVersion={deliverable.version ?? 1}
          oldContent={compareVersion.content}
          newContent={currentContent}
          type={deliverable.type}
        />
      )}
    </div>
  )
}

const renderContent = (content: string): ReactNode[] => {
  return content.split('\n').map((line, i) => {
    const t = line.trimStart()

    if (t.startsWith('## '))
      return <h2 key={i} className="text-lg font-bold text-ink mt-6 mb-2">{t.slice(3)}</h2>

    if (t.startsWith('### '))
      return <h3 key={i} className="text-sm font-bold text-ink mt-5 mb-1.5">{t.slice(4)}</h3>

    if (t.startsWith('- [x] '))
      return (
        <p key={i} className="flex items-center gap-2 text-sm text-ink-light py-0.5 pl-2">
          <span className="w-4 h-4 bg-emerald-500/20 text-emerald-500 rounded flex items-center justify-center text-[10px] flex-shrink-0">&#x2713;</span>
          {t.slice(6)}
        </p>
      )

    if (t.startsWith('- [ ] '))
      return (
        <p key={i} className="flex items-center gap-2 text-sm text-ink-light py-0.5 pl-2">
          <span className="w-4 h-4 bg-subtle border border-edge rounded flex-shrink-0" />
          {t.slice(6)}
        </p>
      )

    if (t.startsWith('- '))
      return <p key={i} className="text-sm text-ink-light py-0.5 pl-4">{formatInline(t.slice(2))}</p>

    if (t.match(/^\d+\.\s/))
      return <p key={i} className="text-sm text-ink-light py-0.5 pl-4">{formatInline(t)}</p>

    if (t.startsWith('|'))
      return <p key={i} className="font-mono text-[11px] text-ink-faint py-0.5 px-3 bg-subtle/50 rounded">{t}</p>

    if (t.startsWith('```')) return null

    if (t === '') return <div key={i} className="h-3" />

    return <p key={i} className="text-sm text-ink-light leading-relaxed">{formatInline(t)}</p>
  })
}

const formatInline = (text: string): ReactNode[] => {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-ink font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default WorkspacePanel
