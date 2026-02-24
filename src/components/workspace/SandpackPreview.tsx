import { useEffect, useRef, useState, useCallback } from 'react'
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewComponent,
  useSandpack,
} from '@codesandbox/sandpack-react'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { ProjectArtifact } from '../../types'

export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: Date
}

interface SandpackPreviewProps {
  artifact: ProjectArtifact
  onError?: (error: string, line: number, filePath?: string) => void
  onConsoleMessage?: (log: ConsoleLog) => void
  supabaseConfig?: { url: string; anonKey: string }
}

/** Extract npm dependencies from import statements */
function detectDependencies(files: ProjectArtifact['files']): Record<string, string> {
  const deps: Record<string, string> = {}
  const builtins = new Set(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'])

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file.filePath)) continue
    const regex = /import\s+.*?\s+from\s+['"]([^./][^'"]*)['"]/g
    let match
    while ((match = regex.exec(file.content)) !== null) {
      let pkg = match[1]
      // Scoped packages: @scope/pkg/subpath → @scope/pkg
      if (pkg.startsWith('@')) {
        const parts = pkg.split('/')
        pkg = parts.slice(0, 2).join('/')
      } else {
        pkg = pkg.split('/')[0]
      }
      if (!builtins.has(pkg) && !deps[pkg]) {
        deps[pkg] = 'latest'
      }
    }
  }
  return deps
}

/** Convert artifact files to Sandpack file format */
function toSandpackFiles(files: ProjectArtifact['files'], supabaseConfig?: { url: string; anonKey: string }): Record<string, { code: string }> {
  const result: Record<string, { code: string }> = {}
  for (const file of files) {
    const path = file.filePath.startsWith('/') ? file.filePath : `/${file.filePath}`
    let code = file.content
    if (supabaseConfig) {
      code = code.replace(/https:\/\/your-project\.supabase\.co/g, supabaseConfig.url)
      code = code.replace(/your-anon-key/g, supabaseConfig.anonKey)
    }
    result[path] = { code }
  }

  // Ensure /src/App.tsx exists (Sandpack react-ts template entry point)
  if (!result['/src/App.tsx'] && !result['/App.tsx']) {
    // Look for any App file
    const appKey = Object.keys(result).find(k => /\/App\.(tsx?|jsx?)$/.test(k))
    if (appKey && appKey !== '/src/App.tsx') {
      result['/src/App.tsx'] = result[appKey]
    }
  }

  // Ensure /src/index.css exists if a CSS file is in the artifact
  if (!result['/src/index.css']) {
    const cssKey = Object.keys(result).find(k => /index\.css$/.test(k))
    if (cssKey && cssKey !== '/src/index.css') {
      result['/src/index.css'] = result[cssKey]
    }
  }

  return result
}

/** Inner component that listens for Sandpack errors via the listen API */
function SandpackErrorListener({
  onError,
  onConsoleMessage,
}: {
  onError?: (error: string, line: number, filePath?: string) => void
  onConsoleMessage?: (log: ConsoleLog) => void
}) {
  const { listen } = useSandpack()

  useEffect(() => {
    const unsub = listen((msg: any) => {
      if (msg.type === 'action' && msg.action === 'show-error') {
        const message = msg.message || msg.title || 'Unknown error'
        const line = msg.line || 0
        const filePath = msg.path || undefined
        onError?.(message, line, filePath)
      }

      if (msg.type === 'console' && msg.log) {
        for (const entry of msg.log) {
          const level = entry.method === 'error' ? 'error'
            : entry.method === 'warn' ? 'warn'
            : entry.method === 'info' ? 'info'
            : 'log'

          const message = (entry.data || []).map((d: any) =>
            typeof d === 'string' ? d : JSON.stringify(d)
          ).join(' ')

          if (level === 'error' && onError) {
            onError(message, 0)
          }

          onConsoleMessage?.({
            level,
            message,
            timestamp: new Date(),
          })
        }
      }
    })

    return unsub
  }, [listen, onError, onConsoleMessage])

  return null
}

/** Error boundary wrapper */
function ErrorFallback({ error }: { error: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0d1117] p-6">
      <div className="text-center space-y-2 max-w-md">
        <AlertTriangle size={24} className="text-red-400 mx-auto" />
        <p className="text-sm font-medium text-red-300">Error al inicializar Sandpack</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    </div>
  )
}

export default function SandpackPreview({ artifact, onError, onConsoleMessage, supabaseConfig }: SandpackPreviewProps) {
  const [providerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const files = toSandpackFiles(artifact.files, supabaseConfig)
  const dependencies = detectDependencies(artifact.files)

  // Sandpack shows its own loading indicator; we add a brief overlay
  useEffect(() => {
    setIsLoading(true)
    loadTimerRef.current = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(loadTimerRef.current)
  }, [artifact.id])

  const handleError = useCallback((error: string, line: number) => {
    onError?.(error, line)
  }, [onError])

  if (providerError) {
    return <ErrorFallback error={providerError} />
  }

  if (Object.keys(files).length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d1117]/80">
          <div className="text-center space-y-2">
            <Loader2 size={24} className="animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-slate-400">Iniciando Sandpack...</p>
          </div>
        </div>
      )}
      <SandpackProvider
        template="react-ts"
        files={files}
        customSetup={{ dependencies }}
        theme="dark"
        options={{
          recompileMode: 'delayed',
          recompileDelay: 800,
          initMode: 'lazy',
        }}
      >
        <SandpackErrorListener
          onError={handleError}
          onConsoleMessage={onConsoleMessage}
        />
        <SandpackPreviewComponent
          style={{ flex: 1, minHeight: 0 }}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
        />
      </SandpackProvider>
    </div>
  )
}
