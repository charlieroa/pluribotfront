import { useState, useEffect, useRef, useCallback, useDeferredValue } from 'react'
import { X, Monitor, Code2, Columns, Download, ExternalLink, Copy, Maximize2, Minimize2, Loader2, Globe, Check, AlertTriangle, Github, Terminal, History, Database, Share2 } from 'lucide-react'
import type { ProjectArtifact, TerminalLog, ArtifactVersion } from '../../types'
import FileTree from './FileTree'
import CodeEditor from './CodeEditor'
import PreviewPanel from './PreviewPanel'
import TerminalPanel from './TerminalPanel'
import VersionHistory from './VersionHistory'
import GitHubPushModal from './GitHubPushModal'
import SandpackPreview from './SandpackPreview'
import ConsolePanel from './ConsolePanel'
import SupabaseConnectModal from './SupabaseConnectModal'
import type { ConsoleLog } from './SandpackPreview'
import { exportProjectAsZip, exportAsViteProject, openInStackBlitz } from '../../utils/export'

interface CodeWorkspaceProps {
  artifact: ProjectArtifact
  htmlContent: string
  onClose: () => void
  onAutoFix?: (errorMessage: string) => void
  isFixing?: boolean
  deliverableId?: string
  conversationId?: string
}

type ViewMode = 'preview' | 'code' | 'split'

const MAX_AUTO_FIX_RETRIES = 3
const SPLIT_RATIO_KEY = 'pluribots_split_ratio'

// Generate simulated terminal logs when building
function generateBuildLogs(artifact: ProjectArtifact, isComplete: boolean): TerminalLog[] {
  const logs: TerminalLog[] = [
    { text: 'npm install', type: 'command' },
    { text: 'Installing dependencies...', type: 'output' },
  ]

  // Parse package.json for deps
  const pkgFile = artifact.files.find(f => f.filePath === 'package.json')
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content)
      const deps = Object.keys(pkg.dependencies || {})
      if (deps.length > 0) {
        logs.push({ text: `added ${deps.length} packages`, type: 'success' })
      }
    } catch {
      logs.push({ text: 'added packages', type: 'success' })
    }
  }

  logs.push(
    { text: 'vite build', type: 'command' },
    { text: 'vite v6.4 building for production...', type: 'output' },
  )

  artifact.files.forEach(f => {
    if (/\.(tsx?|jsx?)$/.test(f.filePath)) {
      logs.push({ text: `transforming ${f.filePath}...`, type: 'output' })
    }
  })

  if (isComplete) {
    logs.push(
      { text: `${artifact.files.length} modules transformed.`, type: 'output' },
      { text: 'Build completed successfully', type: 'success' },
      { text: 'Ready on localhost:5173', type: 'success' },
    )
  }

  return logs
}

