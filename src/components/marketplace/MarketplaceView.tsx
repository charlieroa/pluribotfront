import { useState } from 'react'
import { Search, Layout, TrendingUp, Code, Film, Star, ArrowRight, Zap, Eye, MessageSquare, Sparkles, Power } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import { useAuth } from '../../contexts/AuthContext'

interface MarketplaceViewProps {
  onUseBot: (prompt: string) => void
}

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'diseno', label: 'Diseno' },
  { id: 'desarrollo', label: 'Desarrollo' },
  { id: 'contenido', label: 'Contenido' },
]

const bots = [
  {
    id: 'seo',
    name: 'Lupa',
    role: 'Estratega SEO',
    desc: 'Auditorias SEO completas, investigacion de keywords, analisis de backlinks, estudio de competencia y estrategias de posicionamiento en Google.',
    color: '#3b82f6',
    icon: <Search size={20} />,
    category: 'marketing',
    tag: 'Popular',
    tagColor: 'text-indigo-600 bg-indigo-500/10',
    rating: 4.8,
    uses: '2.4k',
    capabilities: ['Keyword Research', 'Backlink Audit', 'Analisis Competencia', 'SEO On-Page'],
    prompt: 'Analiza el SEO de mi sitio web',
    featured: true,
  },
  {
    id: 'web',
    name: 'Pixel',
    role: 'Disenador Visual & UX',
    desc: 'Logos profesionales, banners con IA generativa, landing pages, posts para Instagram/Facebook/TikTok, flyers, pendones y cualquier pieza grafica.',
    color: '#a855f7',
    icon: <Layout size={20} />,
    category: 'diseno',
    tag: 'Estrella',
    tagColor: 'text-purple-600 bg-purple-500/10',
    rating: 4.9,
    uses: '5.1k',
    capabilities: ['Logos & Branding', 'Banners con IA', 'Posts Redes', 'Landing Pages'],
    prompt: 'Disena un logo para mi negocio',
    featured: true,
  },
  {
    id: 'ads',
    name: 'Metric',
    role: 'Especialista en Publicidad',
    desc: 'Campanas de Meta Ads y Google Ads optimizadas, copywriting publicitario, segmentacion de audiencias y optimizacion de ROAS.',
    color: '#10b981',
    icon: <TrendingUp size={20} />,
    category: 'marketing',
    tag: 'Pro',
    tagColor: 'text-emerald-600 bg-emerald-500/10',
    rating: 4.7,
    uses: '1.8k',
    capabilities: ['Meta Ads', 'Google Ads', 'Copywriting', 'A/B Testing'],
    prompt: 'Crea una campana publicitaria para mi producto',
    featured: false,
  },
  {
    id: 'dev',
    name: 'Logic',
    role: 'Desarrollador Full-Stack',
    desc: 'Paginas web completas y funcionales con HTML/CSS/JS, responsive, con interactividad avanzada, SEO on-page y codigo limpio.',
    color: '#f59e0b',
    icon: <Code size={20} />,
    category: 'desarrollo',
    tag: 'Tech',
    tagColor: 'text-amber-600 bg-amber-500/10',
    rating: 4.6,
    uses: '1.2k',
    capabilities: ['HTML/CSS/JS', 'Responsive', 'Interactividad', 'SEO Tecnico'],
    prompt: 'Construye una pagina web para mi negocio',
    featured: false,
  },
  {
    id: 'video',
    name: 'Reel',
    role: 'Creador de Video',
    desc: 'Videos cortos generados con IA (Veo 3): reels promocionales, clips de producto, contenido audiovisual para redes sociales y publicidad.',
    color: '#ef4444',
    icon: <Film size={20} />,
    category: 'contenido',
    tag: 'Nuevo',
    tagColor: 'text-rose-600 bg-rose-500/10',
    rating: 4.5,
    uses: '890',
    capabilities: ['Reels IA', 'Clips Producto', 'Videos Promo', 'Stories'],
    prompt: 'Crea un reel promocional para mi producto',
    featured: true,
  },
]

