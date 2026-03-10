import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface Project {
  name: string
  author: string
  tag: string
  img: string
  color: string
  url?: string
}

const fallbackProjects: Project[] = [
  { name: 'Landing Restaurante Gourmet', author: 'Code + Pixel', tag: 'Landing', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80', color: 'from-[#a78bfa]/30' },
  { name: 'Dashboard Analytics SaaS', author: 'Code', tag: 'SaaS', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80', color: 'from-blue-500/30' },
  { name: 'Logo Minimalista Tech', author: 'Pixel', tag: 'Logo', img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80', color: 'from-pink-500/30' },
  { name: 'Tienda de Moda Online', author: 'Code + Pixel', tag: 'E-commerce', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80', color: 'from-amber-500/30' },
  { name: 'Landing Inmobiliaria', author: 'Code + Pixel', tag: 'Landing', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80', color: 'from-emerald-500/30' },
  { name: 'Campana Meta Ads Fitness', author: 'Metric', tag: 'Ads', img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80', color: 'from-cyan-500/30' },
  { name: 'Blog Posts SEO Pack', author: 'Pluma + Lupa', tag: 'Contenido', img: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80', color: 'from-orange-500/30' },
  { name: 'App Gestion Proyectos', author: 'Code', tag: 'SaaS', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80', color: 'from-violet-500/30' },
]

const botGradient: Record<string, string> = {
  dev: 'from-amber-500/30', web: 'from-[#a78bfa]/30', seo: 'from-blue-500/30',
  ads: 'from-emerald-500/30', video: 'from-red-500/30', content: 'from-orange-500/30',
}

const tagByBot: Record<string, string> = {
  dev: 'App', web: 'Web', seo: 'SEO', ads: 'Ads', video: 'Video', content: 'Contenido',
}

const categoryImages: Record<string, string[]> = {
  dev: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
  ],
  web: [
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&q=80',
  ],
  seo: ['https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80'],
  ads: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80'],
  video: ['https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&q=80'],
  content: ['https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80'],
}

const APP_DOMAIN = 'plury.co'

const CommunityCarousel = ({ onShowGallery }: { onShowGallery?: () => void }) => {
  const row1Ref = useRef<HTMLDivElement>(null)
  const row2Ref = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [projects, setProjects] = useState<Project[]>(fallbackProjects)

  // Fetch real public projects from the API
  useEffect(() => {
    fetch('/api/portfolio/public')
      .then(r => r.ok ? r.json() : { deliverables: [] })
      .then((resp: { deliverables: { id: string; title: string; publishSlug: string | null; thumbnailUrl: string | null; authorName: string; botType: string }[] }) => {
        const data = resp.deliverables || []
        if (data.length === 0) return
        const mapped: Project[] = data.slice(0, 8).map((d, i) => {
          const fallbackImages = categoryImages[d.botType] || categoryImages.web
          return {
            name: d.title.replace(/^(Code|Web|SEO|Ads|Video|Content):\s*/i, '').slice(0, 50),
            author: d.authorName || 'Plury',
            tag: tagByBot[d.botType] || 'Proyecto',
            img: d.thumbnailUrl || fallbackImages[i % fallbackImages.length],
            color: botGradient[d.botType] || 'from-[#a78bfa]/30',
            url: d.publishSlug ? `https://${d.publishSlug}.${APP_DOMAIN}` : undefined,
          }
        })
        // Fill with fallbacks if we have less than 8
        while (mapped.length < 8) {
          mapped.push(fallbackProjects[mapped.length % fallbackProjects.length])
        }
        setProjects(mapped)
      })
      .catch(() => { /* keep fallback */ })
  }, [])

  const row1 = projects.slice(0, 4)
  const row2 = projects.slice(4, 8)

  useEffect(() => {
    const r1 = row1Ref.current
    const r2 = row2Ref.current
    if (!r1 || !r2) return

    // Row 1: left to right (starts offset left, moves right)
    const tl1 = gsap.to(r1, {
      x: () => -(r1.scrollWidth - r1.parentElement!.clientWidth),
      ease: 'none',
      duration: 30,
      repeat: -1,
      yoyo: true,
    })

    // Row 2: right to left (starts offset right, moves left)
    gsap.set(r2, { x: () => -(r2.scrollWidth - r2.parentElement!.clientWidth) })
    const tl2 = gsap.to(r2, {
      x: 0,
      ease: 'none',
      duration: 30,
      repeat: -1,
      yoyo: true,
    })

    // Pause on hover
    const pause = () => { tl1.pause(); tl2.pause() }
    const play = () => { tl1.play(); tl2.play() }
    const section = sectionRef.current
    section?.addEventListener('mouseenter', pause)
    section?.addEventListener('mouseleave', play)

    return () => {
      tl1.kill(); tl2.kill()
      section?.removeEventListener('mouseenter', pause)
      section?.removeEventListener('mouseleave', play)
    }
  }, [projects])

  const Card = ({ p }: { p: Project }) => {
    const inner = (
      <div className="flex-shrink-0 w-[320px] sm:w-[360px] group cursor-pointer">
        <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-zinc-900">
          <img src={p.img} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <span className="absolute top-3 left-3 text-[10px] font-semibold bg-black/50 backdrop-blur-md text-white/90 px-2.5 py-1 rounded-full">{p.tag}</span>
        </div>
        <div className="mt-3 px-1">
          <h3 className="text-[14px] font-semibold text-white group-hover:text-[#43f1f2] transition-colors">{p.name}</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">Hecho por <span className="text-zinc-400 font-medium">{p.author}</span></p>
        </div>
      </div>
    )
    if (p.url) {
      return <a href={p.url} target="_blank" rel="noopener noreferrer">{inner}</a>
    }
    return inner
  }

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 mb-10">
        <p className="text-[12px] text-[#43f1f2] uppercase tracking-[0.15em] font-semibold mb-3 text-center">Comunidad</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.025em] text-white text-center mb-2">Lo ultimo que ha creado nuestra comunidad</h2>
        <p className="text-[15px] text-zinc-500 text-center">Proyectos reales creados con Plury por personas como tu.</p>
      </div>

      {/* Row 1 → left to right */}
      <div className="mb-6 overflow-hidden">
        <div ref={row1Ref} className="flex gap-5 px-6 w-max">
          {[...row1, ...row1].map((p, i) => <Card key={`r1-${i}`} p={p} />)}
        </div>
      </div>

      {/* Row 2 → right to left */}
      <div className="overflow-hidden">
        <div ref={row2Ref} className="flex gap-5 px-6 w-max">
          {[...row2, ...row2].map((p, i) => <Card key={`r2-${i}`} p={p} />)}
        </div>
      </div>

      <div className="text-center mt-10">
        <button
          onClick={onShowGallery}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/[0.15] px-6 py-2.5 rounded-full transition-all"
        >
          Ver mas proyectos
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </section>
  )
}

export default CommunityCarousel
