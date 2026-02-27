import { useState, useRef, useCallback, useEffect } from 'react'
import { WebContainer, type FileSystemTree } from '@webcontainer/api'

export type WCStatus = 'idle' | 'booting' | 'installing' | 'running' | 'error'

export interface WebContainerState {
  status: WCStatus
  error: string | null
  previewUrl: string | null
  terminalOutput: string[]
}

// Singleton — one WebContainer per page
let _instance: WebContainer | null = null
let _booting: Promise<WebContainer> | null = null

async function getInstance(): Promise<WebContainer> {
  if (_instance) return _instance
  if (_booting) return _booting
  _booting = WebContainer.boot()
  _instance = await _booting
  _booting = null
  return _instance
}

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileEntry[]
}

export function useWebContainer() {
  const [status, setStatus] = useState<WCStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const processRef = useRef<{ kill: () => void } | null>(null)
  const instanceRef = useRef<WebContainer | null>(null)

  const appendOutput = useCallback((line: string) => {
    setTerminalOutput((prev) => [...prev, line])
  }, [])

  const mountTemplate = useCallback(
    async (files: FileSystemTree) => {
      try {
        setStatus('booting')
        setError(null)
        setPreviewUrl(null)
        setTerminalOutput([])
        appendOutput('Booting WebContainer...')

        const wc = await getInstance()
        instanceRef.current = wc

        appendOutput('Mounting files...')
        await wc.mount(files)

        // Listen for server-ready
        wc.on('server-ready', (_port: number, url: string) => {
          setPreviewUrl(url)
          setStatus('running')
          appendOutput(`Dev server ready at ${url}`)
        })

        // npm install
        setStatus('installing')
        appendOutput('Running npm install...')
        const installProcess = await wc.spawn('npm', ['install'])
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data)
            },
          }),
        )
        const installExit = await installProcess.exit
        if (installExit !== 0) {
          throw new Error(`npm install failed with exit code ${installExit}`)
        }
        appendOutput('npm install complete.')

        // npm run dev
        appendOutput('Starting dev server...')
        const devProcess = await wc.spawn('npm', ['run', 'dev'])
        processRef.current = devProcess
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data)
            },
          }),
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setStatus('error')
        appendOutput(`Error: ${msg}`)
      }
    },
    [appendOutput],
  )

  const readFile = useCallback(async (path: string): Promise<string> => {
    const wc = instanceRef.current
    if (!wc) throw new Error('WebContainer not ready')
    return wc.fs.readFile(path, 'utf-8')
  }, [])

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    const wc = instanceRef.current
    if (!wc) throw new Error('WebContainer not ready')
    await wc.fs.writeFile(path, content)
  }, [])

  const mkdir = useCallback(async (path: string): Promise<void> => {
    const wc = instanceRef.current
    if (!wc) throw new Error('WebContainer not ready')
    await wc.fs.mkdir(path, { recursive: true })
  }, [])

  const spawn = useCallback(async (cmd: string, args: string[]): Promise<void> => {
    const wc = instanceRef.current
    if (!wc) throw new Error('WebContainer not ready')
    const proc = await wc.spawn(cmd, args)
    await proc.exit
  }, [])

  const listDir = useCallback(
    async (path: string = '.'): Promise<FileEntry[]> => {
      const wc = instanceRef.current
      if (!wc) return []

      const entries = await wc.fs.readdir(path, { withFileTypes: true })
      const result: FileEntry[] = []

      for (const entry of entries) {
        const fullPath = path === '.' ? entry.name : `${path}/${entry.name}`
        // Skip node_modules and hidden files
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue

        if (entry.isDirectory()) {
          const children = await listDir(fullPath)
          result.push({ name: entry.name, path: fullPath, type: 'directory', children })
        } else {
          result.push({ name: entry.name, path: fullPath, type: 'file' })
        }
      }

      // Sort: directories first, then files
      result.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return result
    },
    [],
  )

  const teardown = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill()
      processRef.current = null
    }
    if (_instance) {
      _instance.teardown()
      _instance = null
    }
    instanceRef.current = null
    setStatus('idle')
    setPreviewUrl(null)
    setTerminalOutput([])
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processRef.current) {
        processRef.current.kill()
        processRef.current = null
      }
    }
  }, [])

  return {
    status,
    error,
    previewUrl,
    terminalOutput,
    mountTemplate,
    readFile,
    writeFile,
    mkdir,
    spawn,
    listDir,
    teardown,
  }
}
