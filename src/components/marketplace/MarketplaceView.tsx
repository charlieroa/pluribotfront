import { useState } from 'react'
import { Search, Layout, TrendingUp, Code, Film, ArrowRight, Zap, MessageSquare, Sparkles, Power, Palette, Info } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import { useAuth } from '../../contexts/AuthContext'

interface MarketplaceViewProps {
  onUseBot: (prompt: string) => void
}

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'diseno', label: 'Diseño' },
  { id: 'desarrollo', label: 'Desarrollo' },
  { id: 'contenido', label: 'Contenido' },
]

const bots = [
  {
    id: 'seo',
    name: 'Lupa',
    role: 'Estratega SEO',
    desc: 'Auditorías SEO completas, investigación de keywords, análisis de backlinks, estudio de competencia y estrategias de posicionamiento en Google.',
    color: '#3b82f6',
    icon: <Search size={20} />,
    category: 'marketing',
    capabilities: ['Keyword Research', 'Backlink Audit', 'Análisis Competencia', 'SEO On-Page'],
    prompt: 'Analiza el SEO de mi sitio web',
    featured: true,
  },
  {
    id: 'brand',
    name: 'Nova',
    role: 'Especialista en Branding',
    desc: 'Logos profesionales, identidad visual, paletas de color, tipografía y manual de marca completo con IA generativa.',
    color: '#ec4899',
    icon: <Palette size={20} />,
    category: 'diseno',
    capabilities: ['Logos con IA', 'Paletas de Color', 'Manual de Marca', 'Identidad Visual'],
    prompt: 'Diseña un logo para mi negocio',
    featured: true,
  },
  {
    id: 'web',
    name: 'Pixel',
    role: 'Diseñador Web',
    desc: 'Landing pages y sitios web completos, interactivos, responsivos, con SEO on-page, animaciones y Alpine.js.',
    color: '#a855f7',
    icon: <Layout size={20} />,
    category: 'diseno',
    capabilities: ['Landing Pages', 'Sitios Web', 'SEO On-Page', 'Responsive'],
    prompt: 'Crea una landing page para mi negocio',
    featured: false,
  },
  {
    id: 'social',
    name: 'Spark',
    role: 'Diseñador de Contenido Social',
    desc: 'Banners, posts para Instagram/Facebook/TikTok, flyers, stories, carruseles y piezas gráficas para redes sociales.',
    color: '#f97316',
    icon: <Sparkles size={20} />,
    category: 'diseno',
    capabilities: ['Posts Redes', 'Banners con IA', 'Stories', 'Flyers'],
    prompt: 'Diseña un post para Instagram de mi negocio',
    featured: true,
  },
  {
    id: 'ads',
    name: 'Metric',
    role: 'Especialista en Publicidad',
    desc: 'Campañas de Meta Ads y Google Ads optimizadas, copywriting publicitario, segmentación de audiencias y optimización de ROAS.',
    color: '#10b981',
    icon: <TrendingUp size={20} />,
    category: 'marketing',
    capabilities: ['Meta Ads', 'Google Ads', 'Copywriting', 'A/B Testing'],
    prompt: 'Crea una campaña publicitaria para mi producto',
    featured: false,
  },
  {
    id: 'dev',
    name: 'Logic',
    role: 'Desarrollador Full-Stack',
    desc: 'Páginas web completas y funcionales con HTML/CSS/JS, responsive, con interactividad avanzada, SEO on-page y código limpio.',
    color: '#f59e0b',
    icon: <Code size={20} />,
    category: 'desarrollo',
    capabilities: ['HTML/CSS/JS', 'Responsive', 'Interactividad', 'SEO Técnico'],
    prompt: 'Construye una página web para mi negocio',
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
              <p className="text-sm text-ink-faint">Arma tu equipo de agentes de IA especializados</p>
            </div>
          </div>
        </div>

        {/* Activation explainer */}
        {isAuthenticated && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              <strong>Cada agente es un miembro de tu equipo digital.</strong> Activalos para que participen automaticamente cuando les pidas crear logos, webs, campanas, videos o codigo.
            </p>
          </div>
        )}

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
                    <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Usar <ArrowRight size={10} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Bots Grid */}
        <div>
          <h2 className="text-sm font-bold text-ink mb-4">
            {activeCategory === 'all' ? 'Todos los agentes' : `Agentes de ${categories.find(c => c.id === activeCategory)?.label}`}
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
                      </div>
                      <p className="text-xs text-ink-faint mb-1">{bot.role}</p>
                      {isAuthenticated && (
                        <div className="flex items-center gap-1">
                          {activeBots.includes(bot.id) ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[11px] font-semibold text-emerald-600">Activo en tu equipo</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className="text-[11px] font-semibold text-slate-400">No activado</span>
                            </>
                          )}
                        </div>
                      )}
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
                      Usar agente
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
                          {bot.id === 'brand' ? 'Imagen 4 (IA generativa)' :
                           bot.id === 'web' ? 'Imagen 4 + Stock Photos' :
                           bot.id === 'social' ? 'Imagen 4 (IA generativa)' :
                           bot.id === 'video' ? 'Veo 3 (video IA)' :
                           bot.id === 'seo' ? 'Keywords, Backlinks, Competencia' :
                           bot.id === 'ads' ? 'Copys, Campañas' :
                           'HTML/CSS/JS Builder'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Tipo de entrega</p>
                        <p className="text-xs text-ink">
                          {['brand', 'web', 'social', 'dev', 'video'].includes(bot.id) ? 'Visual (Canvas)' : 'Texto detallado'}
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
          <h3 className="text-sm font-bold text-ink mb-1">Más agentes próximamente</h3>
          <p className="text-xs text-ink-faint max-w-md mx-auto">
            Estamos desarrollando nuevos bots especializados: Community Manager, Email Marketing, Analytics, Copywriter y más.
          </p>
        </div>
      </div>
    </div>
  )
}

export default MarketplaceView
