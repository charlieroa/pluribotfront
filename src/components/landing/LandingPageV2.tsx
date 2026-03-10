import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import {
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Command,
  DatabaseZap,
  FileCode2,
  LayoutDashboard,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Workflow,
} from 'lucide-react'
import AuthModal from './AuthModal'
import LandingFooter from './LandingFooter'

const rotatingWords = ['ecommerce', 'dashboards', 'CRMs', 'apps internas']

const promptExamples = [
  'Crea un ecommerce premium para mi tienda de zapatos con 100 productos, pagos, stock e inventario.',
  'Desarrolla un CRM para mi equipo comercial con pipeline, clientes, tareas y reportes.',
  'Necesito una landing para lanzar un SaaS con branding, contenido y campana de ads.',
]

const marqueeItems = [
  'Multi-agent orchestration',
  'Workspace con preview',
  'Versionado real',
  'GitHub push',
  'Deploy',
  'Refine mode',
  'Fallbacks anti-pantalla blanca',
  'Quick replies editables',
]

const featureBlocks = [
  {
    title: 'No solo genera. Termina.',
    copy: 'Plury no se queda en una maqueta bonita. Empuja el trabajo hacia un proyecto navegable, editable y publicable.',
    icon: Rocket,
    tone: 'from-[#f97316] to-[#fb7185]',
  },
  {
    title: 'Builder para trabajo con friccion real.',
    copy: 'Ecommerce, inventario, CRM, reservas y sistemas operativos con estructura, modulos y espacio de iteracion.',
    icon: Boxes,
    tone: 'from-[#22c55e] to-[#14b8a6]',
  },
  {
    title: 'Una interfaz para pensar y corregir.',
    copy: 'Chat, archivos, preview, guardado, publish y GitHub dentro del mismo flujo. Menos cambio de contexto, mas shipping.',
    icon: Command,
    tone: 'from-[#60a5fa] to-[#a78bfa]',
  },
]

const stackCards = [
  {
    label: 'Step 01',
    title: 'Interpretacion de proyecto',
    text: 'Entiende si necesitas una landing, una tienda o un sistema completo, y evita bloquearse por preguntas accesorias.',
    icon: Sparkles,
  },
  {
    label: 'Step 02',
    title: 'Orquestacion con especialidad',
    text: 'Activa agentes, dependencias y refinamiento cuando aporta valor, sin convertir la ejecucion en una cadena torpe.',
    icon: Workflow,
  },
  {
    label: 'Step 03',
    title: 'Workspace para aterrizar',
    text: 'El resultado vive en un espacio de trabajo con preview, edicion, versiones y salida operativa.',
    icon: FileCode2,
  },
]

const moduleCards = [
  {
    title: 'Commerce Engine',
    subtitle: 'Catalogo, carrito, checkout, stock',
    icon: ShoppingBag,
    accent: '#f59e0b',
  },
  {
    title: 'Ops Dashboard',
    subtitle: 'KPIs, tablas, alerts, activity',
    icon: LayoutDashboard,
    accent: '#34d399',
  },
  {
    title: 'Data Layer',
    subtitle: 'Mock data, estados y estructura',
    icon: DatabaseZap,
    accent: '#60a5fa',
  },
]

const metricCards = [
  { value: '1 flujo', label: 'para idear, construir, editar y publicar' },
  { value: '3 capas', label: 'chat, orchestration y workspace en una sola narrativa' },
  { value: '0 humo', label: 'cuando la promesa se enfoca en producto y no solo en AI wallpaper' },
]

