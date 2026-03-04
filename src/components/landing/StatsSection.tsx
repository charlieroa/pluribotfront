import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: 10000, suffix: '+', label: 'Proyectos creados' },
  { value: 500, suffix: '+', label: 'Proyectos por semana' },
  { value: 50000, suffix: '+', label: 'Visitas a apps de Plury' },
  { value: 99, suffix: '%', label: 'Tiempo de actividad' },
]

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

const StatsSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [counts, setCounts] = useState(stats.map(() => 0))
  const animated = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 75%',
      scroller: '#landing-scroll',
      onEnter: () => {
        if (animated.current) return
        animated.current = true
        stats.forEach((stat, i) => {
          const obj = { val: 0 }
          gsap.to(obj, {
            val: stat.value,
            duration: 2,
            ease: 'power2.out',
            onUpdate: () => {
              setCounts(prev => {
                const next = [...prev]
                next[i] = Math.round(obj.val)
                return next
              })
            },
          })
        })
      },
    })

    return () => { st.kill() }
  }, [])

  return (
    <section ref={sectionRef} className="py-24 sm:py-28 px-4 border-y border-white/[0.04] bg-zinc-950">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] text-white mb-3">Plury en números</h2>
          <p className="text-[15px] text-zinc-500">El impacto de la inteligencia artificial en la creación digital.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-[44px] sm:text-[52px] font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tracking-[-0.03em] leading-none mb-2">
                {stat.suffix === '%' ? counts[i] : formatNumber(counts[i])}{stat.suffix}
              </p>
              <p className="text-[13px] text-zinc-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StatsSection
