import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { X, Copy, Download, FileText, Code, Palette, MessageSquare, Monitor, Code2, Maximize2, Minimize2, Film, AlertTriangle, Save, Pencil, Boxes } from 'lucide-react'
import type { Deliverable } from '../../types'
import type { SelectedElement } from './VisualEditToolbar'
import UnsplashModal from './UnsplashModal'
import CodeWorkspace from './CodeWorkspace'

interface WorkspacePanelProps {
  deliverable: Deliverable
  onClose: () => void
  editMode?: boolean
  onEditModeChange?: (enabled: boolean) => void
  onElementSelected?: (el: SelectedElement | null) => void
  onSwitchToEditTab?: () => void
  onAutoFix?: (errorMessage: string) => void
  isFixing?: boolean
  conversationId?: string
}

const typeConfig: Record<Deliverable['type'], { icon: ReactNode; label: string; color: string }> = {
  report: { icon: <FileText size={18} />, label: 'Reporte', color: 'text-indigo-500 bg-indigo-500/10' },
  code: { icon: <Code size={18} />, label: 'Codigo', color: 'text-emerald-500 bg-emerald-500/10' },
  design: { icon: <Palette size={18} />, label: 'Diseno', color: 'text-purple-500 bg-purple-500/10' },
  copy: { icon: <MessageSquare size={18} />, label: 'Copy', color: 'text-amber-500 bg-amber-500/10' },
  video: { icon: <Film size={18} />, label: 'Video', color: 'text-rose-500 bg-rose-500/10' },
  project: { icon: <Boxes size={18} />, label: 'Proyecto', color: 'text-cyan-500 bg-cyan-500/10' },
}

const isHtmlContent = (content: string): boolean => {
  const t = content.trimStart().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<!') || t.includes('<body')
}

const WorkspacePanel = ({ deliverable, onClose, editMode = false, onEditModeChange, onElementSelected, onSwitchToEditTab, onAutoFix, isFixing, conversationId }: WorkspacePanelProps) => {
  // Route to CodeWorkspace for project deliverables with artifact
  if (deliverable.type === 'project' && deliverable.artifact) {
    return (
      <CodeWorkspace
        artifact={deliverable.artifact}
        htmlContent={deliverable.content}
        onClose={onClose}
        onAutoFix={onAutoFix}
        isFixing={isFixing}
        deliverableId={deliverable.id}
        conversationId={conversationId}
      />
    )
  }

  const config = typeConfig[deliverable.type]
  const canPreview = isHtmlContent(deliverable.content)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>(canPreview ? 'preview' : 'code')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [iframeError, setIframeError] = useState<{ error: string; line: number } | null>(null)
  const [modifiedContent, setModifiedContent] = useState<string | null>(null)
  const [unsplashOpen, setUnsplashOpen] = useState(false)
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
      if (event.data?.type === 'content-updated') {
        setModifiedContent(event.data.html)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onElementSelected, onSwitchToEditTab])

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

    window.addEventListener('open-unsplash-modal', handleOpenUnsplash)
    window.addEventListener('apply-style-to-iframe', handleApplyStyle)
    window.addEventListener('replace-image-in-iframe', handleReplaceImage)
    return () => {
      window.removeEventListener('open-unsplash-modal', handleOpenUnsplash)
      window.removeEventListener('apply-style-to-iframe', handleApplyStyle)
      window.removeEventListener('replace-image-in-iframe', handleReplaceImage)
    }
  }, [])

  // Turn off edit mode when switching views or deliverable changes
  useEffect(() => {
    if (editMode) onEditModeChange?.(false)
    setModifiedContent(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverable.id, viewMode])

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
          sandbox="allow-scripts allow-same-origin"
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
        </div>
        <div className="flex items-center gap-2">
          {canPreview && (
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
              </div>
              {viewMode === 'preview' && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-1.5 text-ink-faint hover:text-ink transition-colors rounded-lg hover:bg-subtle"
                  title="Pantalla completa"
                >
                  <Maximize2 size={16} />
                </button>
              )}
            </>
          )}
          <button onClick={onClose} className="p-2 text-ink-faint hover:text-ink transition-colors rounded-lg hover:bg-subtle flex-shrink-0">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {canPreview && viewMode === 'preview' ? (
        <div className="flex-1 overflow-hidden bg-white relative">
          <iframe
            ref={iframeRef}
            srcDoc={currentContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title={deliverable.title}
          />
          {iframeError && (
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
          <pre className="text-[12px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
            {currentContent}
          </pre>
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
        </div>
        <p className="text-[10px] text-ink-faint">Generado por {deliverable.agent}</p>
      </div>

      {/* Unsplash Modal */}
      <UnsplashModal
        isOpen={unsplashOpen}
        onClose={() => setUnsplashOpen(false)}
        onSelect={handleUnsplashSelect}
      />
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
