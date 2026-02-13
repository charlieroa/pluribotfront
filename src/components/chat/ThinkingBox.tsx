import { Brain } from 'lucide-react'
import type { ThinkingStep } from '../../hooks/useChat'
import BotAvatar3D from '../avatars/BotAvatar3D'

interface ThinkingBoxProps {
  steps: ThinkingStep[]
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  web: '#a855f7',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
  base: '#6366f1',
}

const ThinkingBox = ({ steps }: ThinkingBoxProps) => {
  if (steps.length === 0) return null

  const currentAgent = steps[steps.length - 1]
  const color = agentColors[currentAgent.agentId] ?? '#6b7280'

  return (
    <div className="flex gap-4 max-w-2xl">
      <BotAvatar3D
        color={color}
        seed={currentAgent.agentName}
        isActive={true}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl rounded-tl-none border shadow-sm overflow-hidden"
          style={{ borderColor: `${color}30`, background: `${color}08` }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center gap-2"
            style={{ borderBottom: `1px solid ${color}20` }}
          >
            <Brain size={14} style={{ color }} className="animate-pulse" />
            <span className="text-xs font-bold" style={{ color }}>
              {currentAgent.agentName} esta pensando...
            </span>
            <div className="ml-auto flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: color }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.15s]" style={{ backgroundColor: color }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.3s]" style={{ backgroundColor: color }} />
            </div>
          </div>

          {/* Steps */}
          <div className="px-4 py-3 space-y-1.5">
            {steps.map((s, i) => {
              const isLatest = i === steps.length - 1
              return (
                <div
                  key={s.timestamp}
                  className={`flex items-center gap-2 transition-opacity duration-300 ${
                    isLatest ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLatest ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                  <span className={`text-[11px] ${isLatest ? 'font-semibold text-ink' : 'text-ink-faint'}`}>
                    {s.step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThinkingBox
