import { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'

interface BotAvatar3DProps {
  seed: string
  color: string
  isActive: boolean
  size?: 'sm' | 'md' | 'lg'
}

const BotAvatar3D = ({ seed, color, isActive, size = 'md' }: BotAvatar3DProps) => {
  const px = size === 'lg' ? 64 : size === 'md' ? 40 : 32
  const cls = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8'

  const uri = useMemo(() =>
    createAvatar(bottts, {
      seed,
      size: px,
      backgroundColor: [color.replace('#', '')],
      backgroundType: ['solid'],
      radius: 50,
    }).toDataUri(),
    [seed, px, color]
  )

  return (
    <div className="relative flex-shrink-0">
      <img src={uri} alt={seed} className={`${cls} rounded-full ${isActive ? '' : 'opacity-40 grayscale'}`} />
      {isActive && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-avatar-ring" />}
    </div>
  )
}

export default BotAvatar3D
