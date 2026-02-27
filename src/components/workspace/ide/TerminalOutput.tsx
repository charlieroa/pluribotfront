import { useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

interface TerminalOutputProps {
  lines: string[]
}

export default function TerminalOutput({ lines }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] border-t border-[#333] flex-shrink-0">
        <Terminal size={12} className="text-gray-400" />
        <span className="text-[11px] text-gray-400 font-medium">Terminal</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed custom-scrollbar"
      >
        {lines.length === 0 ? (
          <span className="text-gray-600">Esperando...</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${line.startsWith('Error') ? 'text-red-400' : 'text-gray-300'}`}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
