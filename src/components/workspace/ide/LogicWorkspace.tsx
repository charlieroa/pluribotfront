import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, Code2, Eye, Terminal, Circle } from 'lucide-react'
import { getTemplate } from '../../../templates'
import { useWebContainer, type FileEntry } from '../../../hooks/useWebContainer'
import FileTree from './FileTree'
import CodeEditor from './CodeEditor'
import PreviewFrame from './PreviewFrame'
import TerminalOutput from './TerminalOutput'

interface LogicWorkspaceProps {
  templateId: string
  onClose: () => void
  logicFiles?: Record<string, string> | null
}

interface OpenFile {
  path: string
  content: string
  dirty: boolean
}

const statusLabels: Record<string, string> = {
  idle: 'Listo',
  booting: 'Iniciando...',
  installing: 'Instalando deps...',
  running: 'Ejecutando',
  error: 'Error',
}

export default function LogicWorkspace({ templateId, onClose, logicFiles }: LogicWorkspaceProps) {
  const template = getTemplate(templateId)
  const wc = useWebContainer()

  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [showTerminal, setShowTerminal] = useState(false)
  const [fileTree, setFileTree] = useState<FileEntry[]>([])
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const lastLogicFilesRef = useRef<Record<string, string> | null>(null)

  const activeFile = openFiles.find((f) => f.path === activeFilePath) ?? null

  // Boot + mount on first render
  useEffect(() => {
    if (!template || mountedRef.current) return
    mountedRef.current = true
    wc.mountTemplate(template.files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  // Refresh file tree once running (or after install)
  useEffect(() => {
    if (wc.status === 'running' || wc.status === 'installing') {
      const t = setTimeout(async () => {
        const tree = await wc.listDir()
        setFileTree(tree)
      }, wc.status === 'running' ? 500 : 2000)
      return () => clearTimeout(t)
    }
  }, [wc.status, wc.listDir])

  // Open entry file automatically
  useEffect(() => {
    if (wc.status === 'running' && template && openFiles.length === 0) {
      handleFileSelect(template.entryFile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wc.status])

  // Write logicFiles from Logic agent into the WebContainer
  useEffect(() => {
    if (wc.status !== 'running' || !logicFiles || logicFiles === lastLogicFilesRef.current) return
    lastLogicFilesRef.current = logicFiles

    const writeFiles = async () => {
      // Filter out protected template files that Logic should never overwrite
      const PROTECTED_FILES = ['src/index.css', 'src/main.tsx']
      const PROTECTED_PREFIXES = ['src/components/ui/']
      const safeFiles = Object.entries(logicFiles).filter(([path]) => {
        if (PROTECTED_FILES.includes(path)) return false
        if (PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix))) return false
        return true
      })

      const dirs = new Set<string>()
      for (const [filePath] of safeFiles) {
        const parts = filePath.split('/')
        for (let i = 1; i < parts.length; i++) {
          dirs.add(parts.slice(0, i).join('/'))
        }
      }
      const sortedDirs = Array.from(dirs).sort((a, b) => a.length - b.length)
      for (const dir of sortedDirs) {
        try { await wc.mkdir(dir) } catch { /* dir may already exist */ }
      }

      for (const [filePath, content] of safeFiles) {
        try {
          await wc.writeFile(filePath, content)
        } catch (err) {
          console.error(`[LogicWorkspace] Failed to write ${filePath}:`, err)
        }
      }

      const tree = await wc.listDir()
      setFileTree(tree)

      setOpenFiles(prev => prev.map(f => {
        if (logicFiles[f.path] !== undefined) {
          return { ...f, content: logicFiles[f.path], dirty: false }
        }
        return f
      }))

      if (openFiles.length === 0 && logicFiles['src/App.tsx']) {
        handleFileSelect('src/App.tsx')
      }
    }

    writeFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wc.status, logicFiles])

  const handleFileSelect = useCallback(
    async (path: string) => {
      const existing = openFiles.find((f) => f.path === path)
      if (existing) {
        setActiveFilePath(path)
        return
      }
      try {
        const content = await wc.readFile(path)
        setOpenFiles((prev) => [...prev, { path, content, dirty: false }])
        setActiveFilePath(path)
      } catch {
        // Can't read (e.g. binary)
      }
    },
    [openFiles, wc],
  )

  const handleContentChange = useCallback(
    (value: string) => {
      if (!activeFilePath) return
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === activeFilePath ? { ...f, content: value, dirty: true } : f)),
      )
    },
    [activeFilePath],
  )

  const handleSave = useCallback(async () => {
    if (!activeFile || !activeFile.dirty) return
    try {
      await wc.writeFile(activeFile.path, activeFile.content)
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === activeFile.path ? { ...f, dirty: false } : f)),
      )
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }, [activeFile, wc])

  const handleCloseTab = useCallback(
    (path: string) => {
      setOpenFiles((prev) => prev.filter((f) => f.path !== path))
      if (activeFilePath === path) {
        const remaining = openFiles.filter((f) => f.path !== path)
        setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null)
      }
    },
    [activeFilePath, openFiles],
  )

  const handleCloseIDE = useCallback(() => {
    wc.teardown()
    onClose()
  }, [wc, onClose])

  const fileName = (path: string) => path.split('/').pop() ?? path

  return (
    <div className="flex flex-col h-full w-full bg-surface overflow-hidden">
      {/* ═══ Top toolbar ═══ */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-edge flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-ink">{template?.name ?? 'Proyecto'}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            wc.status === 'running' ? 'bg-emerald-500/10 text-emerald-600' :
            wc.status === 'error' ? 'bg-red-500/10 text-red-500' :
            'bg-amber-500/10 text-amber-600'
          }`}>
            {(wc.status === 'booting' || wc.status === 'installing') && (
              <Loader2 size={10} className="inline animate-spin mr-1" />
            )}
            {statusLabels[wc.status]}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-subtle rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'preview'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            <Eye size={13} />
            Preview
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'code'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            <Code2 size={13} />
            Code
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'code' && (
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`p-1.5 rounded-md transition-colors ${
                showTerminal ? 'bg-primary/10 text-primary' : 'text-ink-faint hover:text-ink hover:bg-subtle'
              }`}
              title="Terminal"
            >
              <Terminal size={14} />
            </button>
          )}
          <button
            onClick={handleCloseIDE}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-subtle transition-colors"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Content area ═══ */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {viewMode === 'preview' ? (
          /* ── Preview mode: full width iframe ── */
          <div className="flex-1 bg-white">
            <PreviewFrame url={wc.previewUrl} status={wc.status} />
          </div>
        ) : (
          /* ── Code mode: file tree + editor + optional preview ── */
          <>
            {/* File tree */}
            <div className="w-[200px] flex-shrink-0 border-r border-edge bg-surface overflow-hidden flex flex-col">
              <div className="px-3 py-2 text-[10px] font-bold text-ink-faint uppercase tracking-wider flex-shrink-0">
                Archivos
              </div>
              <div className="flex-1 overflow-y-auto">
                <FileTree files={fileTree} activeFile={activeFilePath} onFileSelect={handleFileSelect} />
              </div>
            </div>

            {/* Editor + Terminal column */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* File tabs */}
              {openFiles.length > 0 && (
                <div className="flex items-center bg-[#1e1e1e] border-b border-[#333] overflow-x-auto flex-shrink-0">
                  {openFiles.map((f) => (
                    <div
                      key={f.path}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-[#333] flex-shrink-0 ${
                        f.path === activeFilePath
                          ? 'bg-[#1e1e1e] text-white'
                          : 'bg-[#2d2d2d] text-gray-400 hover:text-gray-200'
                      }`}
                      onClick={() => setActiveFilePath(f.path)}
                    >
                      {f.dirty && <Circle size={6} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                      <span className="truncate max-w-[120px]">{fileName(f.path)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCloseTab(f.path) }}
                        className="ml-1 p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Code editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeFile ? (
                  <CodeEditor
                    value={activeFile.content}
                    onChange={handleContentChange}
                    onSave={handleSave}
                    filePath={activeFile.path}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-600 text-sm">
                    Selecciona un archivo para editar
                  </div>
                )}
              </div>

              {/* Terminal (toggle) */}
              {showTerminal && (
                <div className="h-[150px] flex-shrink-0 border-t border-[#333]">
                  <TerminalOutput lines={wc.terminalOutput} />
                </div>
              )}
            </div>

            {/* Preview sidebar in code mode */}
            <div className="w-[45%] flex-shrink-0 border-l border-edge">
              <PreviewFrame url={wc.previewUrl} status={wc.status} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
