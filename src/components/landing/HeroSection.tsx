import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight, Zap, Users, Globe, Palette } from 'lucide-react'
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
  const floatsRef = useRef<HTMLDivElement>(null)
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

    // Floating cards — staggered entrance + continuous float
    if (floatsRef.current) {
      const cards = floatsRef.current.querySelectorAll('.hero-float')
      gsap.fromTo(cards,
        { opacity: 0, y: 25, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.25, ease: 'back.out(1.7)', delay: 0.8,
          onComplete: () => {
            cards.forEach((card, i) => {
              gsap.to(card, {
                y: 'random(-12, 12)', x: 'random(-6, 6)', rotation: 'random(-3, 3)',
                duration: 'random(3, 5)', repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.5,
              })
            })
          }
        }
      )
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#8b5cf6]/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-[#a78bfa]/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[850px] mx-auto text-center">
        {/* Badge */}
        <div className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full border border-[#a78bfa]/20 bg-[#a78bfa]/[0.08] text-[12.5px] font-medium text-[#a78bfa]">
          <Zap size={13} className="text-[#43f1f2]" />
          Agentes de IA trabajando para ti
        </div>

        {/* Headline — with floating cards */}
        <div ref={floatsRef} className="hero-anim relative inline-block">
          <h1 className="text-[40px] sm:text-[56px] md:text-[68px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white mb-6">
            La IA llega al 90%.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]">Nosotros hacemos el 100%.</span>
          </h1>

          {/* Floating card 1 — Crea webs (top-left) */}
          <div
            style={{ opacity: 0 }}
            className="hero-float absolute -left-4 sm:-left-14 md:-left-24 top-2 sm:top-0 hidden sm:flex items-center gap-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-xl shadow-2xl shadow-black/60 z-30 -rotate-[3deg]"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
              <Globe size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Crea webs y apps</p>
              <p className="text-[9px] text-zinc-400">Deploy en segundos</p>
            </div>
          </div>

          {/* Floating card 2 — Videos & logos (bottom-left) */}
          <div
            style={{ opacity: 0 }}
            className="hero-float absolute -left-2 sm:-left-10 md:-left-16 bottom-0 sm:bottom-2 hidden sm:flex items-center gap-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-xl shadow-2xl shadow-black/60 z-30 rotate-[2deg]"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
              <Palette size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Logos y diseno</p>
              <p className="text-[9px] text-zinc-400">Branding completo</p>
            </div>
          </div>

          {/* Floating card 3 — Senior humano (right) */}
          <div
            style={{ opacity: 0 }}
            className="hero-float absolute -right-4 sm:-right-14 md:-right-24 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-xl shadow-2xl shadow-black/60 z-30 rotate-[4deg]"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Users size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                ¿La IA no alcanzo?
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </p>
              <p className="text-[9px] text-zinc-400">Senior humano en 24h</p>
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
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#a78bfa]/40 via-[#a78bfa]/30 to-[#a78bfa]/40 rounded-2xl blur-sm opacity-60 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl">
              <div className="flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={inputValue ? '' : placeholder || '¿Que quieres crear hoy?'}
                  className="flex-1 bg-transparent text-[15px] text-white placeholder:text-zinc-300 px-5 py-4 focus:outline-none"
                />
                <button
                  onClick={handleSubmit}
                  className="m-2 px-5 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-[13.5px] font-semibold hover:bg-[#7c3aed] transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
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
              className="px-3.5 py-[6px] text-[12px] text-zinc-500 bg-white/[0.03] border border-white/[0.07] rounded-full hover:border-[#a78bfa]/30 hover:text-zinc-300 hover:bg-[#a78bfa]/[0.05] transition-all"
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
