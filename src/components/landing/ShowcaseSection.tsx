import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ShowcaseApp {
  name: string
  author: string
  tags: string[]
  color: string
  url?: string
  img?: string
  lane?: 'branding' | 'contenido' | 'producto'
}

const laneMeta = {
  branding: {
    title: 'Branding',
    desc: 'Identidades, marcas y sistemas visuales nacidos desde una idea.',
  },
  contenido: {
    title: 'Contenido',
    desc: 'Mensajes, piezas y materiales para mover el proyecto hacia afuera.',
  },
  producto: {
    title: 'Producto',
    desc: 'Webs, apps y experiencias listas para mostrar, validar o lanzar.',
  },
} as const

const botTypeGradient: Record<string, string> = {
  web: 'from-[#a78bfa]/20 to-[#a78bfa]/5',
  dev: 'from-amber-500/20 to-orange-500/5',
  seo: 'from-blue-500/20 to-cyan-500/5',
  ads: 'from-emerald-500/20 to-green-500/5',
  video: 'from-red-500/20 to-pink-500/5',
  content: 'from-orange-500/20 to-red-500/5',
}

const fallbackApps: ShowcaseApp[] = [
  { name: 'Identidad para estudio creativo', author: '@sofia_brand', tags: ['Logo', 'Sistema'], color: 'from-pink-500/20 to-rose-500/5', lane: 'branding' },
  { name: 'Marca para e-commerce wellness', author: '@maria_design', tags: ['Brand', 'Retail'], color: 'from-[#a78bfa]/20 to-[#a78bfa]/5', lane: 'branding' },
  { name: 'Pack de anuncios para lanzamiento', author: '@growth_lab', tags: ['Ads', 'Copy'], color: 'from-emerald-500/20 to-green-500/5', lane: 'contenido' },
  { name: 'Secuencia de contenido SEO', author: '@content_ops', tags: ['SEO', 'Blog'], color: 'from-blue-500/20 to-cyan-500/5', lane: 'contenido' },
  { name: 'Landing para startup B2B', author: '@pablo_mk', tags: ['Landing', 'SaaS'], color: 'from-[#a78bfa]/20 to-[#a78bfa]/5', lane: 'producto' },
  { name: 'Dashboard para operacion interna', author: '@carlos_dev', tags: ['Dashboard', 'App'], color: 'from-amber-500/20 to-orange-500/5', lane: 'producto' },
]

const APP_DOMAIN = 'plury.co'

function inferLane(tags: string[], botType?: string): ShowcaseApp['lane'] {
  const tagsText = tags.join(' ').toLowerCase()
  if (botType === 'ads' || botType === 'seo' || botType === 'video' || botType === 'content') return 'contenido'
  if (botType === 'dev') return 'producto'
  if (tagsText.includes('logo') || tagsText.includes('brand') || tagsText.includes('branding')) return 'branding'
  if (tagsText.includes('seo') || tagsText.includes('ads') || tagsText.includes('copy') || tagsText.includes('video') || tagsText.includes('content')) return 'contenido'
  return 'producto'
}

const ShowcaseSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [apps, setApps] = useState<ShowcaseApp[]>(fallbackApps)

  useEffect(() => {
    fetch('/api/portfolio/public')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const real: ShowcaseApp[] = (data.deliverables || []).map((d: any) => {
          const tags = d.tags || ['Proyecto']
          return {
            name: d.title,
            author: `@${(d.authorName || 'anon').toLowerCase().replace(/\s+/g, '_')}`,
            tags,
            color: botTypeGradient[d.botType] || 'from-[#a78bfa]/20 to-[#a78bfa]/5',
            url: d.publishSlug ? `https://${d.publishSlug}.${APP_DOMAIN}` : undefined,
            img: d.thumbnailUrl || undefined,
            lane: inferLane(tags, d.botType),
          }
        })
        if (real.length >= 6) setApps(real.slice(0, 12))
        else if (real.length > 0) setApps([...real, ...fallbackApps.slice(0, 6 - real.length)])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.show-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [apps])

  const grouped = {
    branding: apps.filter(app => app.lane === 'branding').slice(0, 4),
    contenido: apps.filter(app => app.lane === 'contenido').slice(0, 4),
    producto: apps.filter(app => app.lane === 'producto').slice(0, 4),
  }

  return (
    <section ref={sectionRef} id="comunidad" className="py-20 sm:py-28 px-4">
      <div className="max-w-[1180px] mx-auto">
        <div className="space-y-10">
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((laneKey) => {
            const laneApps = grouped[laneKey]
            const lane = laneMeta[laneKey]
            return (
              <div key={laneKey} className="show-anim">
                <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-[-0.02em] text-white">{lane.title}</h3>
                    <p className="text-[13px] text-zinc-500">{lane.desc}</p>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Proyectos reales</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {laneApps.map((app, i) => {
                    const Wrapper = app.url ? 'a' : 'div'
                    const linkProps = app.url ? { href: app.url, target: '_blank' as const, rel: 'noopener noreferrer' } : {}
                    return (
                      <Wrapper
                        key={`${laneKey}-${app.name}-${i}`}
                        {...linkProps}
                        className="group cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-white/[0.12]"
                      >
                        <div className="relative h-[148px] overflow-hidden bg-gradient-to-br from-black/60 to-black/30">
                          {app.img ? (
                            <img src={app.img} alt={app.name} className="h-full w-full object-cover object-top opacity-90 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
                          ) : (
                            <div className={`h-full w-full bg-gradient-to-br ${app.color}`} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
                          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
                            <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
                              {lane.title}
                            </span>
                            {app.url && <ExternalLink size={13} className="text-white/0 transition-colors group-hover:text-white/60" />}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                            {app.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-md">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="mb-1 text-[13.5px] font-semibold text-white">{app.name}</h4>
                          <p className="text-[11.5px] text-zinc-600">Por {app.author}</p>
                        </div>
                      </Wrapper>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ShowcaseSection
