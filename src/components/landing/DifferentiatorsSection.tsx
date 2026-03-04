import { useEffect, useRef } from 'react'
import { Users, Headphones, Building2, ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const differentiators = [
  {
    icon: Building2,
    badge: 'Agencia 360°',
    title: 'No solo código — tu equipo creativo completo',
    desc: 'Plury no es solo un builder. Somos una agencia digital completa con IA: branding, web, SEO, campañas de ads, video y contenido. Todo desde un solo lugar, con agentes especializados en cada área.',
    gradient: 'from-purple-500/20 to-violet-500/5',
    borderColor: 'border-purple-500/20',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    icon: Headphones,
    badge: 'Senior bajo demanda',
    title: 'Humano real cuando la IA no alcanza',
    desc: 'Si un resultado no te convence, solicita ayuda de un profesional senior. Diseñadores, developers y estrategas reales revisan y mejoran lo que la IA generó. Sin esperas de días — respuesta rápida.',
    gradient: 'from-amber-500/20 to-orange-500/5',
    borderColor: 'border-amber-500/20',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    icon: Users,
    badge: 'Marca blanca',
    title: 'Tu propia agencia con tu marca y equipo',
    desc: 'Usa Plury con tu logo, tus colores y tu dominio. Invita a tu equipo, gestiona clientes y entrega proyectos como si fueran tuyos. Perfecto para agencias que quieren escalar sin contratar más gente.',
    gradient: 'from-emerald-500/20 to-green-500/5',
    borderColor: 'border-emerald-500/20',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
]

interface DifferentiatorsSectionProps {
  onRegister: () => void
}

const DifferentiatorsSection = ({ onRegister }: DifferentiatorsSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || !titleRef.current || !cardsRef.current) return

    const anims: gsap.core.Tween[] = []

    anims.push(gsap.fromTo(titleRef.current, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.8,
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    }))

    anims.push(gsap.fromTo(Array.from(cardsRef.current.children), { opacity: 0, y: 50 }, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.2, ease: 'power3.out',
      scrollTrigger: { trigger: cardsRef.current, start: 'top 85%', scroller: '#landing-scroll' },
    }))

    return () => {
      anims.forEach(a => a.kill())
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  return (
    <section ref={sectionRef} id="agencia" className="py-24 sm:py-32 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div ref={titleRef} style={{ opacity: 0 }} className="text-center mb-16">
          <p className="text-[12px] text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-3">Por qué Plury</p>
          <h2 className="text-[34px] sm:text-[48px] font-bold tracking-[-0.03em] text-white mb-4">
            Más que un builder de IA
          </h2>
          <p className="text-[17px] text-zinc-400 max-w-xl mx-auto">
            Lo que nos hace diferentes de cualquier otra herramienta.
          </p>
        </div>

        <div ref={cardsRef} className="space-y-6">
          {differentiators.map((d, i) => {
            const Icon = d.icon
            return (
              <div
                key={i}
                style={{ opacity: 0 }}
                className={`relative group bg-white/[0.02] border ${d.borderColor} rounded-2xl p-8 sm:p-10 hover:bg-white/[0.04] transition-all overflow-hidden`}
              >
                {/* Background gradient */}
                <div className={`absolute top-0 right-0 w-[400px] h-[300px] bg-gradient-to-bl ${d.gradient} rounded-full blur-[100px] pointer-events-none opacity-40`} />

                <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon size={24} className="text-white/70" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border mb-4 ${d.badgeColor}`}>
                      {d.badge}
                    </span>
                    <h3 className="text-[22px] sm:text-[26px] font-bold text-white tracking-[-0.02em] mb-3">{d.title}</h3>
                    <p className="text-[15px] text-zinc-400 leading-[1.7] max-w-2xl">{d.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button
            onClick={onRegister}
            className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-black bg-white rounded-full hover:bg-zinc-200 transition-colors"
          >
            Probar Plury gratis <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default DifferentiatorsSection
