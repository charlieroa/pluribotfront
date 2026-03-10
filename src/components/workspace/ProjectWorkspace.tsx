import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { FolderTree, Eye, Code2, Download, Columns2, Globe, Github, Copy, X, ExternalLink, Smartphone, Tablet, Monitor, Search, FilePlus2 } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/github-dark.css'
import JSZip from 'jszip'
import WebContainerPreview, { type ProjectFile } from './WebContainerPreview'
import FileTree from './FileTree'
import PublishModal from './PublishModal'
import GitHubPushModal from './GitHubPushModal'
import VersionSelector from './VersionSelector'
import type { Deliverable } from '../../types'

hljs.registerLanguage('xml', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)

interface ProjectWorkspaceProps {
  deliverable: Deliverable
  onClose: () => void
  conversationId?: string
  onSelectVersion?: (d: Deliverable) => void
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript',
    css: 'css', html: 'xml', json: 'json', md: 'xml',
  }
  return map[ext || ''] || 'javascript'
}

function SyntaxHighlighter({ content, language }: { content: string; language: string }) {
  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(content, { language }).value
    } catch {
      return content
    }
  }, [content, language])

  return (
    <pre className="p-4 text-[12px] leading-relaxed font-mono whitespace-pre overflow-auto h-full">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  )
}

