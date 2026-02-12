import { useState, type ReactNode } from 'react'
import { X, Copy, Download, FileText, Code, Palette, MessageSquare, Monitor, Code2, Maximize2, Minimize2, Film } from 'lucide-react'
import type { Deliverable } from '../../types'

interface WorkspacePanelProps {
  deliverable: Deliverable
  onClose: () => void
}

const typeConfig: Record<Deliverable['type'], { icon: ReactNode; label: string; color: string }> = {
  report: { icon: <FileText size={18} />, label: 'Reporte', color: 'text-blue-500 bg-blue-500/10' },
  code: { icon: <Code size={18} />, label: 'Codigo', color: 'text-emerald-500 bg-emerald-500/10' },
  design: { icon: <Palette size={18} />, label: 'Diseno', color: 'text-purple-500 bg-purple-500/10' },
  copy: { icon: <MessageSquare size={18} />, label: 'Copy', color: 'text-amber-500 bg-amber-500/10' },
  video: { icon: <Film size={18} />, label: 'Video', color: 'text-rose-500 bg-rose-500/10' },
}

const isHtmlContent = (content: string): boolean => {
  const t = content.trimStart().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<!') || t.includes('<body')
}

const WorkspacePanel = ({ deliverable, onClose }: WorkspacePanelProps) => {
  const config = typeConfig[deliverable.type]
  const canPreview = isHtmlContent(deliverable.content)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>(canPreview ? 'preview' : 'code')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(deliverable.content)
  }

  const handleExport = () => {
    const blob = new Blob([deliverable.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deliverable.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          srcDoc={deliverable.content}
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
                    viewMode === 'preview'
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
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            srcDoc={deliverable.content}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title={deliverable.title}
          />
        </div>
      ) : canPreview && viewMode === 'code' ? (
        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950 p-4">
          <pre className="text-[12px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
            {deliverable.content}
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
      <div className="px-6 py-3 border-t border-edge flex items-center justify-between flex-shrink-0">
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
        </div>
        <p className="text-[10px] text-ink-faint">Generado por {deliverable.agent}</p>
      </div>
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
          <span className="w-4 h-4 bg-emerald-500/20 text-emerald-500 rounded flex items-center justify-center text-[10px] flex-shrink-0">✓</span>
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