const LandingPageV2 = () => {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [prompt, setPrompt] = useState(promptExamples[0])
  const [activeWord, setActiveWord] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cycle = window.setInterval(() => {
      setActiveWord((current) => (current + 1) % rotatingWords.length)
    }, 2200)

    return () => window.clearInterval(cycle)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-hero-reveal]',
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' },
      )

      gsap.utils.toArray<HTMLElement>('[data-float]').forEach((node, index) => {
        gsap.to(node, {
          y: index % 2 === 0 ? -16 : 16,
          x: index % 2 === 0 ? 10 : -10,
          duration: 4 + index * 0.45,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })

      gsap.fromTo(
        '[data-panel-reveal]',
        { opacity: 0, scale: 0.96, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.25 },
      )
    }, rootRef)

    return () => ctx.revert()
  }, [])

  const openLogin = () => {
    setAuthMode('login')
    setAuthOpen(true)
  }

  const openRegister = () => {
    setAuthMode('register')
    setAuthOpen(true)
  }

  const submitPrompt = (value?: string) => {
    const nextPrompt = (value ?? prompt).trim()
    if (!nextPrompt) return
    localStorage.setItem('plury_pending_prompt', nextPrompt)
    openRegister()
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const repeatedMarquee = useMemo(() => [...marqueeItems, ...marqueeItems], [])

  return (
    <div ref={rootRef} className="min-h-screen bg-[#060606] font-['Plus_Jakarta_Sans'] text-white selection:bg-[#f59e0b]/40">
      <style>{`
        @keyframes marqueeMove {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div id="landing-scroll" className="h-screen overflow-y-auto scroll-smooth">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060606]/78 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-4 md:px-8">
            <button onClick={() => scrollTo('hero')} className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <img src="/logo-light.png" alt="Plury" className="h-8" />
              </div>
              <div className="text-left">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Plury</p>
                <p className="text-sm font-semibold text-white">Landing Concept V2</p>
              </div>
            </button>

            <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 lg:flex">
              {[
                { label: 'Sistema', id: 'system' },
                { label: 'Muestra', id: 'showcase' },
                { label: 'Flujo', id: 'orchestration' },
                { label: 'CTA', id: 'cta' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="rounded-full px-4 py-2 text-[12px] font-medium text-white/68 transition hover:bg-white/8 hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={openLogin}
                className="hidden rounded-full border border-white/10 px-4 py-2 text-[12px] font-semibold text-white/72 transition hover:border-white/20 hover:text-white sm:inline-flex"
              >
                Iniciar sesion
              </button>
              <button
                onClick={openRegister}
                className="inline-flex items-center gap-2 rounded-full bg-[#f59e0b] px-4 py-2 text-[12px] font-bold text-[#111111] transition hover:bg-[#fbbf24]"
              >
                Empezar
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </header>

        <main>
          <section id="hero" className="relative overflow-hidden border-b border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_85%_16%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(180deg,#060606_0%,#09090b_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)] animate-[gridPulse_8s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute left-[-8%] top-24 h-72 w-72 rounded-full bg-[#f59e0b]/16 blur-[120px]" />
            <div className="pointer-events-none absolute right-[-6%] top-40 h-80 w-80 rounded-full bg-[#3b82f6]/14 blur-[140px]" />

            <div className="relative mx-auto grid max-w-[1320px] gap-12 px-5 pb-20 pt-12 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="max-w-[760px]">
                <div
                  data-hero-reveal
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75"
                >
                  <CircuitBoard size={14} className="text-[#f59e0b]" />
                  Multi-agent product system
                </div>

                <h1 data-hero-reveal className="mt-6 text-[46px] font-black leading-[0.9] tracking-[-0.07em] text-white sm:text-[62px] lg:text-[94px]">
                  La IA te saca el borrador.
                  <span className="mt-2 block text-white/58">Plury empuja el proyecto hasta</span>
                  <span className="mt-2 block text-[#f59e0b]">{rotatingWords[activeWord]} reales.</span>
                </h1>

                <p data-hero-reveal className="mt-7 max-w-[650px] text-[17px] leading-8 text-white/68 md:text-[19px]">
                  Una plataforma para equipos que necesitan orquestacion, workspace de codigo y salidas que no se rompan al primer intento.
                  Ecommerce, dashboards, CRMs y paginas con narrativa visual, no solo screenshots bonitos.
                </p>

                <div data-hero-reveal className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => submitPrompt()}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-bold text-[#111111] transition hover:bg-[#f6f6f6]"
                  >
                    Entrar con un proyecto
                    <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => scrollTo('showcase')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-6 py-3 text-[13px] font-bold text-white transition hover:border-white/20 hover:bg-white/8"
                  >
                    Ver la propuesta visual
                  </button>
                </div>

                <div data-hero-reveal className="mt-10 grid gap-4 sm:grid-cols-3">
                  {metricCards.map((item) => (
                    <div key={item.label} className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
                      <p className="text-[28px] font-black tracking-[-0.05em] text-white">{item.value}</p>
                      <p className="mt-2 text-[12px] leading-6 text-white/58">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative lg:min-h-[760px]">
                <div
                  data-panel-reveal
                  className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_40px_140px_rgba(0,0,0,0.45)]"
                >
                  <div className="rounded-[28px] border border-white/10 bg-[#0e0e11] p-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Project console</p>
                        <h2 className="mt-2 text-[24px] font-bold tracking-[-0.04em]">Zapateria Norte Commerce OS</h2>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                        Preview alive
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-white/8 bg-black/30 p-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                        Project prompt
                      </div>
                      <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        className="mt-3 min-h-[124px] w-full resize-none bg-transparent text-[14px] leading-7 text-white/84 focus:outline-none"
                      />
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                        {promptExamples.map((item) => (
                          <button
                            key={item}
                            onClick={() => setPrompt(item)}
                            className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/64 transition hover:border-[#f59e0b]/40 hover:text-white"
                          >
                            {item.length > 40 ? `${item.slice(0, 40)}...` : item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {moduleCards.map((item) => {
                        const Icon = item.icon
                        return (
                          <div key={item.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                              <div className="rounded-2xl p-2.5" style={{ backgroundColor: `${item.accent}22`, color: item.accent }}>
                                <Icon size={18} />
                              </div>
                              <CheckCircle2 size={16} className="text-white/42" />
                            </div>
                            <p className="mt-5 text-[14px] font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-[12px] leading-6 text-white/55">{item.subtitle}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div
                  data-float
                  className="absolute -left-3 top-10 hidden max-w-[250px] rounded-[28px] border border-white/10 bg-[#131314]/88 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:block"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Orchestrator</p>
                  <p className="mt-3 text-[18px] font-bold leading-6 text-white">Decide si construir directo o pedir contexto de verdad.</p>
                </div>

                <div
                  data-float
                  className="absolute -bottom-4 right-0 hidden max-w-[280px] rounded-[28px] border border-white/10 bg-[#f59e0b] p-5 text-[#121212] shadow-[0_30px_90px_rgba(245,158,11,0.35)] md:block"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#121212]/60">Critical UX</p>
                  <p className="mt-3 text-[19px] font-black leading-6">Si algo falla, el preview no deberia morir en silencio.</p>
                </div>
              </div>
            </div>

            <div className="border-y border-white/10 bg-black/35 py-4">
              <div className="overflow-hidden">
                <div className="flex min-w-max gap-3 whitespace-nowrap animate-[marqueeMove_24s_linear_infinite]">
                  {repeatedMarquee.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center gap-3 px-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/52">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="system" className="bg-[#0a0a0d] px-5 py-20 md:px-8 md:py-28">
            <div className="mx-auto max-w-[1320px]">
              <div className="max-w-[820px]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">What feels current</p>
                <h2 className="mt-4 text-[38px] font-black tracking-[-0.06em] text-white sm:text-[58px]">
                  Tipografia enorme, capas translúcidas, interfaces tipo control room y motion con intención.
                </h2>
                <p className="mt-5 max-w-[720px] text-[17px] leading-8 text-white/62">
                  Esa es la dirección que más se repite hoy en páginas de producto fuertes: narrativa editorial, fondos con profundidad,
                  secciones asimétricas, cards con carácter y una demo visual que explique el sistema sin parecer una plantilla genérica.
                </p>
              </div>

              <div className="mt-12 grid gap-5 lg:grid-cols-3">
                {featureBlocks.map((item) => {
                  const Icon = item.icon
                  return (
                    <article
                      key={item.title}
                      className="group relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/18"
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.tone}`} />
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Plury pattern</p>
                        <div className="rounded-2xl border border-white/10 bg-white/6 p-2 text-white/76">
                          <Icon size={18} />
                        </div>
                      </div>
                      <h3 className="mt-16 text-[28px] font-bold tracking-[-0.04em] text-white">{item.title}</h3>
                      <p className="mt-4 text-[15px] leading-7 text-white/60">{item.copy}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="orchestration" className="border-y border-white/10 bg-[#111114] px-5 py-20 md:px-8 md:py-28">
            <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#8b5cf6]">System Story</p>
                <h2 className="mt-4 text-[40px] font-black tracking-[-0.06em] text-white sm:text-[60px]">
                  Vende el mecanismo, no solo el resultado.
                </h2>
                <p className="mt-5 max-w-[520px] text-[17px] leading-8 text-white/62">
                  Tu ventaja no es una galería de outputs. Es el sistema que interpreta, coordina, construye, repara y deja el proyecto en un workspace usable.
                </p>
              </div>

              <div className="space-y-5">
                {stackCards.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
                      style={{ transform: `translateX(${index % 2 === 0 ? '0px' : '18px'})` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-[22px] bg-white p-3 text-[#111111]">
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">{item.label}</p>
                          <h3 className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-white">{item.title}</h3>
                          <p className="mt-3 max-w-[520px] text-[15px] leading-7 text-white/62">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="showcase" className="bg-[#070709] px-5 py-20 md:px-8 md:py-28">
            <div className="mx-auto max-w-[1320px]">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[38px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Hero direction</p>
                      <h3 className="mt-2 text-[30px] font-black tracking-[-0.05em] text-white">Una demo visual que parezca un producto premium, no una pantalla de admin cualquiera.</h3>
                    </div>
                    <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/60">
                      experimental
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[28px] border border-white/10 bg-black/25 p-5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#f59e0b]">Live architecture</p>
                      <div className="mt-5 space-y-3">
                        {[
                          'Prompt intent',
                          'Plan resolution',
                          'Code workspace',
                          'Preview + publish',
                        ].map((item) => (
                          <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[14px] text-white/78">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-[#f4efe5] p-5 text-[#111111]">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#111111]/45">Preview concept</p>
                        <div className="rounded-full bg-[#111111] px-3 py-1 text-[11px] font-semibold text-white">fashion commerce</div>
                      </div>
                      <div className="mt-6 rounded-[24px] bg-[#111111] p-5 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Hero</p>
                            <p className="mt-2 text-[24px] font-black tracking-[-0.05em]">New season / bold essentials</p>
                          </div>
                          <div className="rounded-2xl bg-[#f59e0b] p-3 text-[#111111]">
                            <ShoppingBag size={18} />
                          </div>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          {['Editorial product cards', 'Strong CTA blocks', 'Inventory state', 'Checkout summary'].map((item) => (
                            <div key={item} className="rounded-2xl bg-white/6 p-3 text-[12px] leading-5 text-white/70">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="rounded-[34px] border border-white/10 bg-[#121217] p-6">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">UI inventory</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[
                        'heroes cinematograficos',
                        'dashboard shells',
                        'pricing blocks',
                        'feature grids asimetricos',
                        'KPIs con densidad visual',
                        'CTA sections mas editoriales',
                      ].map((item) => (
                        <div key={item} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-[13px] font-medium text-white/72">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,#f59e0b_0%,#fb7185_100%)] p-[1px]">
                    <div className="rounded-[33px] bg-[#111114] p-6">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Current thesis</p>
                      <p className="mt-4 text-[28px] font-black tracking-[-0.05em] text-white">
                        Si Plury quiere verse contemporáneo, necesita parecer una pieza de producto ambiciosa, no una startup más de IA.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="cta" className="border-t border-white/10 bg-[#f3ece0] px-5 py-20 text-[#111111] md:px-8 md:py-28">
            <div className="mx-auto max-w-[1320px] rounded-[42px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(0,0,0,0.08)] lg:p-10">
              <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#c2410c]">Next move</p>
                  <h2 className="mt-4 text-[40px] font-black tracking-[-0.06em] sm:text-[62px]">
                    Esto ya se siente mas cerca de lo que hoy convierte.
                  </h2>
                  <p className="mt-5 max-w-[680px] text-[17px] leading-8 text-black/62">
                    La propuesta ahora se apoya en tipografía grande, motion sobrio, bloques más audaces y una narrativa centrada en cómo Plury entrega producto real.
                    Si quieres, el siguiente paso es hacer una V3 todavía más radical y orientada a conversión.
                  </p>
                </div>

                <div className="space-y-4 rounded-[34px] border border-black/10 bg-[#111111] p-6 text-white">
                  <div className="flex items-start gap-3">
                    <Bot size={18} className="mt-1 text-[#f59e0b]" />
                    <div>
                      <p className="text-[14px] font-semibold">Entrar con un caso fuerte</p>
                      <p className="mt-1 text-[13px] leading-6 text-white/60">
                        Usa un prompt real de ecommerce, CRM o sistema operativo y aterriza directo en el flujo.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => submitPrompt('Crea un ecommerce premium para mi tienda de zapatos con 100 productos, pasarela de pagos, stock, inventario y panel admin.')}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f59e0b] px-5 py-3 text-[13px] font-bold text-[#111111] transition hover:bg-[#fbbf24]"
                    >
                      Lanzar un proyecto
                      <ArrowRight size={15} />
                    </button>
                    <button
                      onClick={openLogin}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[13px] font-bold text-white transition hover:border-white/20 hover:bg-white/6"
                    >
                      Ver cuenta
                    </button>
                  </div>

                  <div className="grid gap-3 pt-2 sm:grid-cols-3">
                    {[
                      { icon: ShieldCheck, text: 'workspace persistente' },
                      { icon: Workflow, text: 'orchestration real' },
                      { icon: FileCode2, text: 'code editable' },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.text} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <Icon size={16} className="text-[#f59e0b]" />
                          <p className="mt-3 text-[12px] font-medium text-white/72">{item.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <LandingFooter />
        </main>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </div>
  )
}

export default LandingPageV2
