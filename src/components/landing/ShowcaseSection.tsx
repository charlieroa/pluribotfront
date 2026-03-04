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
}

const botTypeGradient: Record<string, string> = {
  web: 'from-purple-500/20 to-violet-500/5',
  dev: 'from-amber-500/20 to-orange-500/5',
  seo: 'from-blue-500/20 to-cyan-500/5',
  ads: 'from-emerald-500/20 to-green-500/5',
  video: 'from-red-500/20 to-pink-500/5',
}

const fallbackApps: ShowcaseApp[] = [
  { name: 'CRM Inmobiliario', author: '@carlos_dev', tags: ['SaaS', 'Dashboard'], color: 'from-blue-500/20 to-cyan-500/5' },
  { name: 'Tienda Organica', author: '@sara_design', tags: ['E-commerce', 'Food'], color: 'from-emerald-500/20 to-green-500/5' },
  { name: 'Portfolio Fotografo', author: '@luisphoto', tags: ['Portfolio', 'Minimal'], color: 'from-pink-500/20 to-rose-500/5' },
  { name: 'App de Reservas', author: '@maria_ux', tags: ['Booking', 'App'], color: 'from-purple-500/20 to-indigo-500/5' },
  { name: 'Dashboard Finanzas', author: '@fintech_bro', tags: ['Finanzas', 'Charts'], color: 'from-amber-500/20 to-yellow-500/5' },
  { name: 'Landing Startup', author: '@pablo_mk', tags: ['Landing', 'SaaS'], color: 'from-violet-500/20 to-purple-500/5' },
  { name: 'Blog de Cocina', author: '@chef_ana', tags: ['Blog', 'Food'], color: 'from-orange-500/20 to-red-500/5' },
  { name: 'Gym Tracker', author: '@fit_dev', tags: ['Health', 'Mobile'], color: 'from-cyan-500/20 to-teal-500/5' },
]

const APP_DOMAIN = 'plury.co'

const ShowcaseSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [apps, setApps] = useState<ShowcaseApp[]>(fallbackApps)

  useEffect(() => {
    fetch('/api/portfolio/public')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const real: ShowcaseApp[] = (data.deliverables || []).map((d: any) => ({
          name: d.title,
          author: `@${(d.authorName || 'anon').toLowerCase().replace(/\s+/g, '_')}`,
          tags: d.tags || ['Proyecto'],
          color: botTypeGradient[d.botType] || 'from-purple-500/20 to-violet-500/5',
          url: d.publishSlug ? `https://${d.publishSlug}.${APP_DOMAIN}` : undefined,
        }))
        if (real.length >= 4) setApps(real.slice(0, 8))
        else if (real.length > 0) setApps([...real, ...fallbackApps.slice(0, 8 - real.length)])
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

  return (
    <section ref={sectionRef} id="comunidad" className="py-20 sm:py-28 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="show-anim text-center mb-14">
          <p className="text-[12px] text-purple-400 uppercase tracking-[0.15em] font-semibold mb-3">Comunidad</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.025em] text-white mb-3">Hecho con Plury</h2>
          <p className="text-[16px] text-zinc-400 max-w-lg mx-auto">Proyectos reales creados por nuestra comunidad.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {apps.map((app, i) => {
            const Wrapper = app.url ? 'a' : 'div'
            const linkProps = app.url ? { href: app.url, target: '_blank' as const, rel: 'noopener noreferrer' } : {}
            return (
              <Wrapper
                key={`${app.name}-${i}`}
                {...linkProps}
                className="show-anim group cursor-pointer bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:-translate-y-1 transition-all"
              >
                <div className={`h-[100px] bg-gradient-to-br ${app.color} p-3 flex items-end justify-between`}>
                  <div className="flex gap-1.5">
                    {app.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-black/40 text-white/80 px-2 py-0.5 rounded-full backdrop-blur-md font-medium">{tag}</span>
                    ))}
                  </div>
                  {app.url && <ExternalLink size={13} className="text-white/0 group-hover:text-white/60 transition-colors" />}
                </div>
                <div className="p-4">
                  <h3 className="text-[13.5px] font-semibold text-white mb-0.5">{app.name}</h3>
                  <p className="text-[11.5px] text-zinc-600">Por {app.author}</p>
                </div>
              </Wrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ShowcaseSection
