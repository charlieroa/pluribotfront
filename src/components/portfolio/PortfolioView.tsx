import { useState, useEffect } from 'react'
import { Search, Sparkles, ArrowRight, ExternalLink } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'

interface PortfolioViewProps {
  onContactBot: (prompt: string) => void
}

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'landing', label: 'Landing page' },
  { id: 'ads', label: 'Ads' },
  { id: 'branding', label: 'Branding' },
  { id: 'social', label: 'Social' },
  { id: 'seo', label: 'SEO' },
  { id: 'web', label: 'Web' },
  { id: 'video', label: 'Video' },
]

const examples = [
  {
    id: 1,
    title: 'Landing page con reservas online',
    desc: 'Sitio completo para un salón de belleza con formulario de reservas, galería y testimonios.',
    gradientFrom: '#a855f7',
    gradientTo: '#7c3aed',
    bots: [{ name: 'Pixel', color: '#a855f7' }, { name: 'Logic', color: '#f59e0b' }],
    type: 'Landing page',
    categoryId: 'landing',
    typeColor: 'text-purple-600 bg-purple-500/10',
    prompt: 'Crea una landing page para un salón de belleza con reservas online',
  },
  {
    id: 2,
    title: 'Campaña Meta Ads con 5 variantes de copy',
    desc: 'Estrategia de publicidad para app de fitness con segmentación y copys A/B.',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    bots: [{ name: 'Metric', color: '#10b981' }],
    type: 'Ads',
    categoryId: 'ads',
    typeColor: 'text-emerald-600 bg-emerald-500/10',
    prompt: 'Crea una campaña de Meta Ads para una app de fitness',
  },
  {
    id: 3,
    title: 'Logo, paleta de colores y branding completo',
    desc: 'Identidad visual completa para una cafetería artesanal: logo, tipografía y manual.',
    gradientFrom: '#d97706',
    gradientTo: '#b45309',
    bots: [{ name: 'Nova', color: '#ec4899' }],
    type: 'Branding',
    categoryId: 'branding',
    typeColor: 'text-amber-600 bg-amber-500/10',
    prompt: 'Diseña un branding completo para una cafetería artesanal',
  },
  {
    id: 4,
    title: 'Auditoría SEO + plan de keywords',
    desc: 'Análisis completo de SEO on-page, off-page, keywords y plan de acción.',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    bots: [{ name: 'Lupa', color: '#3b82f6' }],
    type: 'SEO',
    categoryId: 'seo',
    typeColor: 'text-blue-600 bg-blue-500/10',
    prompt: 'Haz una auditoría SEO completa de mi sitio web',
  },
  {
    id: 5,
    title: 'E-commerce con catálogo interactivo',
    desc: 'Sitio web de tienda online con filtros, carrito de compras y diseño responsivo.',
    gradientFrom: '#8b5cf6',
    gradientTo: '#7c3aed',
    bots: [{ name: 'Logic', color: '#f59e0b' }, { name: 'Pixel', color: '#a855f7' }],
    type: 'Web',
    categoryId: 'web',
    typeColor: 'text-violet-600 bg-violet-500/10',
    prompt: 'Construye un sitio e-commerce con catálogo de productos',
  },
  {
    id: 6,
    title: 'Reel promocional + stories animados',
    desc: 'Video de 30 segundos para producto + 3 stories con animaciones para Instagram.',
    gradientFrom: '#ef4444',
    gradientTo: '#dc2626',
    bots: [{ name: 'Reel', color: '#ef4444' }],
    type: 'Video',
    categoryId: 'video',
    typeColor: 'text-rose-600 bg-rose-500/10',
    prompt: 'Crea un reel promocional de 30 segundos para mi producto',
  },
  {
    id: 7,
    title: 'Landing + Google Ads para suscripción',
    desc: 'Página de captura de leads con formulario y campaña de Google Ads integrada.',
    gradientFrom: '#f59e0b',
    gradientTo: '#ea580c',
    bots: [{ name: 'Logic', color: '#f59e0b' }, { name: 'Metric', color: '#10b981' }],
    type: 'Landing page',
    categoryId: 'landing',
    typeColor: 'text-purple-600 bg-purple-500/10',
    prompt: 'Crea una landing de suscripción con campaña de Google Ads',
  },
  {
    id: 8,
    title: 'Pack de 10 posts Instagram + stories',
    desc: 'Diseños para redes sociales: 10 posts y 5 stories para lanzamiento de producto.',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    bots: [{ name: 'Spark', color: '#f97316' }],
    type: 'Social',
    categoryId: 'social',
    typeColor: 'text-orange-600 bg-orange-500/10',
    prompt: 'Diseña 10 posts de Instagram para el lanzamiento de mi producto',
  },
]

interface PublicProject {
  id: string
  title: string
  type: string
  agent: string
  botType: string
  netlifyUrl: string | null
  shareSlug: string | null
  createdAt: string
}

