import { useEffect, useRef } from 'react'
import { Layers3, PenTool, MonitorSmartphone, Megaphone, Sparkles, Workflow } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Layers3,
    title: 'Branding, contenido y producto unidos',
    desc: 'La misma idea puede terminar en identidad visual, mensajes, piezas y una web o app sin rehacer el proceso.',
    accent: 'from-[#a78bfa] to-[#8b5cf6]',
    span: true,
  },
  {
    icon: PenTool,
    title: 'Branding listo para usar',
    desc: 'Logo, tono, sistema visual y piezas base para darle forma al proyecto desde el principio.',
    accent: 'from-pink-500 to-rose-500',
  },
  {
    icon: Sparkles,
    title: 'Contenido para salir a mercado',
    desc: 'Copies, anuncios, mensajes y assets para presentar, vender o comunicar lo que estas construyendo.',
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MonitorSmartphone,
    title: 'Webs y apps dentro del mismo flujo',
    desc: 'Landing pages, sitios y productos digitales sin cambiar de herramienta ni perder continuidad.',
    accent: 'from-emerald-500 to-green-500',
  },
  {
    icon: Megaphone,
    title: 'Lanzamiento y distribucion',
    desc: 'Activos para poner el proyecto afuera: campanas, piezas y entregables listos para publicar.',
    accent: 'from-red-500 to-orange-500',
  },
  {
    icon: Workflow,
    title: 'Un sistema para iterar',
    desc: 'Cambias, corriges y escalas desde el mismo lugar. Si hace falta, pides respaldo humano sin romper el flujo.',
    accent: 'from-amber-500 to-yellow-500',
  },
]

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.feat-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 35 }, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} id="soluciones" className="py-20 sm:py-28 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="feat-anim text-center mb-16">
          <p className="text-[12px] text-[#a78bfa] uppercase tracking-[0.15em] font-semibold mb-3">Que es Plury</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.03em] text-white mb-4">
            Una plataforma para construir
            <br />
            proyectos digitales completos
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-2xl mx-auto">
            Empiezas con una idea y Plury coordina lo necesario para volverla marca, contenido y producto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                className={`feat-anim group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all cursor-default ${feat.span ? 'sm:col-span-2 lg:col-span-1' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feat.accent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-1.5">{feat.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-[1.6]">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
