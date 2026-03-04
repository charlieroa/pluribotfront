import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface CtaSectionProps {
  onRegister: () => void
}

const CtaSection = ({ onRegister }: CtaSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.cta-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 25 }, {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/[0.06] to-transparent pointer-events-none" />

      <div className="max-w-[600px] mx-auto text-center relative z-10">
        <h2 className="cta-anim text-[36px] sm:text-[52px] font-bold tracking-[-0.03em] text-white mb-5">
          Empieza a crear hoy
        </h2>
        <p className="cta-anim text-[16px] text-zinc-400 mb-8 max-w-md mx-auto">
          Miles de creadores y agencias ya construyen con Plury. Tu turno.
        </p>
        <button
          onClick={onRegister}
          className="cta-anim inline-flex items-center gap-2 px-8 py-3.5 text-[15px] font-bold text-white bg-[#7c3aed] rounded-full hover:bg-[#6d28d9] transition-all shadow-[0_0_40px_rgba(124,58,237,0.3)] hover:shadow-[0_0_60px_rgba(124,58,237,0.4)]"
        >
          Comenzar gratis <ArrowRight size={16} />
        </button>
      </div>
    </section>
  )
}

export default CtaSection
