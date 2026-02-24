import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { TerminalLog } from '../../types'

interface TerminalPanelProps {
  logs: TerminalLog[]
  isRunning: boolean
}

const TYPE_COLORS: Record<TerminalLog['type'], string> = {
  command: 'text-cyan-400',
  output: 'text-slate-300',
  error: 'text-red-400',
  success: 'text-emerald-400',
}

const TYPE_PREFIX: Record<TerminalLog['type'], string> = {
  command: '$ ',
  output: '  ',
  error: '  ',
  success: '  ',
}

export default function TerminalPanel({ logs, isRunning }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border-b border-slate-800 flex-shrink-0">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Terminal</span>
        {isRunning && <Loader2 size={10} className="animate-spin text-cyan-400 ml-auto" />}
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-[1.7] custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className={TYPE_COLORS[log.type]}>
            <span className="select-none opacity-60">{TYPE_PREFIX[log.type]}</span>
            {log.text}
          </div>
        ))}
        {isRunning && (
          <div className="text-slate-500 animate-pulse">
            <span className="select-none opacity-60">  </span>
            <span className="inline-block w-2 h-3.5 bg-slate-400 animate-pulse" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