export default function CodeWorkspace({ artifact, htmlContent, onClose, onAutoFix, isFixing, deliverableId, conversationId }: CodeWorkspaceProps) {
  const isBuilding = !htmlContent
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [activeFile, setActiveFile] = useState<string | null>(
    artifact.files.find(f => f.filePath === 'src/App.tsx')?.filePath ?? artifact.files[0]?.filePath ?? null
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deployUrl, setDeployUrl] = useState<string | null>(null)
  const [deployProvider, setDeployProvider] = useState<'netlify' | 'local' | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployCopied, setDeployCopied] = useState(false)
  const [autoFixCount, setAutoFixCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const prevFileCount = useRef(artifact.files.length)
  const prevHtmlRef = useRef(htmlContent)

  // ─── New state: terminal, versions, github, edits ───
  const [showTerminal, setShowTerminal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showGitHubModal, setShowGitHubModal] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([])
  const [versions, setVersions] = useState<ArtifactVersion[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null)
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>({})

  // ─── Public sharing ───
  const [isPublic, setIsPublic] = useState(false)
  const [_shareSlug, setShareSlug] = useState<string | null>(null)
  const [isTogglingShare, setIsTogglingShare] = useState(false)

  // ─── Supabase config ───
  const [supabaseConfig, setSupabaseConfig] = useState<{ url: string; anonKey: string } | null>(null)
  const [showSupabaseModal, setShowSupabaseModal] = useState(false)

  // Fetch Supabase config on mount
  useEffect(() => {
    if (!conversationId) return
    fetch(`/api/conversations/${conversationId}/supabase`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.connected) {
          setSupabaseConfig({ url: data.supabaseUrl, anonKey: data.supabaseAnonKey })
        }
      })
      .catch(() => {})
  }, [conversationId])

  // ─── Phase 5: File tabs ───
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const initial = artifact.files.find(f => f.filePath === 'src/App.tsx')?.filePath ?? artifact.files[0]?.filePath
    return initial ? [initial] : []
  })

  // ─── Phase 5: Console panel ───
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const [showConsole, setShowConsole] = useState(false)

  // ─── Phase 5: Resizable split ───
  const [splitRatio, setSplitRatio] = useState(() => {
    const stored = localStorage.getItem(SPLIT_RATIO_KEY)
    return stored ? parseFloat(stored) : 0.5
  })
  const isDragging = useRef(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  // Debounce edited files for Sandpack
  const deferredEditedFiles = useDeferredValue(editedFiles)

  // Build current artifact with edits merged
  const currentArtifact: ProjectArtifact = {
    ...artifact,
    files: artifact.files.map(f => ({
      ...f,
      content: deferredEditedFiles[f.filePath] ?? f.content,
    })),
  }

  // Generate terminal logs as building progresses
  useEffect(() => {
    setTerminalLogs(generateBuildLogs(artifact, !!htmlContent))
  }, [artifact, htmlContent])

  // Snapshot version when a new complete build arrives
  useEffect(() => {
    if (htmlContent && htmlContent !== prevHtmlRef.current) {
      const newVersion: ArtifactVersion = {
        id: Date.now(),
        timestamp: new Date(),
        artifact: { ...artifact, files: artifact.files.map(f => ({ ...f })) },
        htmlContent,
        label: versions.length === 0 ? 'Version inicial' : `Iteracion ${versions.length + 1}`,
      }
      setVersions(prev => [...prev, newVersion])
      setCurrentVersionId(newVersion.id)
    }
  }, [htmlContent]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select latest file as it streams in
  useEffect(() => {
    if (artifact.files.length > prevFileCount.current) {
      const latestFile = artifact.files[artifact.files.length - 1]
      setActiveFile(latestFile.filePath)
      setOpenTabs(prev => prev.includes(latestFile.filePath) ? prev : [...prev, latestFile.filePath])
    }
    prevFileCount.current = artifact.files.length
  }, [artifact.files.length, artifact.files])

  // Reset auto-fix counter when content changes (new deliverable)
  useEffect(() => {
    if (htmlContent && htmlContent !== prevHtmlRef.current) {
      setAutoFixCount(0)
      setLastError(null)
      prevHtmlRef.current = htmlContent
    }
  }, [htmlContent])

  // ─── Phase 5: Add file to open tabs when activeFile changes ───
  useEffect(() => {
    if (activeFile && !openTabs.includes(activeFile)) {
      setOpenTabs(prev => [...prev, activeFile])
    }
  }, [activeFile]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Phase 5: Resizable split drag handlers ───
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width))
      setSplitRatio(ratio)
    }

    const onMouseUp = () => {
      isDragging.current = false
      localStorage.setItem(SPLIT_RATIO_KEY, String(splitRatio))
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [splitRatio])

  const activeFileData = artifact.files.find(f => f.filePath === activeFile)

  // Handle 0 files: show "Preparing files" state
  if (artifact.files.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-[#0d1117] border-l border-slate-700/50 min-w-0 overflow-hidden">
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700/50 bg-[#161b22] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="font-semibold text-slate-200 text-sm">{artifact.title}</h3>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Loader2 size={10} className="animate-spin" /> Preparando archivos...
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-amber-400 mx-auto" />
            <p className="text-sm text-slate-400">Preparando archivos del proyecto...</p>
            <p className="text-xs text-slate-500">El codigo aparecera en tiempo real</p>
          </div>
        </div>
      </div>
    )
  }

  // Get the displayed code — either edited or original
  const getFileCode = (filePath: string) => {
    return editedFiles[filePath] ?? artifact.files.find(f => f.filePath === filePath)?.content ?? ''
  }

  const handleFileChange = (filePath: string, newCode: string) => {
    setEditedFiles(prev => ({ ...prev, [filePath]: newCode }))
  }

  const handleCopyCode = () => {
    if (activeFile) {
      navigator.clipboard.writeText(getFileCode(activeFile))
    }
  }

  // ─── Phase 5: Tab close ───
  const handleCloseTab = (filePath: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(p => p !== filePath)
      if (activeFile === filePath) {
        const idx = prev.indexOf(filePath)
        const newActive = next[Math.min(idx, next.length - 1)] ?? null
        setActiveFile(newActive)
      }
      return next
    })
  }

  // Check if a file has been modified
  const isFileModified = (filePath: string) => {
    const original = artifact.files.find(f => f.filePath === filePath)?.content
    return editedFiles[filePath] !== undefined && editedFiles[filePath] !== original
  }

  // ─── Version restore ───
  const handleRestoreVersion = (version: ArtifactVersion) => {
    setCurrentVersionId(version.id)
    setEditedFiles({})
  }

  // ─── Error auto-correction with debounce ───
  const autoFixTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingErrorRef = useRef<{ error: string; line: number; filePath?: string } | null>(null)

  const handlePreviewError = useCallback((error: string, line: number, filePath?: string) => {
    if (!onAutoFix) return
    if (autoFixCount >= MAX_AUTO_FIX_RETRIES) return
    if (isFixing) return

    // Skip known non-actionable errors
    const skipPatterns = ['ResizeObserver', 'Script error', 'Loading chunk', 'Failed to fetch', 'NetworkError', 'AbortError', 'postMessage']
    if (skipPatterns.some(p => error.includes(p))) return

    // Store latest error and debounce — wait 3s for Sandpack to settle
    pendingErrorRef.current = { error, line, filePath }
    setLastError(error)

    clearTimeout(autoFixTimerRef.current)
    autoFixTimerRef.current = setTimeout(() => {
      const pending = pendingErrorRef.current
      if (!pending) return
      pendingErrorRef.current = null

      setAutoFixCount(prev => prev + 1)

      // Build detailed error message with file context
      let errorMsg = `Error en el preview`
      if (pending.filePath) errorMsg += ` (archivo: ${pending.filePath})`
      if (pending.line > 0) errorMsg += ` (linea ${pending.line})`
      errorMsg += `: ${pending.error}`

      // Include surrounding code from the erroring file if possible
      if (pending.filePath) {
        const file = artifact.files.find(f =>
          pending.filePath!.endsWith(f.filePath) || f.filePath.endsWith(pending.filePath!.replace(/^\//, ''))
        )
        if (file && pending.line > 0) {
          const lines = file.content.split('\n')
          const start = Math.max(0, pending.line - 4)
          const end = Math.min(lines.length, pending.line + 3)
          const context = lines.slice(start, end)
            .map((l, i) => `${start + i + 1}${start + i + 1 === pending.line ? ' >>>' : '    '} ${l}`)
            .join('\n')
          errorMsg += `\n\nCodigo alrededor del error:\n${context}`
        }
      }

      errorMsg += `\n\nCorrige este error en el codigo generado. Genera el artefacto completo corregido.`
      onAutoFix(errorMsg)
    }, 3000)
  }, [onAutoFix, autoFixCount, isFixing, artifact.files])

  // Cleanup debounce timer
  useEffect(() => {
    return () => clearTimeout(autoFixTimerRef.current)
  }, [])

  // ─── Console message handler ───
  const handleConsoleMessage = useCallback((log: ConsoleLog) => {
    setConsoleLogs(prev => [...prev.slice(-200), log])
  }, [])

  // ─── Share toggle ───
  const handleToggleShare = async () => {
    if (!deliverableId) return
    setIsTogglingShare(true)
    try {
      const res = await fetch(`/api/portfolio/${deliverableId}/share`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsPublic(data.isPublic)
        setShareSlug(data.shareSlug)
        if (data.isPublic && data.shareSlug) {
          const shareUrl = `${window.location.origin}/shared/${data.shareSlug}`
          navigator.clipboard.writeText(shareUrl)
        }
      }
    } catch (err) {
      console.error('[Share] Error:', err)
    } finally {
      setIsTogglingShare(false)
    }
  }

  // ─── Deploy ───
  const handleDeploy = async () => {
    if (!deliverableId) return
    setIsDeploying(true)
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableId }),
      })
      if (res.ok) {
        const data = await res.json()
        setDeployUrl(data.url)
        setDeployProvider(data.provider ?? 'local')
      }
    } catch (err) {
      console.error('[Deploy] Error:', err)
    } finally {
      setIsDeploying(false)
    }
  }

  const handleCopyDeployUrl = () => {
    if (deployUrl) {
      navigator.clipboard.writeText(deployUrl)
      setDeployCopied(true)
      setTimeout(() => setDeployCopied(false), 2000)
    }
  }

  // ─── Preview rendering helper ───
  const renderPreview = () => {
    // Always use Sandpack when we have project files
    if (currentArtifact.files.length > 0) {
      return (
        <SandpackPreview
          artifact={currentArtifact}
          onError={handlePreviewError}
          onConsoleMessage={handleConsoleMessage}
          supabaseConfig={supabaseConfig ?? undefined}
        />
      )
    }
    // Fallback to classic HTML preview when only htmlContent is available
    if (htmlContent) {
      return <PreviewPanel htmlContent={htmlContent} title={artifact.title} onError={handlePreviewError} />
    }
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
            <Monitor size={24} className="absolute inset-0 m-auto text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Construyendo preview...</p>
            <p className="text-xs text-slate-500 mt-1">{artifact.files.length} archivo{artifact.files.length !== 1 ? 's' : ''} generado{artifact.files.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Tab bar rendering ───
  const renderTabBar = () => {
    if (openTabs.length === 0) return null
    return (
      <div className="flex items-center overflow-x-auto bg-[#0d1117] border-b border-slate-700/50 flex-shrink-0 custom-scrollbar">
        {openTabs.map(tabPath => {
          const fileName = tabPath.split('/').pop() || tabPath
          const isActive = activeFile === tabPath
          const modified = isFileModified(tabPath)
          return (
            <div
              key={tabPath}
              className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium cursor-pointer border-r border-slate-800/50 flex-shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#1e1e2e] text-white border-b-2 border-b-indigo-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              onClick={() => setActiveFile(tabPath)}
              title={tabPath}
            >
              {modified && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
              <span className="truncate max-w-[120px]">{fileName}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleCloseTab(tabPath) }}
                className="ml-1 p-0.5 text-slate-500 hover:text-white hover:bg-slate-600 rounded transition-colors flex-shrink-0"
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Render helpers ───
  const renderCodeEditor = (file: { filePath: string; language: string } | undefined) => {
    if (!file) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Selecciona un archivo
        </div>
      )
    }
    return (
      <CodeEditor
        code={getFileCode(file.filePath)}
        language={file.language}
        fileName={file.filePath}
        onChange={(code) => handleFileChange(file.filePath, code)}
      />
    )
  }

  // ─── Bottom panel (Terminal or Console) ───
  const renderBottomPanel = () => {
    if (!showTerminal && !showConsole) return null
    return (
      <div className="h-40 border-t border-slate-700/50 flex-shrink-0">
        {showConsole ? (
          <ConsolePanel logs={consoleLogs} onClear={() => setConsoleLogs([])} />
        ) : (
          <TerminalPanel logs={terminalLogs} isRunning={isBuilding || false} />
        )}
      </div>
    )
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col">
        <div className="h-10 px-4 flex items-center justify-between bg-[#161b22] border-b border-slate-700/50 flex-shrink-0">
          <span className="text-xs font-medium text-slate-300">{artifact.title}</span>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <Minimize2 size={16} />
          </button>
        </div>
        {viewMode === 'preview' || viewMode === 'split' ? (
          renderPreview()
        ) : (
          <>
            {renderTabBar()}
            {renderCodeEditor(activeFileData)}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] border-l border-slate-700/50 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700/50 bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isBuilding || isFixing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <h3 className="font-semibold text-slate-200 text-sm truncate">{artifact.title}</h3>
          </div>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {artifact.files.length} archivos
          </span>
          {isBuilding && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Loader2 size={10} className="animate-spin" /> Construyendo...
            </span>
          )}
          {isFixing && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Loader2 size={10} className="animate-spin" /> Corrigiendo...
            </span>
          )}
          {lastError && !isFixing && autoFixCount >= MAX_AUTO_FIX_RETRIES && (
            <span className="flex items-center gap-1 text-[10px] text-red-400" title={lastError}>
              <AlertTriangle size={10} /> Error persistente
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            {([
              { id: 'preview', icon: Monitor, label: 'Preview' },
              { id: 'code', icon: Code2, label: 'Codigo' },
              { id: 'split', icon: Columns, label: 'Split' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                  viewMode === id
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={12} />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Terminal toggle */}
          <button
            onClick={() => { setShowTerminal(p => !p); setShowConsole(false) }}
            className={`p-1.5 transition-colors rounded-lg ${
              showTerminal ? 'text-cyan-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Terminal"
          >
            <Terminal size={14} />
          </button>

          {/* Console toggle */}
          <button
            onClick={() => { setShowConsole(p => !p); setShowTerminal(false) }}
            className={`p-1.5 transition-colors rounded-lg text-[10px] font-mono font-bold ${
              showConsole ? 'text-amber-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Console"
          >
            {'{}'}
          </button>

          {/* Version history toggle */}
          <button
            onClick={() => setShowVersionHistory(p => !p)}
            className={`p-1.5 transition-colors rounded-lg ${
              showVersionHistory ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Historial de versiones"
          >
            <History size={14} />
          </button>

          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            title="Pantalla completa"
          >
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar — visible in code and split modes */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="w-48 flex-shrink-0 border-r border-slate-700/50 bg-[#0d1117] overflow-hidden flex flex-col">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Archivos
            </div>
            <FileTree files={artifact.files} activeFile={activeFile} onSelectFile={setActiveFile} />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {viewMode === 'preview' && renderPreview()}

            {viewMode === 'code' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {renderTabBar()}
                {renderCodeEditor(activeFileData)}
              </div>
            )}

            {viewMode === 'split' && (
              <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
                {/* Code side */}
                <div
                  className="flex flex-col overflow-hidden"
                  style={{ width: `${splitRatio * 100}%` }}
                >
                  {renderTabBar()}
                  {renderCodeEditor(activeFileData)}
                </div>
                {/* Drag handle */}
                <div
                  className="w-1 flex-shrink-0 bg-slate-700/50 hover:bg-indigo-500 cursor-col-resize transition-colors"
                  onMouseDown={handleSplitMouseDown}
                />
                {/* Preview side */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {renderPreview()}
                </div>
              </div>
            )}
          </div>

          {/* Bottom panel — Terminal or Console */}
          {renderBottomPanel()}
        </div>

        {/* Version history sidebar */}
        {showVersionHistory && (
          <VersionHistory
            versions={versions}
            currentVersionId={currentVersionId}
            onRestore={handleRestoreVersion}
            onClose={() => setShowVersionHistory(false)}
            currentArtifact={artifact}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between bg-[#161b22] flex-shrink-0">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
            title="Copiar archivo actual"
          >
            <Copy size={12} /> Copiar
          </button>
          <button
            onClick={() => exportProjectAsZip(artifact)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          >
            <Download size={12} /> ZIP
          </button>
          <button
            onClick={() => exportAsViteProject(artifact)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
            title="Descargar como proyecto Vite completo"
          >
            <Download size={12} /> Vite
          </button>
          <button
            onClick={() => openInStackBlitz(artifact)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all"
          >
            <ExternalLink size={12} /> StackBlitz
          </button>

          {/* Supabase connect button */}
          {conversationId && (
            <button
              onClick={() => setShowSupabaseModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                supabaseConfig
                  ? 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <Database size={12} /> {supabaseConfig ? 'Supabase' : 'Supabase'}
              {supabaseConfig && <Check size={10} className="text-emerald-400" />}
            </button>
          )}

          {/* GitHub push button */}
          <button
            onClick={() => setShowGitHubModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          >
            <Github size={12} /> GitHub
          </button>

          {/* Share / Public toggle */}
          {deliverableId && (
            <button
              onClick={handleToggleShare}
              disabled={isTogglingShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                isPublic
                  ? 'text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'
              }`}
              title={isPublic ? 'Compartido publicamente (click para desactivar)' : 'Compartir en portfolio publico'}
            >
              {isTogglingShare ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
              {isPublic ? 'Compartido' : 'Compartir'}
              {isPublic && <Check size={10} className="text-cyan-400" />}
            </button>
          )}

          {/* Deploy button */}
          {deliverableId && !deployUrl && (
            <button
              onClick={handleDeploy}
              disabled={isDeploying || isBuilding}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all disabled:opacity-50"
            >
              {isDeploying ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
              Publicar
            </button>
          )}

          {/* Deploy URL + Re-publish */}
          {deployUrl && (
            <>
              <a
                href={deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 rounded-lg transition-all hover:bg-emerald-500/20"
                title={deployUrl}
              >
                <ExternalLink size={12} />
                {deployProvider === 'netlify' ? 'Netlify' : 'Ver sitio'}
              </a>
              <button
                onClick={handleCopyDeployUrl}
                className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
                title="Copiar URL"
              >
                {deployCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-all disabled:opacity-50"
                title="Re-publicar con cambios"
              >
                {isDeploying ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                Re-publicar
              </button>
            </>
          )}
        </div>
        <p className="text-[10px] text-slate-500 hidden sm:block">Generado por Logic</p>
      </div>

      {/* GitHub Push Modal */}
      {showGitHubModal && (
        <GitHubPushModal artifact={artifact} onClose={() => setShowGitHubModal(false)} />
      )}

      {/* Supabase Connect Modal */}
      {showSupabaseModal && conversationId && (
        <SupabaseConnectModal
          conversationId={conversationId}
          onClose={() => setShowSupabaseModal(false)}
          onConnectionChange={(connected) => {
            if (connected) {
              // Re-fetch config
              fetch(`/api/conversations/${conversationId}/supabase`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                  if (data?.connected) {
                    setSupabaseConfig({ url: data.supabaseUrl, anonKey: data.supabaseAnonKey })
                  } else {
                    setSupabaseConfig(null)
                  }
                })
                .catch(() => {})
            } else {
              setSupabaseConfig(null)
            }
          }}
        />
      )}
    </div>
  )
}