const botColorMap: Record<string, string> = {
  dev: '#f59e0b',
  brand: '#ec4899',
  web: '#a855f7',
  seo: '#3b82f6',
  ads: '#10b981',
  social: '#f97316',
  video: '#ef4444',
}

const PortfolioView = ({ onContactBot }: PortfolioViewProps) => {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [publicProjects, setPublicProjects] = useState<PublicProject[]>([])

  // Fetch real public projects
  useEffect(() => {
    fetch('/api/portfolio/public')
      .then(r => r.ok ? r.json() : { deliverables: [] })
      .then(data => setPublicProjects(data.deliverables ?? []))
      .catch(() => setPublicProjects([]))
  }, [])

  const filtered = examples.filter(w => {
    const matchCategory = activeCategory === 'all' || w.categoryId === activeCategory
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || w.type.toLowerCase().includes(q) || w.title.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q)
    return matchCategory && matchSearch
  })

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-page">
      <div className="max-w-6xl mx-auto py-8 px-4 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Ejemplos de proyectos</h1>
              <p className="text-sm text-ink-faint">Ideas de lo que puedes crear con nuestros agentes de IA</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Buscar por tipo de trabajo o descripción..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface border border-edge rounded-xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'bg-surface text-ink-light border border-edge hover:border-primary/30 hover:text-ink'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm font-bold text-ink mb-4">
          {activeCategory === 'all' ? 'Todos los ejemplos' : categories.find(c => c.id === activeCategory)?.label}
          <span className="text-ink-faint font-normal ml-2">({filtered.length})</span>
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(work => (
            <div
              key={work.id}
              className="group relative bg-surface rounded-2xl border border-edge hover:border-primary/30 transition-all overflow-hidden hover:shadow-lg"
            >
              {/* Hero area with gradient */}
              <div
                className="relative h-32 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${work.gradientFrom}, ${work.gradientTo})` }}
              >
                <span className="text-4xl font-black text-white/20 select-none">{work.type}</span>
                {/* Type badge */}
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/90 ${work.typeColor.split(' ')[0]}`}>
                  {work.type}
                </span>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <button
                    onClick={() => onContactBot(work.prompt)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg"
                  >
                    <Sparkles size={13} />
                    Crear algo similar
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-base font-bold text-ink mb-1">{work.title}</h3>
                <p className="text-sm text-ink-light leading-relaxed mb-3 line-clamp-2">{work.desc}</p>

                {/* Bots involved */}
                <div className="flex items-center gap-1.5">
                  {work.bots.map(bot => (
                    <div key={bot.name} className="flex items-center gap-1.5 pr-2">
                      <BotAvatar3D seed={bot.name} color={bot.color} isActive={false} size="sm" />
                      <span className="text-[11px] font-semibold text-ink-faint">{bot.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Real community projects */}
        {publicProjects.length > 0 && (
          <>
            <div className="mt-12 mb-4">
              <h2 className="text-lg font-bold text-ink">Proyectos de la comunidad</h2>
              <p className="text-sm text-ink-faint">Proyectos reales creados por usuarios de Pluribots</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicProjects.map(project => {
                const color = botColorMap[project.botType] || '#6366f1'
                return (
                  <div
                    key={project.id}
                    className="group relative bg-surface rounded-2xl border border-edge hover:border-primary/30 transition-all overflow-hidden hover:shadow-lg"
                  >
                    <div
                      className="relative h-24 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${color}88, ${color})` }}
                    >
                      <span className="text-3xl font-black text-white/20 select-none">{project.type}</span>
                      <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/90 text-slate-700">
                        {project.type}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-ink mb-1 line-clamp-1">{project.title}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <BotAvatar3D seed={project.agent} color={color} isActive={false} size="sm" />
                          <span className="text-[11px] font-semibold text-ink-faint">{project.agent}</span>
                        </div>
                        <div className="flex gap-1.5">
                          {project.netlifyUrl && (
                            <a
                              href={project.netlifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 rounded-md hover:bg-emerald-500/20 transition-colors"
                            >
                              <ExternalLink size={10} /> Ver
                            </a>
                          )}
                          <button
                            onClick={() => onContactBot(`Crea algo similar a: ${project.title}`)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                          >
                            <Sparkles size={10} /> Crear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Sparkles size={32} className="text-ink-faint mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink-faint">No se encontraron ejemplos</p>
            <p className="text-xs text-ink-faint mt-1">Intenta con otro filtro o búsqueda</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 p-6 rounded-2xl border-2 border-dashed border-edge text-center">
          <Sparkles size={24} className="text-primary mx-auto mb-3" />
          <h3 className="text-sm font-bold text-ink mb-1">Tu proyecto puede ser el próximo</h3>
          <p className="text-xs text-ink-faint max-w-md mx-auto mb-4">
            Nuestros agentes están listos para crear logos, landing pages, campañas de ads, videos y mucho más para tu negocio.
          </p>
          <button
            onClick={() => onContactBot('Quiero crear un proyecto para mi negocio')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-fg text-xs font-bold rounded-lg hover:opacity-90 transition-all"
          >
            Empezar proyecto
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PortfolioView
