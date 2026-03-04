import { useEffect, useRef } from 'react'
import { Building2, Users, Code2, Headphones, ArrowRight, Shield } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface AgencySectionProps {
  onRegister: () => void
}

const perks = [
  { icon: Building2, title: 'Tu marca, tu dominio', desc: 'Plury desaparece. Tus clientes ven tu logo, tus colores y tu URL.' },
  { icon: Users, title: 'Equipo ilimitado', desc: 'Invita disenadores, developers y managers. Gestiona proyectos y clientes.' },
  { icon: Headphones, title: 'Seniors bajo demanda', desc: 'Profesionales reales revisan y mejoran cada entrega. Respuesta en 24-48h.' },
  { icon: Code2, title: 'Acceso por API', desc: 'Integra los agentes de Plury en tu propio producto o flujo de trabajo.' },
  { icon: Shield, title: 'SLA garantizado', desc: '99.9% uptime, soporte prioritario y account manager dedicado.' },
]

const AgencySection = ({ onRegister }: AgencySectionProps) => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.agency-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 35 }, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} id="agencias" className="py-20 sm:py-28 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="agency-anim relative bg-gradient-to-br from-purple-500/[0.08] to-violet-500/[0.03] border border-purple-500/20 rounded-3xl p-8 sm:p-12 overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 text-[11px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full uppercase tracking-wider">Para agencias</span>
            </div>

            <h2 className="agency-anim text-[30px] sm:text-[42px] font-bold tracking-[-0.03em] text-white mb-4 max-w-2xl">
              Tu propia agencia de IA con marca blanca
            </h2>

            <p className="agency-anim text-[16px] text-zinc-400 leading-[1.7] max-w-2xl mb-10">
              Usa Plury con tu logo, tus colores y tu dominio. Tus clientes creen que tienes un equipo de 20 personas. Escala sin contratar. Entrega proyectos en horas, no semanas.
            </p>

            {/* Perks grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {perks.map((p, i) => {
                const Icon = p.icon
                return (
                  <div key={i} className="agency-anim flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold text-white mb-0.5">{p.title}</p>
                      <p className="text-[12px] text-zinc-500 leading-[1.5]">{p.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* CTA */}
            <div className="agency-anim flex flex-wrap gap-3">
              <button
                onClick={onRegister}
                className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-white bg-[#7c3aed] rounded-full hover:bg-[#6d28d9] transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              >
                Empezar como agencia <ArrowRight size={15} />
              </button>
              <button
                onClick={onRegister}
                className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-zinc-300 bg-white/[0.05] border border-white/[0.1] rounded-full hover:bg-white/[0.08] transition-all"
              >
                Ver documentacion API
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AgencySection
