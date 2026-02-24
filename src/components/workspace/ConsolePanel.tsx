import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import type { ConsoleLog } from './SandpackPreview'

interface ConsolePanelProps {
  logs: ConsoleLog[]
  onClear: () => void
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const levelStyles: Record<ConsoleLog['level'], string> = {
  error: 'text-red-400 bg-red-500/10',
  warn: 'text-yellow-400 bg-yellow-500/10',
  log: 'text-slate-300',
  info: 'text-slate-300',
}

export default function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/50 bg-[#161b22] flex-shrink-0">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Console</span>
        <button
          onClick={onClear}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded hover:bg-slate-700/50"
          title="Limpiar consola"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto font-mono text-[11px] px-3 py-1">
        {logs.length === 0 ? (
          <p className="text-slate-600 py-2">Sin mensajes de consola</p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`px-1.5 py-0.5 rounded-sm ${levelStyles[log.level]}`}
            >
              <span className="text-slate-600 mr-2">[{formatTime(log.timestamp)}]</span>
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