const MarketplaceView = ({ onUseBot }: MarketplaceViewProps) => {
  const { user, activeBots, updateActiveBots } = useAuth()
  const isAuthenticated = !!user
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBot, setExpandedBot] = useState<string | null>(null)
  const [togglingBot, setTogglingBot] = useState<string | null>(null)

  const handleToggleBot = async (botId: string) => {
    if (!isAuthenticated) return
    setTogglingBot(botId)
    const isCurrentlyActive = activeBots.includes(botId)
    await updateActiveBots([{ botId, isActive: !isCurrentlyActive }])
    setTogglingBot(null)
  }

  const filtered = bots.filter(b => {
    const matchCategory = activeCategory === 'all' || b.category === activeCategory
    const matchSearch = !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.role.toLowerCase().includes(searchQuery.toLowerCase()) || b.desc.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const featured = bots.filter(b => b.featured)

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-page">
      <div className="max-w-6xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Marketplace de Agentes</h1>
              <p className="text-sm text-ink-faint">Descubre y activa bots especializados para tu negocio</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Buscar agentes por nombre, rol o capacidad..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface border border-edge rounded-xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Categories */}
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

        {/* Featured Section */}
        {activeCategory === 'all' && !searchQuery && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Destacados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => onUseBot(bot.prompt)}
                  className="relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:shadow-lg group"
                  style={{ background: `linear-gradient(135deg, ${bot.color}15, ${bot.color}05)` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: bot.color }} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <BotAvatar3D seed={bot.name} color={bot.color} isActive={false} size="md" />
                      <div>
                        <h3 className="text-sm font-bold text-ink">{bot.name}</h3>
                        <p className="text-[11px] text-ink-faint">{bot.role}</p>
                      </div>
                    </div>
                    <p className="text-xs text-ink-light leading-relaxed mb-3 line-clamp-2">{bot.desc}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-[11px] font-bold text-ink">{bot.rating}</span>
                        <span className="text-[10px] text-ink-faint ml-1">{bot.uses} usos</span>
                      </div>
                      <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Usar <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Bots Grid */}
        <div>
          <h2 className="text-sm font-bold text-ink mb-4">
            {activeCategory === 'all' ? 'Todos los Agentes' : `Agentes de ${categories.find(c => c.id === activeCategory)?.label}`}
            <span className="text-ink-faint font-normal ml-2">({filtered.length})</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(bot => (
              <div
                key={bot.id}
                className="bg-surface rounded-2xl border border-edge hover:border-primary/30 transition-all overflow-hidden"
              >
                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start gap-4 mb-4">
                    <BotAvatar3D seed={bot.name} color={bot.color} isActive={false} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-ink">{bot.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bot.tagColor}`}>{bot.tag}</span>
                      </div>
                      <p className="text-xs text-ink-faint mb-1">{bot.role}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-ink">{bot.rating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-ink-faint">
                          <Eye size={12} />
                          <span className="text-[11px]">{bot.uses} usos</span>
                        </div>
                        {isAuthenticated && (
                          <div className="flex items-center gap-1">
                            {activeBots.includes(bot.id) ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-semibold text-emerald-600">Activo</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span className="text-[11px] font-semibold text-slate-400">Inactivo</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-ink-light leading-relaxed mb-4">{bot.desc}</p>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {bot.capabilities.map(cap => (
                      <span key={cap} className="text-[10px] font-medium text-ink-faint bg-subtle px-2.5 py-1 rounded-full border border-edge">
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUseBot(bot.prompt)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                    >
                      <MessageSquare size={14} />
                      Usar Agente
                    </button>
                    {isAuthenticated && (
                      <button
                        onClick={() => handleToggleBot(bot.id)}
                        disabled={togglingBot === bot.id}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                          activeBots.includes(bot.id)
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Power size={14} />
                        {togglingBot === bot.id ? '...' : activeBots.includes(bot.id) ? 'Activo' : 'Activar'}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
                      className="px-4 py-2 text-xs font-semibold text-ink-light hover:text-ink bg-subtle rounded-lg hover:bg-surface-alt transition-all"
                    >
                      {expandedBot === bot.id ? 'Menos' : 'Ver perfil'}
                    </button>
                  </div>
                </div>

                {/* Expanded profile */}
                {expandedBot === bot.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-edge mt-0">
                    <div className="pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Modelo IA</p>
                        <p className="text-xs text-ink">Claude Sonnet 4.5</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Herramientas</p>
                        <p className="text-xs text-ink">
                          {bot.id === 'web' ? 'Imagen 4 (IA generativa)' :
                           bot.id === 'video' ? 'Veo 3 (video IA)' :
                           bot.id === 'seo' ? 'Keywords, Backlinks, Competencia' :
                           bot.id === 'ads' ? 'Copys, Campanas' :
                           'HTML/CSS/JS Builder'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Tipo de Entrega</p>
                        <p className="text-xs text-ink">
                          {['web', 'dev', 'video'].includes(bot.id) ? 'Visual (Canvas)' : 'Texto detallado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Plan</p>
                        <p className="text-xs font-semibold text-emerald-600">Incluido</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Ejemplo de uso</p>
                      <button
                        onClick={() => onUseBot(bot.prompt)}
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        "{bot.prompt}" →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon */}
        <div className="mt-10 p-6 rounded-2xl border-2 border-dashed border-edge text-center">
          <Sparkles size={24} className="text-ink-faint mx-auto mb-3" />
          <h3 className="text-sm font-bold text-ink mb-1">Mas agentes proximamente</h3>
          <p className="text-xs text-ink-faint max-w-md mx-auto">
            Estamos desarrollando nuevos bots especializados: Community Manager, Email Marketing, Analytics, Copywriter y mas. Mantente atento al marketplace.
          </p>
        </div>
      </div>
    </div>
  )
}

export default MarketplaceView
