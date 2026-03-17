import { useEffect, useRef } from 'react'
import { MessageSquareText, Cpu, Users, Rocket } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    icon: MessageSquareText,
    title: 'Empiezas con una idea',
    desc: 'Describes lo que quieres lanzar sin separar brief creativo, producto, contenido o distribucion.',
    color: 'from-[#a78bfa] to-[#8b5cf6]',
    badge: 'Idea',
  },
  {
    icon: Cpu,
    title: 'Plury organiza la ejecucion',
    desc: 'La plataforma coordina branding, contenido y producto en un mismo flujo para que todo tenga continuidad.',
    color: 'from-blue-500 to-cyan-500',
    badge: 'Sistema',
  },
  {
    icon: Rocket,
    title: 'Lanzas y mejoras',
    desc: 'Terminas con activos reales para salir al mercado y luego sigues ajustando desde el mismo lugar.',
    color: 'from-emerald-500 to-green-500',
    badge: 'Lanzamiento',
  },
  {
    icon: Users,
    title: 'Escalas a humano si hace falta',
    desc: 'Si una parte del proyecto necesita mas criterio o implementacion manual, un senior entra con el contexto ya construido.',
    color: 'from-amber-500 to-orange-500',
    badge: 'Respaldo',
  },
]

const HowItWorksSection = () => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.how-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} className="py-20 sm:py-28 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="how-anim text-center mb-16">
          <p className="text-[12px] text-[#43f1f2] uppercase tracking-[0.15em] font-semibold mb-3">Como funciona</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.03em] text-white mb-4">
            Como funciona
            <br />
            de forma simple
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-xl mx-auto">
            La logica es una: idea, construccion, salida y respaldo cuando haga falta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="how-anim relative group">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{step.badge}</span>
                  </div>

                  <h3 className="text-[18px] font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[14px] text-zinc-400 leading-[1.65]">{step.desc}</p>
                </div>

                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 text-zinc-700 z-10">
                    <svg width="24" height="24" fill="none"><path d="M5 12h14m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