export default function ProjectWorkspace({ deliverable, onClose, conversationId, onSelectVersion }: ProjectWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [showFileTree, setShowFileTree] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [githubModalOpen, setGithubModalOpen] = useState(false)
  const [deployUrl, setDeployUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [modifiedFiles, setModifiedFiles] = useState<Record<string, string>>({})
  const [deletedFiles, setDeletedFiles] = useState<string[]>([])
  const [fileQuery, setFileQuery] = useState('')
  const [newFilePath, setNewFilePath] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const draftKey = `plury-workspace-draft:${deliverable.id}`

  // Parse the deliverable content as multi-file project
  const baseFiles: ProjectFile[] = useMemo(() => {
    try {
      const parsed = JSON.parse(deliverable.content)
      if (Array.isArray(parsed)) return parsed
      if (parsed.files && Array.isArray(parsed.files)) return parsed.files
    } catch {
      const result: ProjectFile[] = []
      const regex = /\/\/ --- FILE: (.+?) ---\n([\s\S]*?)(?=\/\/ --- FILE:|$)/g
      let match
      while ((match = regex.exec(deliverable.content)) !== null) {
        result.push({ path: match[1].trim(), content: match[2].trim() })
      }
      if (result.length > 0) return result
    }
    return []
  }, [deliverable.content])

  // Merge base files with modifications
  const files: ProjectFile[] = useMemo(() => {
    const base = baseFiles
      .filter(file => !deletedFiles.includes(file.path))
      .map(f => ({
        path: f.path,
        content: modifiedFiles[f.path] ?? f.content,
      }))

    const created = Object.entries(modifiedFiles)
      .filter(([path]) => !baseFiles.some(file => file.path === path) && !deletedFiles.includes(path))
      .map(([path, content]) => ({ path, content }))

    return [...base, ...created].sort((a, b) => a.path.localeCompare(b.path))
  }, [baseFiles, modifiedFiles, deletedFiles])

  // Auto-select first file or src/App.jsx when files change
  useEffect(() => {
    if (baseFiles.length === 0) return
    const appFile = baseFiles.find(f => f.path === 'src/App.jsx' || f.path === 'src/App.tsx')
    setSelectedFile(appFile?.path || baseFiles[0].path)
    setModifiedFiles({})
    setDeletedFiles([])
    setFileQuery('')
    setNewFilePath('')
  }, [baseFiles])

  // Reset view to preview when deliverable changes
  useEffect(() => {
    setViewMode('preview')
  }, [deliverable.id])

  // Listen for theme updates from DevSettingsPanel and modify project files
  useEffect(() => {
    const handler = (e: Event) => {
      const theme = (e as CustomEvent).detail
      if (!theme) return

      // Update tailwind.config.js with new colors and font
      const tailwindFile = files.find(f => f.path === 'tailwind.config.js')
      if (tailwindFile) {
        let config = tailwindFile.content
        // Replace primary color
        if (theme.colors?.primary?.DEFAULT) {
          config = config.replace(
            /primary:\s*\{[^}]*\}/,
            `primary: { DEFAULT: '${theme.colors.primary.DEFAULT}', foreground: '${theme.colors.primary.foreground || '#ffffff'}' }`
          )
        }
        // Replace secondary color
        if (theme.colors?.secondary?.DEFAULT) {
          config = config.replace(
            /secondary:\s*\{[^}]*\}/,
            `secondary: { DEFAULT: '${theme.colors.secondary.DEFAULT}', foreground: '${theme.colors.secondary.foreground || '#1e293b'}' }`
          )
        }
        // Replace accent color
        if (theme.colors?.accent?.DEFAULT) {
          config = config.replace(
            /accent:\s*\{[^}]*\}/,
            `accent: { DEFAULT: '${theme.colors.accent.DEFAULT}', foreground: '${theme.colors.accent.foreground || '#ffffff'}' }`
          )
        }
        // Replace background color
        if (theme.colors?.background) {
          config = config.replace(
            /background:\s*'[^']*'/,
            `background: '${theme.colors.background}'`
          )
        }
        // Replace font family
        if (theme.fontFamily) {
          config = config.replace(
            /fontFamily:\s*\{[^}]*\}/,
            `fontFamily: { sans: ['${theme.fontFamily}', 'system-ui', '-apple-system', 'sans-serif'] }`
          )
        }
        setModifiedFiles(prev => ({ ...prev, 'tailwind.config.js': config }))
      }

      // Update Google Fonts link in index.html
      if (theme.fontFamily) {
        const htmlFile = files.find(f => f.path === 'index.html')
        if (htmlFile) {
          const fontEncoded = theme.fontFamily.replace(/\s+/g, '+')
          let html = htmlFile.content
          html = html.replace(
            /fonts\.googleapis\.com\/css2\?family=[^&"]+/,
            `fonts.googleapis.com/css2?family=${fontEncoded}:wght@300;400;500;600;700;800;900`
          )
          setModifiedFiles(prev => ({ ...prev, 'index.html': html }))
        }
      }
    }

    window.addEventListener('dev-theme-update', handler)
    return () => window.removeEventListener('dev-theme-update', handler)
  }, [files])

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftKey)
      if (!rawDraft) return
      const draft = JSON.parse(rawDraft) as {
        modifiedFiles?: Record<string, string>
        deletedFiles?: string[]
        selectedFile?: string
      }
      if (draft.modifiedFiles) setModifiedFiles(draft.modifiedFiles)
      if (draft.deletedFiles) setDeletedFiles(draft.deletedFiles)
      if (draft.selectedFile) setSelectedFile(draft.selectedFile)
      setSaveMessage('Borrador local restaurado')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      localStorage.removeItem(draftKey)
    }
  }, [draftKey])

  const selectedFileContent = useMemo(() => {
    return files.find(f => f.path === selectedFile)?.content || ''
  }, [files, selectedFile])

  // Start editing
  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setEditContent(selectedFileContent)
    setTimeout(() => editorRef.current?.focus(), 50)
  }, [selectedFileContent])

  // Handle code changes with debounce
  const handleCodeChange = useCallback((value: string) => {
    setEditContent(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setModifiedFiles(prev => ({ ...prev, [selectedFile]: value }))
    }, 600)
  }, [selectedFile])

  // Stop editing when switching files
  useEffect(() => {
    setIsEditing(false)
  }, [selectedFile])

  // Download as a real project zip
  const handleDownload = useCallback(() => {
    const zip = new JSZip()
    for (const file of files) {
      zip.file(file.path, file.content)
    }

    zip.generateAsync({ type: 'blob' }).then((blob: Blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${deliverable.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-project.zip`
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [files, deliverable.title])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(selectedFileContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [selectedFileContent])

  const handlePublished = (url: string) => {
    setDeployUrl(url)
  }

  const handleCreateFile = useCallback(() => {
    const normalizedPath = newFilePath.trim().replace(/^\/+/, '')
    if (!normalizedPath) return
    if (files.some(file => file.path === normalizedPath)) return

    const extension = normalizedPath.split('.').pop()?.toLowerCase()
    const templates: Record<string, string> = {
      tsx: 'export default function NewComponent() {\n  return <div>New component</div>\n}\n',
      jsx: 'export default function NewComponent() {\n  return <div>New component</div>\n}\n',
      ts: 'export {}\n',
      js: 'export {}\n',
      css: '/* styles */\n',
      json: '{\n  \n}\n',
      md: '# New file\n',
      html: '<div></div>\n',
    }

    setModifiedFiles(prev => ({
      ...prev,
      [normalizedPath]: templates[extension || ''] ?? '',
    }))
    setDeletedFiles(prev => prev.filter(path => path !== normalizedPath))
    setSelectedFile(normalizedPath)
    setNewFilePath('')
  }, [files, newFilePath])

  const handleDeleteFile = useCallback((path: string) => {
    setModifiedFiles(prev => {
      const next = { ...prev }
      delete next[path]
      return next
    })

    if (baseFiles.some(file => file.path === path)) {
      setDeletedFiles(prev => [...prev, path])
    }

    if (selectedFile === path) {
      const fallback = files.find(file => file.path !== path)
      setSelectedFile(fallback?.path || '')
    }
  }, [baseFiles, files, selectedFile])

  const handleRenameFile = useCallback((fromPath: string, toPath: string) => {
    const normalized = toPath.trim().replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normalized || normalized === fromPath || files.some(file => file.path === normalized)) return

    const source = files.find(file => file.path === fromPath)
    if (!source) return

    setModifiedFiles(prev => {
      const next = { ...prev }
      delete next[fromPath]
      next[normalized] = source.content
      return next
    })

    if (baseFiles.some(file => file.path === fromPath)) {
      setDeletedFiles(prev => [...new Set([...prev, fromPath])])
    } else {
      setDeletedFiles(prev => prev.filter(path => path !== fromPath))
    }

    setSelectedFile(normalized)
    setSaveMessage(`Archivo movido a ${normalized}`)
    setTimeout(() => setSaveMessage(null), 3000)
  }, [baseFiles, files])

  const handleSaveProject = useCallback(async () => {
    if (!conversationId) return

    setSaving(true)
    setSaveMessage(null)
    try {
      const token = localStorage.getItem('plury_token')
      const response = await fetch(`/api/conversations/${conversationId}/deliverables/${deliverable.id}/save-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: deliverable.title,
          files,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setSaveMessage(data.error || 'No se pudo guardar el proyecto')
        return
      }

      setModifiedFiles({})
      setDeletedFiles([])
      localStorage.removeItem(draftKey)
      setSaveMessage(data.warnings?.length ? data.warnings.join(' | ') : 'Proyecto guardado como nueva version')
      onSelectVersion?.(data)
    } catch {
      setSaveMessage('Error de red al guardar el proyecto')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 4000)
    }
  }, [conversationId, deliverable.id, deliverable.title, draftKey, files, onSelectVersion])

  const hasChanges = Object.keys(modifiedFiles).length > 0 || deletedFiles.length > 0
  const previewViewportClass = viewport === 'mobile'
    ? 'w-[390px] max-w-full'
    : viewport === 'tablet'
      ? 'w-[820px] max-w-full'
      : 'w-full'

  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    if (!hasChanges) {
      localStorage.removeItem(draftKey)
      return
    }

    draftTimerRef.current = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({
        modifiedFiles,
        deletedFiles,
        selectedFile,
      }))
      setSaveMessage('Borrador local actualizado')
      setTimeout(() => setSaveMessage(current => current === 'Borrador local actualizado' ? null : current), 2500)
    }, 1200)

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [deletedFiles, draftKey, hasChanges, modifiedFiles, selectedFile])

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] text-white/40 text-sm">
        No se encontraron archivos del proyecto
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-white/70 truncate">{deliverable.title}</span>
          <span className="text-[10px] text-white/30">{files.length} archivos</span>
          {hasChanges && (
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">modificado</span>
          )}
          {conversationId && onSelectVersion && (
            <VersionSelector
              deliverableId={deliverable.id}
              currentVersion={deliverable.version}
              versionCount={deliverable.versionCount}
              conversationId={conversationId}
              onSelectVersion={onSelectVersion}
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* File tree toggle */}
          <button
            onClick={() => setShowFileTree(!showFileTree)}
            className={`p-1.5 rounded transition-colors ${showFileTree ? 'text-[#a78bfa] bg-[#a78bfa]/10' : 'text-white/30 hover:text-white/60'}`}
            title="Archivos"
          >
            <FolderTree size={14} />
          </button>

          {/* View mode buttons */}
          <div className="flex items-center bg-white/[0.04] rounded p-0.5 ml-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1 rounded text-xs transition-colors ${viewMode === 'preview' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
              title="Preview"
            >
              <Eye size={13} />
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`p-1 rounded text-xs transition-colors ${viewMode === 'code' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
              title="Code"
            >
              <Code2 size={13} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1 rounded text-xs transition-colors ${viewMode === 'split' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
              title="Split"
            >
              <Columns2 size={13} />
            </button>
          </div>

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="flex items-center bg-white/[0.04] rounded p-0.5 ml-1">
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded text-xs transition-colors ${viewport === 'mobile' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
                title="Mobile"
              >
                <Smartphone size={13} />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`p-1 rounded text-xs transition-colors ${viewport === 'tablet' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
                title="Tablet"
              >
                <Tablet size={13} />
              </button>
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1 rounded text-xs transition-colors ${viewport === 'desktop' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
                title="Desktop"
              >
                <Monitor size={13} />
              </button>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        {showFileTree && (viewMode === 'code' || viewMode === 'split') && (
          <div className="w-52 border-r border-white/[0.06] overflow-y-auto flex-shrink-0">
            <div className="border-b border-white/[0.06] px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                Archivos
              </div>
              <div className="relative mt-2">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  value={fileQuery}
                  onChange={e => setFileQuery(e.target.value)}
                  placeholder="Buscar archivo"
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] py-1.5 pl-7 pr-2 text-[11px] text-white/70 outline-none focus:border-[#a78bfa]/40"
                />
              </div>
              <div className="mt-2 flex gap-1">
                <input
                  type="text"
                  value={newFilePath}
                  onChange={e => setNewFilePath(e.target.value)}
                  placeholder="src/nuevo.tsx"
                  className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[11px] text-white/70 outline-none focus:border-[#a78bfa]/40"
                />
                <button
                  onClick={handleCreateFile}
                  className="rounded-md bg-[#a78bfa]/15 px-2 text-[#c4b5fd] transition-colors hover:bg-[#a78bfa]/25"
                  title="Crear archivo"
                >
                  <FilePlus2 size={12} />
                </button>
              </div>
            </div>
            <FileTree
              files={files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              filter={fileQuery}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
            />
          </div>
        )}

        {/* Code panel */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} flex flex-col overflow-hidden border-r border-white/[0.06]`}>
            {/* File tab */}
            <div className="h-8 px-3 flex items-center justify-between border-b border-white/[0.06] flex-shrink-0">
              <span className="text-[11px] text-white/50 font-mono">{selectedFile}</span>
              <div className="flex items-center gap-1">
                {modifiedFiles[selectedFile] && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="Modificado" />
                )}
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors"
                  >
                    Editar
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-[10px] text-[#a78bfa] px-1.5 py-0.5 rounded bg-[#a78bfa]/10 transition-colors"
                  >
                    Listo
                  </button>
                )}
              </div>
            </div>
            {/* Code content */}
            <div className="flex-1 overflow-auto bg-[#0d1117]">
              {isEditing ? (
                <textarea
                  ref={editorRef}
                  value={editContent}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full h-full p-4 text-[12px] leading-relaxed font-mono bg-transparent text-[#e6edf3] resize-none outline-none border-none"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              ) : (
                <div onDoubleClick={handleStartEdit} className="cursor-text h-full">
                  <SyntaxHighlighter
                    content={selectedFileContent}
                    language={getLanguage(selectedFile)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview panel — always mounted to keep WebContainer alive, hidden via CSS when code-only */}
        <div className={`${viewMode === 'code' ? 'hidden' : viewMode === 'split' ? 'w-1/2' : 'flex-1'} flex flex-col overflow-hidden`}>
          <div className={`flex-1 overflow-auto ${viewport === 'desktop' ? 'bg-[#0a0a0f]' : 'bg-[#111118] p-3 flex justify-center'}`}>
            <div className={`h-full ${previewViewportClass} ${viewport === 'desktop' ? '' : 'min-h-full overflow-hidden rounded-xl border border-white/[0.08] shadow-2xl'}`}>
              <WebContainerPreview files={files} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 bg-white/[0.04] rounded-lg transition-all"
          >
            <Copy size={13} /> {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 bg-white/[0.04] rounded-lg transition-all"
          >
            <Download size={13} /> Exportar
          </button>
          {conversationId && (
            <button
              onClick={handleSaveProject}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-all"
            >
              {saving ? 'Guardando...' : 'Guardar version'}
            </button>
          )}
          <button
            onClick={() => setPublishModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#a78bfa] hover:bg-[#8b5cf6] rounded-lg transition-all"
          >
            <Globe size={13} /> {deployUrl ? 'Actualizar' : 'Publicar'}
          </button>
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#a78bfa]/80 hover:bg-[#a78bfa] rounded-lg transition-all"
            >
              <ExternalLink size={13} /> Ver sitio
            </a>
          )}
          <button
            onClick={() => setGithubModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 bg-white/[0.04] rounded-lg transition-all"
          >
            <Github size={13} /> GitHub
          </button>
        </div>
        <p className={`text-[10px] ${saveMessage ? 'text-emerald-300' : 'text-white/20'}`}>{saveMessage || `Generado por ${deliverable.agent}`}</p>
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
        projectFiles={files}
      />
    </div>
  )
}
