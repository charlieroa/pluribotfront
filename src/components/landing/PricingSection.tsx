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
      opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} id="precios" className="py-20 sm:py-28 px-4">
      <div className="max-w-[960px] mx-auto">
        <div className="price-anim text-center mb-14">
          <p className="text-[12px] text-purple-400 uppercase tracking-[0.15em] font-semibold mb-3">Precios</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.025em] text-white mb-3">Simple y transparente</h2>
          <p className="text-[16px] text-zinc-400 max-w-md mx-auto">Empieza gratis. Escala cuando lo necesites.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map(plan => {
            const isPro = plan.id === 'pro'
            return (
              <div
                key={plan.id}
                className={`price-anim relative rounded-2xl border flex flex-col transition-all p-7 ${
                  isPro
                    ? 'border-purple-500/30 bg-purple-500/[0.04] shadow-[0_0_40px_rgba(124,58,237,0.08)]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 bg-[#7c3aed] rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    Popular
                  </div>
                )}

                <p className="text-[15px] font-semibold text-white">{plan.name}</p>
                <p className="text-[36px] font-bold text-white mt-2 tracking-[-0.02em]">{plan.price}</p>
                <p className="text-[12px] font-semibold text-purple-400 mt-0.5">{plan.credits} creditos/mes</p>

                <div className="mt-6 space-y-3 flex-1">
                  {plan.features.map(f => (
                    <p key={f} className="text-[13px] text-zinc-400 flex items-start gap-2.5">
                      <Check size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" /> {f}
                    </p>
                  ))}
                </div>

                <button
                  onClick={onRegister}
                  className={`mt-7 w-full py-2.5 text-[13.5px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    isPro
                      ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                      : 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1]'
                  }`}
                >
                  {plan.price === 'Gratis' ? 'Empezar gratis' : 'Comenzar'} <ArrowRight size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
