import { useEffect, useRef } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { plans } from '../../data/pricing'

gsap.registerPlugin(ScrollTrigger)

interface PricingSectionProps {
  onRegister: () => void
}

const PricingSection = ({ onRegister }: PricingSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.price-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 35, scale: 0.97 }, {
      opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} id="precios" className="py-20 sm:py-28 px-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="price-anim text-center mb-14">
          <p className="text-[12px] text-[#43f1f2] uppercase tracking-[0.15em] font-semibold mb-3">Precios</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.025em] text-white mb-3">
            Empiezas con la plataforma
            <br />
            y escalas por necesidad real
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-2xl mx-auto">
            Primero pagas por usar Plury como sistema. Luego subes por volumen, equipo o marca blanca. El respaldo humano se suma aparte cuando hace falta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const isPro = plan.highlighted
            return (
              <div
                key={plan.id}
                className={`price-anim relative rounded-2xl border flex flex-col transition-all p-6 ${
                  isPro
                    ? 'border-[#a78bfa]/30 bg-[#a78bfa]/[0.04] shadow-[0_0_40px_rgba(139,92,246,0.08)]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#8b5cf6] rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    Popular
                  </div>
                )}

                <p className="text-[14px] font-semibold text-white">{plan.name}</p>
                <p className="text-[32px] font-bold text-white mt-1.5 tracking-[-0.02em]">{plan.price}</p>
                <p className="text-[11.5px] font-semibold text-[#a78bfa] mt-0.5">{plan.credits} creditos/mes</p>

                <div className="mt-5 space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <p key={f} className="text-[12.5px] text-zinc-400 flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" /> {f}
                    </p>
                  ))}
                </div>

                <button
                  onClick={onRegister}
                  className={`mt-6 w-full py-2.5 text-[13px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    isPro
                      ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                      : 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1]'
                  }`}
                >
                  {plan.price === 'Gratis' ? 'Empezar gratis' : 'Comenzar'} <ArrowRight size={13} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="price-anim mt-8 text-center bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <p className="text-[14px] text-zinc-300 mb-1">
            <span className="font-semibold text-white">Senior Add-on</span> · Agrega revision humana a cualquier plan
          </p>
          <p className="text-[12.5px] text-zinc-500">
            Desde <span className="text-white font-semibold">$149/mes</span> · Revision en 24-48h · Developers, disenadores y estrategas reales
          </p>
        </div>
      </div>
    </section>
  )
}

export default PricingSection
