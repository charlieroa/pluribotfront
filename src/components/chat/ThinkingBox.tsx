import { useState, useEffect } from 'react'
import type { ThinkingStep } from '../../hooks/useChat'

interface ThinkingBoxProps {
  steps: ThinkingStep[]
}

const agentColors: Record<string, string> = {
  seo: '#3b82f6',
  brand: '#ec4899',
  web: '#a855f7',
  voxel: '#06b6d4',
  content: '#f97316',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
  base: '#a78bfa',
}

const ThinkingBox = ({ steps }: ThinkingBoxProps) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (steps.length === 0) { setElapsed(0); return }
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [steps.length > 0])

  if (steps.length === 0) return null

  const current = steps[steps.length - 1]
  const color = agentColors[current.agentId] ?? '#6b7280'
  // Only show tool execution steps, not verbose thinking
  const isToolStep = current.step.includes('herramienta') || current.step.includes('tool') || current.step.includes('generate_image')
  const displayText = isToolStep ? current.step : 'Generando...'

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2.5 px-1 py-1">
        <div className="relative w-5 h-5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: color }} />
          <div className="absolute inset-[3px] rounded-full" style={{ backgroundColor: color, opacity: 0.2 }} />
        </div>
        <span className="text-[12px] text-ink-faint font-medium truncate">{displayText}</span>
        <span className="text-[11px] text-ink-faint/50 font-mono tabular-nums flex-shrink-0">{elapsed}s</span>
      </div>
      <div className="h-[2px] bg-edge rounded-full overflow-hidden mx-1 mt-0.5">
        <div className="h-full rounded-full animate-pulse" style={{ backgroundColor: color, width: '60%', animation: 'progressPulse 2s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes progressPulse { 0% { width: 10%; opacity: 0.6; } 50% { width: 70%; opacity: 1; } 100% { width: 10%; opacity: 0.6; } }`}</style>
    </div>
  )
}

export default ThinkingBox
