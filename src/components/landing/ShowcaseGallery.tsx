import { useEffect, useState, useMemo } from 'react'
import { ArrowLeft, ExternalLink, Search, X } from 'lucide-react'

interface ShowcaseProject {
  id: string
  title: string
  publishSlug: string | null
  thumbnailUrl: string | null
  authorName: string
  tags: string[]
  botType: string
  createdAt: string
}

const APP_DOMAIN = 'plury.co'
const FALLBACK_THUMB = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="%230b0b10"/><rect x="28" y="28" width="584" height="344" rx="28" fill="%23161722"/><rect x="54" y="250" width="220" height="18" rx="9" fill="%23222b3a"/><rect x="54" y="282" width="320" height="14" rx="7" fill="%23222b3a"/><rect x="54" y="70" width="120" height="120" rx="24" fill="%23222b3a"/></svg>'

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'dev', label: 'Apps & SaaS' },
  { id: 'web', label: 'Diseno Web' },
  { id: 'image', label: 'Logos & Imagenes' },
  { id: 'seo', label: 'SEO' },
  { id: 'ads', label: 'Ads & Marketing' },
  { id: 'video', label: 'Video' },
]

const botColor: Record<string, string> = {
  dev: '#f59e0b',
  web: '#a855f7',
  image: '#8b5cf6',
  seo: '#3b82f6',
  ads: '#10b981',
  video: '#ef4444',
  content: '#f97316',
}

const botLabel: Record<string, string> = {
  dev: 'Code',
  web: 'Pixel',
  image: 'Logos & Imagenes',
  seo: 'Lupa',
  ads: 'Metric',
  video: 'Reel',
  content: 'Pluma',
}

// Placeholder images by category for the cards
const categoryImages: Record<string, string[]> = {
  dev: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1556740758-90de940099b7?w=600&h=400&fit=crop',
  ],
  web: [
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
  ],
  seo: [
    'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop',
  ],
  ads: [
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=600&h=400&fit=crop',
  ],
  video: [
    'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=600&h=400&fit=crop',
  ],
}

function getProjectImage(project: ShowcaseProject, index: number): string {
  if (project.thumbnailUrl) return project.thumbnailUrl
  const imgs = categoryImages[project.botType] || categoryImages.dev
  return imgs[index % imgs.length]
}

interface ShowcaseGalleryProps {
  onBack: () => void
}

const ShowcaseGallery = ({ onBack }: ShowcaseGalleryProps) => {
  const [projects, setProjects] = useState<ShowcaseProject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/portfolio/public').then(r => r.ok ? r.json() : { deliverables: [] }),
      fetch('/api/community/images').then(r => r.ok ? r.json() : []),
    ]).then(([data, communityImgs]) => {
      const portfolioProjects: ShowcaseProject[] = data.deliverables || []
      // Convert community images to ShowcaseProject format
      const communityProjects: ShowcaseProject[] = (communityImgs || []).map((img: any) => ({
        id: img.id,
        title: img.prompt || 'Imagen generada',
        publishSlug: null,
        thumbnailUrl: img.imageUrl,
        authorName: img.authorName || 'Comunidad',
        tags: [img.model || 'imagen'],
        botType: 'image',
        createdAt: img.createdAt,
      }))
      setProjects([...portfolioProjects, ...communityProjects])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = projects
    if (activeCategory !== 'all') {
      list = list.filter(p => p.botType === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)))
    }
    return list
  }, [projects, activeCategory, search])

  // Group by botType for Netflix-style rows
  const grouped = useMemo(() => {
    if (activeCategory !== 'all' || search.trim()) return null
    const groups: Record<string, ShowcaseProject[]> = {}
    for (const p of projects) {
      if (!groups[p.botType]) groups[p.botType] = []
      groups[p.botType].push(p)
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0)
  }, [projects, activeCategory, search])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Hecho con Plury</h1>
            <p className="text-xs text-zinc-500">Proyectos creados por nuestra comunidad</p>
          </div>
          {/* Search */}
          <div className="relative w-64 hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proyectos..."
              className="w-full pl-9 pr-8 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="max-w-[1400px] mx-auto px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-white text-black'
                  : 'bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/10] bg-white/[0.04] rounded-xl" />
                <div className="mt-3 h-3 bg-white/[0.04] rounded w-3/4" />
                <div className="mt-1.5 h-2.5 bg-white/[0.03] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">Aun no hay proyectos publicos.</p>
            <p className="text-zinc-600 text-sm mt-1">Se el primero en compartir tu trabajo con la comunidad.</p>
          </div>
        ) : grouped && !search.trim() ? (
          /* Netflix-style rows by category */
          <div className="space-y-10">
            {grouped.map(([botType, items]) => (
              <div key={botType}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: botColor[botType] || '#6b7280' }} />
                  <h2 className="text-lg font-bold text-white">{botLabel[botType] || botType}</h2>
                  <span className="text-xs text-zinc-600 font-medium">{items.length} proyecto{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {items.map((p, i) => (
                    <ProjectCard key={p.id} project={p} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat grid when filtering */
          <>
            {filtered.length === 0 ? (
              <p className="text-center text-zinc-500 py-16">No se encontraron proyectos para "{search || activeCategory}"</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filtered.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const ProjectCard = ({ project, index }: { project: ShowcaseProject; index: number }) => {
  const url = project.publishSlug ? `https://${project.publishSlug}.${APP_DOMAIN}` : null
  const color = botColor[project.botType] || '#6b7280'
  const img = getProjectImage(project, index)

  const Wrapper = url ? 'a' : 'div'
  const linkProps = url ? { href: url, target: '_blank' as const, rel: 'noopener noreferrer' } : {}

  return (
    <Wrapper
      {...linkProps}
      className="group cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.06] group-hover:border-white/[0.15] transition-all">
        <img
          src={img}
          alt={project.title}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
          onError={(e) => {
            const image = e.currentTarget
            image.onerror = null
            image.src = FALLBACK_THUMB
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        {/* Tags */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {project.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] font-semibold bg-black/50 backdrop-blur-md text-white/90 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
        {/* Open link icon */}
        {url && (
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <ExternalLink size={12} className="text-white/80" />
            </div>
          </div>
        )}
        {/* Agent badge */}
        <div className="absolute bottom-2.5 right-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
            {(botLabel[project.botType] || '?')[0]}
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-[13px] font-semibold text-white group-hover:text-[#43f1f2] transition-colors truncate">{project.title}</h3>
        <p className="text-[11px] text-zinc-600 mt-0.5">Por <span className="text-zinc-500">{project.authorName}</span></p>
      </div>
    </Wrapper>
  )
}

export default ShowcaseGallery
