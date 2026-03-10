import { useEffect, useRef } from 'react'
import { Layout, Code2, Palette, Globe, BarChart3, Search, Film, TrendingUp } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const templates = [
  { title: 'Landing Page', desc: 'Páginas de venta con diseño moderno y responsive.', icon: Layout, gradient: 'from-[#a78bfa]/20 to-[#a78bfa]/5' },
  { title: 'E-commerce Store', desc: 'Tiendas online con catálogo, carrito y checkout.', icon: Code2, gradient: 'from-blue-500/20 to-cyan-500/5' },
  { title: 'Portfolio Personal', desc: 'Sitio minimalista para mostrar tu trabajo.', icon: Palette, gradient: 'from-pink-500/20 to-rose-500/5' },
  { title: 'Blog / Magazine', desc: 'Blog con diseño elegante y sistema de posts.', icon: Globe, gradient: 'from-emerald-500/20 to-green-500/5' },
  { title: 'Dashboard App', desc: 'Paneles con gráficos, métricas y tablas.', icon: BarChart3, gradient: 'from-amber-500/20 to-yellow-500/5' },
  { title: 'Campaña de Ads', desc: 'Creativos y copy para Meta y Google Ads.', icon: TrendingUp, gradient: 'from-cyan-500/20 to-teal-500/5' },
  { title: 'Estrategia SEO', desc: 'Auditoría, keywords y plan de contenido.', icon: Search, gradient: 'from-[#a78bfa]/20 to-[#a78bfa]/5' },
  { title: 'Video Promocional', desc: 'Reels y videos cortos generados con IA.', icon: Film, gradient: 'from-red-500/20 to-orange-500/5' },
]

const AgentShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || !titleRef.current || !gridRef.current) return

    const anims: gsap.core.Tween[] = []

    anims.push(gsap.fromTo(titleRef.current, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.8,
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    }))

    anims.push(gsap.fromTo(Array.from(gridRef.current.children), { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: gridRef.current, start: 'top 85%', scroller: '#landing-scroll' },
    }))

    return () => {
      anims.forEach(a => a.kill())
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 px-4 bg-zinc-950/50">
      <div className="max-w-[1100px] mx-auto">
        <div ref={titleRef} style={{ opacity: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-14 gap-4">
          <div>
            <p className="text-[12px] text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-3">Plantillas</p>
            <h2 className="text-[34px] sm:text-[44px] font-bold tracking-[-0.025em] text-white mb-2">Empieza con una plantilla</h2>
            <p className="text-[16px] text-zinc-400 max-w-lg">Empieza tu próximo proyecto con una plantilla o describe lo que necesitas.</p>
          </div>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={i}
                style={{ opacity: 0 }}
                className="group cursor-pointer bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.05] transition-all hover:-translate-y-1"
              >
                <div className={`w-full h-[120px] bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                  <Icon size={30} className="text-white/30 group-hover:text-white/50 group-hover:scale-110 transition-all duration-300" />
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-[12.5px] text-zinc-500 leading-[1.5]">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default AgentShowcase
