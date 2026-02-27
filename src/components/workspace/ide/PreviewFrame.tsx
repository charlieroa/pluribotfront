import { useState } from 'react'
import { RefreshCw, ExternalLink } from 'lucide-react'
import type { WCStatus } from '../../../hooks/useWebContainer'

interface PreviewFrameProps {
  url: string | null
  status: WCStatus
}

export default function PreviewFrame({ url, status }: PreviewFrameProps) {
  const [iframeKey, setIframeKey] = useState(0)

  const statusColors: Record<WCStatus, string> = {
    idle: 'bg-gray-500',
    booting: 'bg-amber-500',
    installing: 'bg-amber-500',
    running: 'bg-emerald-500',
    error: 'bg-red-500',
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border-b border-[#333] flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]} flex-shrink-0`} />
        <span className="text-xs text-gray-400 truncate flex-1">
          {url || 'Cargando preview...'}
        </span>
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Recargar"
        >
          <RefreshCw size={13} />
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* iframe / loading state */}
      {url ? (
        <iframe
          key={iframeKey}
          src={url}
          className="flex-1 w-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              {status === 'booting' && 'Iniciando WebContainer...'}
              {status === 'installing' && 'Instalando dependencias...'}
              {status === 'idle' && 'Preparando...'}
              {status === 'error' && 'Error al cargar'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
