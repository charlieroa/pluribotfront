import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight, Zap, Users } from 'lucide-react'
import gsap from 'gsap'

interface HeroSectionProps {
  onPromptClick: (prompt?: string) => void
}

const suggestions = [
  'Crea una landing page para mi startup',
  'Disena el logo de mi marca',
  'Haz una auditoria SEO de mi web',
  'Genera un video promocional',
]

const typingExamples = [
  'Crea una web para mi restaurante...',
  'Desarrolla una app tipo Airbnb...',
  'Disena un flyer para mi evento...',
  'Genera el logo de mi startup...',
  'Haz un video promocional de 30s...',
  'Audita el SEO de mi sitio web...',
  'Campana de ads para Black Friday...',
  'Landing page para captar leads...',
  'Tu creatividad es el limite...',
]

const HeroSection = ({ onPromptClick }: HeroSectionProps) => {
  const [inputValue, setInputValue] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const sectionRef = useRef<HTMLElement>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef({ idx: 0, charIdx: 0, deleting: false })

  const tick = useCallback(() => {
    const t = typingRef.current
    const word = typingExamples[t.idx]

    if (!t.deleting) {
      t.charIdx++
      setPlaceholder(word.slice(0, t.charIdx))
      if (t.charIdx >= word.length) {
        t.deleting = true
        return 2000 // pause before deleting
      }
      return 60
    } else {
      t.charIdx--
      setPlaceholder(word.slice(0, t.charIdx))
      if (t.charIdx <= 0) {
        t.deleting = false
        t.idx = (t.idx + 1) % typingExamples.length
        return 400 // pause before next word
      }
      return 30
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const loop = () => {
      const delay = tick()
      timer = setTimeout(loop, delay)
    }
    timer = setTimeout(loop, 1000)
    return () => clearTimeout(timer)
  }, [tick])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.hero-anim')
    gsap.fromTo(items, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.1,
    })

    // Floating card — entrance + continuous float
    if (floatRef.current) {
      gsap.fromTo(floatRef.current,
        { opacity: 0, x: 40, y: 15, scale: 0.85 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: 1, ease: 'back.out(1.5)', delay: 1 }
      )
      gsap.to(floatRef.current, {
        y: -10, x: 3, duration: 3.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2,
      })
    }
  }, [])

  const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text) return
    onPromptClick(text)
  }

  return (
    <section ref={sectionRef} id="hero" className="relative pt-20 pb-12 md:pt-32 md:pb-20 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-purple-600/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-violet-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[850px] mx-auto text-center">
        {/* Badge */}
        <div className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full border border-purple-500/20 bg-purple-500/[0.08] text-[12.5px] font-medium text-purple-300">
          <Zap size={13} className="text-purple-400" />
          Agentes de IA trabajando para ti
        </div>

        {/* Headline — with floating card embedded */}
        <div className="hero-anim relative inline-block">
          <h1 className="text-[40px] sm:text-[56px] md:text-[68px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white mb-6">
            La IA llega al 90%.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#6d28d9]">Nosotros hacemos el 100%.</span>
          </h1>

          {/* Floating senior card — positioned inside the headline area */}
          <div
            ref={floatRef}
            style={{ opacity: 0 }}
            className="absolute -right-6 sm:-right-16 md:-right-24 top-0 sm:-top-2 hidden sm:flex items-center gap-2.5 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3.5 py-2.5 rounded-2xl shadow-2xl shadow-black/60 z-30 rotate-[4deg]"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white flex items-center gap-1.5">
                ¿La IA no alcanzo?
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </p>
              <p className="text-[10px] text-zinc-400">Senior humano en 24h</p>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p className="hero-anim text-[16px] sm:text-[19px] text-zinc-400 leading-[1.65] max-w-[620px] mx-auto mb-10">
          El problema de las herramientas No-Code de IA es cuando te estancas. En Plury, presionas un boton y un <span className="text-white font-medium">senior humano</span> lo termina.
        </p>

        {/* Input box */}
        <div className="hero-anim max-w-[600px] mx-auto mb-6">
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/40 via-violet-500/30 to-purple-500/40 rounded-2xl blur-sm opacity-60 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl">
              <div className="flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={inputValue ? '' : placeholder || '¿Que quieres crear hoy?'}
                  className="flex-1 bg-transparent text-[15px] text-white placeholder:text-zinc-500 px-5 py-4 focus:outline-none"
                />
                <button
                  onClick={handleSubmit}
                  className="m-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-[13.5px] font-semibold hover:bg-[#6d28d9] transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                >
                  Crear <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="hero-anim flex flex-wrap justify-center gap-2 max-w-[600px] mx-auto mb-12">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onPromptClick(s)}
              className="px-3.5 py-[6px] text-[12px] text-zinc-500 bg-white/[0.03] border border-white/[0.07] rounded-full hover:border-purple-500/30 hover:text-zinc-300 hover:bg-purple-500/[0.05] transition-all"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Social proof numbers */}
        <div className="hero-anim flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {[
            { num: '10K+', label: 'Proyectos creados' },
            { num: '500+', label: 'Creados por semana' },
            { num: '99%', label: 'Uptime garantizado' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-[24px] sm:text-[28px] font-bold text-white tracking-[-0.02em]">{s.num}</p>
              <p className="text-[11.5px] text-zinc-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroSection
