import type { ThinkingStep } from '../../hooks/useChat'

interface ThinkingBoxProps {
  steps: ThinkingStep[]
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  brand: '#ec4899',
  web: '#a855f7',
  content: '#f97316',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
  base: '#a78bfa',
}

const agentInitials: Record<string, string> = {
  seo: 'L',
  brand: 'B',
  web: 'P',
  content: 'C',
  ads: 'M',
  dev: 'D',
  video: 'R',
  base: 'P',
}

const ThinkingBox = ({ steps }: ThinkingBoxProps) => {
  if (steps.length === 0) return null

  const currentAgent = steps[steps.length - 1]
  const color = agentColors[currentAgent.agentId] ?? '#6b7280'
  const initial = agentInitials[currentAgent.agentId] ?? '?'

  return (
    <div className="flex items-start gap-3 max-w-2xl">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
      <div className="pt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{currentAgent.agentName}</span>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color }} />
            <div className="w-1 h-1 rounded-full animate-bounce [animation-delay:0.15s]" style={{ backgroundColor: color }} />
            <div className="w-1 h-1 rounded-full animate-bounce [animation-delay:0.3s]" style={{ backgroundColor: color }} />
          </div>
        </div>
        <p className="text-xs text-ink-faint mt-0.5">{currentAgent.step}</p>
      </div>
    </div>
  )
}

export default ThinkingBox
