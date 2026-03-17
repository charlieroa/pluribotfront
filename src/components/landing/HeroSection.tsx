import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight, Sparkles, Layers3, MonitorSmartphone, PenSquare } from 'lucide-react'
import gsap from 'gsap'

interface HeroSectionProps {
  onPromptClick: (prompt?: string) => void
}

const suggestions = [
  'Crea la marca, web y contenido para mi startup',
  'Lanza un e-commerce desde cero para mi negocio',
  'Construye la web y la campana de mi restaurante',
  'Convierte mi idea en una app lista para presentar',
]

const typingExamples = [
  'Quiero lanzar una marca de cafe con web y contenido...',
  'Necesito una landing, anuncios y branding para mi startup...',
  'Crea el producto digital de mi idea y dejalo listo para mostrar...',
  'Quiero una marca, piezas y web para vender mi servicio...',
  'Convierte esta idea en una app con identidad visual...',
  'Lanza mi negocio con branding, contenido y producto...',
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
        return 2000
      }
      return 60
    }

    t.charIdx--
    setPlaceholder(word.slice(0, t.charIdx))
    if (t.charIdx <= 0) {
      t.deleting = false
      t.idx = (t.idx + 1) % typingExamples.length
      return 400
    }
    return 30
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

    if (floatsRef.current) {
      const cards = floatsRef.current.querySelectorAll('.hero-float')
      gsap.fromTo(cards,
        { opacity: 0, y: 25, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.25,
          ease: 'back.out(1.7)',
          delay: 0.8,
          onComplete: () => {
            cards.forEach((card, i) => {
              gsap.to(card, {
                y: 'random(-12, 12)',
                x: 'random(-6, 6)',
                rotation: 'random(-3, 3)',
                duration: 'random(3, 5)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: i * 0.5,
              })
            })
          },
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#8b5cf6]/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-[#a78bfa]/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[920px] mx-auto text-center">
        <div className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full border border-[#a78bfa]/20 bg-[#a78bfa]/[0.08] text-[12.5px] font-medium text-[#a78bfa]">
          <Sparkles size={13} className="text-[#43f1f2]" />
          Plataforma para lanzar proyectos digitales desde una idea
        </div>

        <div ref={floatsRef} className="hero-anim relative inline-block">
          <h1 className="text-[40px] sm:text-[56px] md:text-[68px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white mb-6">
            Convierte una idea
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]">
              en branding, contenido y producto.
            </span>
          </h1>

          <div
            style={{ opacity: 0 }}
            className="hero-float absolute -left-4 sm:-left-14 md:-left-24 top-2 sm:top-0 hidden sm:flex items-center gap-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-xl shadow-2xl shadow-black/60 z-30 -rotate-[3deg]"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
              <Layers3 size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Branding y sistema visual</p>
              <p className="text-[9px] text-zinc-400">Logo, tono y piezas base</p>
            </div>
          </div>

          <div
            style={{ opacity: 0 }}
            className="hero-float absolute -left-2 sm:-left-10 md:-left-16 bottom-0 sm:bottom-2 hidden sm:flex items-center gap-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-xl shadow-2xl shadow-black/60 z-30 rotate-[2deg]"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
              <PenSquare size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Contenido y campanas</p>
              <p className="text-[9px] text-zinc-400">Ads, copies y assets</p>
            </div>
          </div>

          <div
            style={{ opacity: 0 }}
            className="hero-float absolute -right-4 sm:-right-14 md:-right-24 top-[62%] -translate-y-1/2 hidden sm:flex items-center gap-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-xl shadow-2xl shadow-black/60 z-30 rotate-[4deg]"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <MonitorSmartphone size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Webs, apps y lanzamiento</p>
              <p className="text-[9px] text-zinc-400">Producto listo para salir</p>
            </div>
          </div>
        </div>

        <p className="hero-anim text-[16px] sm:text-[19px] text-zinc-400 leading-[1.65] max-w-[760px] mx-auto mb-10">
          <span className="text-white font-medium">Plury es la plataforma para crear y lanzar proyectos digitales completos desde una sola idea.</span>{' '}
          Genera marca, piezas de contenido, web o app dentro del mismo flujo, con respaldo humano si el proyecto lo necesita.
        </p>

        <div className="hero-anim grid gap-3 sm:grid-cols-3 max-w-[860px] mx-auto mb-10 text-left">
          {[
            { title: '1. Describe la idea', text: 'Cuenta que quieres lanzar y para quien es.' },
            { title: '2. Plury construye', text: 'Organiza branding, contenido y producto desde el mismo sistema.' },
            { title: '3. Sales con algo real', text: 'Itera, publica y suma apoyo humano si hace falta cerrar mejor.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
              <p className="text-[12px] font-semibold text-white mb-1.5">{item.title}</p>
              <p className="text-[13px] leading-6 text-zinc-400">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="hero-anim max-w-[860px] mx-auto mb-6">
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#a78bfa]/40 via-[#a78bfa]/30 to-[#a78bfa]/40 rounded-2xl blur-sm opacity-60 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl">
              <div className="flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={inputValue ? '' : placeholder || 'Describe lo que quieres lanzar'}
                  className="flex-1 min-w-0 bg-transparent text-[15px] text-white placeholder:text-zinc-300 px-5 py-4 focus:outline-none"
                />
                <button
                  onClick={handleSubmit}
                  className="m-2 shrink-0 px-5 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-[13.5px] font-semibold hover:bg-[#7c3aed] transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  Empezar proyecto <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-anim flex flex-wrap justify-center gap-2 max-w-[720px] mx-auto mb-12">
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

        <div className="hero-anim flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {[
            { num: 'Branding', label: 'Marca e identidad en el flujo' },
            { num: 'Contenido', label: 'Piezas para salir a mercado' },
            { num: 'Producto', label: 'Web o app sin cambiar de sistema' },
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
