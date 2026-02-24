import { useState, useRef, useEffect } from 'react'
import { Monitor, Tablet, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react'

interface PreviewPanelProps {
  htmlContent: string
  title: string
  onError?: (error: string, line: number) => void
}

type DeviceSize = 'desktop' | 'tablet' | 'mobile'

const deviceWidths: Record<DeviceSize, number | null> = {
  desktop: null,   // full width
  tablet: 768,
  mobile: 375,
}

export default function PreviewPanel({ htmlContent, title, onError }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceSize>('desktop')
  const [iframeError, setIframeError] = useState<{ error: string; line: number } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'iframe-error') {
        setIframeError({ error: event.data.error, line: event.data.line })
        onError?.(event.data.error, event.data.line)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Clear errors on content change
  useEffect(() => {
    setIframeError(null)
  }, [htmlContent, refreshKey])

  const width = deviceWidths[device]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a2e]">
      {/* Device toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center gap-1">
          {([
            { id: 'desktop', icon: Monitor, label: 'Desktop' },
            { id: 'tablet', icon: Tablet, label: 'Tablet' },
            { id: 'mobile', icon: Smartphone, label: 'Mobile' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setDevice(id)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                device === id
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
              title={label}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {width && <span className="text-[10px] text-slate-500">{width}px</span>}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded hover:bg-slate-700/50"
            title="Recargar"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex justify-center p-2">
        <div
          className="bg-white rounded-lg overflow-hidden shadow-lg h-full transition-all duration-300"
          style={{ width: width ? `${width}px` : '100%', maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            key={refreshKey}
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title={title}
          />
        </div>
      </div>

      {/* Error indicator */}
      {iframeError && (
        <button
          onClick={() => setIframeError(null)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500 text-white text-[11px] font-medium rounded-lg shadow-lg hover:bg-red-600 transition-colors z-10"
          title={`JS Error (line ${iframeError.line}): ${iframeError.error}`}
        >
          <AlertTriangle size={12} />
          Error linea {iframeError.line}
        </button>
      )}
    </div>
  )
}
