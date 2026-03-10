import { useEffect, useRef } from 'react'
import { MessageSquareText, Cpu, Users, Rocket } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    num: '1',
    icon: MessageSquareText,
    title: 'Describe tu idea',
    desc: 'Escribe lo que necesitas en lenguaje natural: una web, un logo, un video, una campana. El sistema asigna al agente correcto automaticamente.',
    color: 'from-[#a78bfa] to-[#8b5cf6]',
    badge: 'Prompt',
  },
  {
    num: '2',
    icon: Cpu,
    title: 'La IA construye',
    desc: 'Agentes especializados generan codigo, diseno, copy y assets en paralelo. Ves el progreso en tiempo real y puedes iterar con feedback.',
    color: 'from-blue-500 to-cyan-500',
    badge: 'Build',
  },
  {
    num: '3',
    icon: Users,
    title: 'El humano resuelve',
    desc: 'Si algo no queda perfecto, un senior real toma el contexto y lo ajusta a mano. Sin volver a explicar nada. Entrega en 24-48h.',
    color: 'from-amber-500 to-orange-500',
    badge: 'Review',
  },
  {
    num: '4',
    icon: Rocket,
    title: 'Publica y disfruta',
    desc: 'Un click y tu proyecto esta live con dominio propio. Edita visualmente, comparte o conecta con Shopify y WordPress.',
    color: 'from-emerald-500 to-green-500',
    badge: 'Ship',
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
            Prompt. Build. Ship.
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-md mx-auto">
            De la idea al producto en minutos. Sin codigo, sin esperas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="how-anim relative group">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all h-full">
                  {/* Step number */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{step.badge}</span>
                  </div>

                  <h3 className="text-[18px] font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[14px] text-zinc-400 leading-[1.65]">{step.desc}</p>
                </div>

                {/* Arrow connector (desktop) */}
                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 translate-x-0 -translate-y-1/2 text-zinc-700 z-10">
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
