import { useEffect, useRef } from 'react'
import { Globe, Palette, Search, Film, TrendingUp, Code2, Zap, ShoppingBag, MessageSquare } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Code2,
    title: 'Webs y apps en segundos',
    desc: 'Como Lovable o v0, pero en espanol y con todo tu equipo creativo incluido. Genera aplicaciones completas con HTML, CSS, JS y despliegalas al instante.',
    accent: 'from-[#a78bfa] to-[#8b5cf6]',
    span: true,
  },
  {
    icon: Palette,
    title: 'Branding completo',
    desc: 'Logos, paletas de color, tipografia y manual de marca generados con IA en minutos.',
    accent: 'from-pink-500 to-rose-500',
  },
  {
    icon: Search,
    title: 'Auditoria SEO',
    desc: 'Analisis tecnico, keywords, backlinks y plan de contenido optimizado para rankear.',
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    icon: TrendingUp,
    title: 'Campanas de ads',
    desc: 'Creativos, copy y segmentacion para Meta Ads y Google Ads listos para publicar.',
    accent: 'from-emerald-500 to-green-500',
  },
  {
    icon: Film,
    title: 'Video con IA',
    desc: 'Reels, spots y videos promocionales generados con secuencias de nodos.',
    accent: 'from-red-500 to-orange-500',
  },
  {
    icon: ShoppingBag,
    title: 'Conexion e-commerce',
    desc: 'Conecta Shopify, WordPress o WooCommerce. Genera tiendas completas listas para vender.',
    accent: 'from-amber-500 to-yellow-500',
  },
  {
    icon: Globe,
    title: 'Deploy con dominio propio',
    desc: 'Un click y tu app esta live. Dominio personalizado, SSL y hosting incluido.',
    accent: 'from-[#a78bfa] to-[#a78bfa]',
  },
  {
    icon: MessageSquare,
    title: 'Pide por WhatsApp',
    desc: 'Envia tu pedido por WhatsApp y los agentes trabajan para ti. Recibe resultados directo al chat.',
    accent: 'from-green-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: 'Edicion visual en vivo',
    desc: 'Ajusta colores, textos e imagenes con controles visuales. Preview en tiempo real.',
    accent: 'from-cyan-500 to-blue-500',
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
          <p className="text-[12px] text-[#a78bfa] uppercase tracking-[0.15em] font-semibold mb-3">Soluciones</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.03em] text-white mb-4">
            Todo tu negocio digital en un solo lugar
          </h2>
          <p className="text-[16px] text-zinc-400 max-w-lg mx-auto">
            9 capacidades. 7 agentes especializados. Una sola plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => {
            const Icon = feat.icon
            return (
              <div
                key={i}
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
