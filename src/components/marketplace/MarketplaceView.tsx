import { useState } from 'react'
import { Search, Layout, TrendingUp, Film, ArrowRight, Zap, MessageSquare, Sparkles, Power, Info, Box } from 'lucide-react'
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
    capabilities: ['Keyword Research', 'Backlink Audit', 'Analisis Competencia', 'SEO On-Page'],
    prompt: 'Analiza el SEO de mi sitio web',
    featured: true,
  },
  {
    id: 'web',
    name: 'Pixel',
    role: 'Disenador Visual',
    desc: 'Logos, branding, posts para redes, banners, flyers, stories, moodboards y todo lo grafico con IA. Tu disenador visual completo.',
    color: '#a78bfa',
    icon: <Layout size={20} />,
    category: 'diseno',
    capabilities: ['Logos con IA', 'Posts Redes', 'Banners', 'Moodboards'],
    prompt: 'Disena un logo para mi negocio',
    featured: true,
  },
  {
    id: 'voxel',
    name: 'Voxel',
    role: 'Artista 3D',
    desc: 'Convierte una foto de tu carro o producto en un modelo 3D descargable con preview y fallback visual listo para usar.',
    color: '#06b6d4',
    icon: <Box size={20} />,
    category: 'diseno',
    capabilities: ['Imagen a 3D', 'Modelos GLB', 'Preview', 'Fallback visual'],
    prompt: 'Convierte esta imagen en un modelo 3D listo para descargar',
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
    capabilities: ['Meta Ads', 'Google Ads', 'Copywriting', 'A/B Testing'],
    prompt: 'Crea una campana publicitaria para mi producto',
    featured: false,
  },
  {
    id: 'video',
    name: 'Reel',
    role: 'Creador de Video',
    desc: 'Videos cortos generados con IA: reels promocionales, clips de producto, contenido audiovisual para redes sociales y publicidad.',
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
    const matchSearch = !searchQuery
      || b.name.toLowerCase().includes(searchQuery.toLowerCase())
      || b.role.toLowerCase().includes(searchQuery.toLowerCase())
      || b.desc.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const featured = bots.filter(b => b.featured)

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-page">
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Marketplace de Agentes</h1>
              <p className="text-sm text-ink-faint">Arma tu equipo de agentes de IA especializados</p>
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <Info size={16} className="text-[#a78bfa] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              <strong>Cada agente es un miembro de tu equipo digital.</strong> Activalos para que participen automaticamente cuando les pidas crear logos, webs, campanas, videos, codigo o assets 3D.
            </p>
          </div>
        )}

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

                  <p className="text-xs text-ink-light leading-relaxed mb-4">{bot.desc}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {bot.capabilities.map(cap => (
                      <span key={cap} className="text-[10px] font-medium text-ink-faint bg-subtle px-2.5 py-1 rounded-full border border-edge">
                        {cap}
                      </span>
                    ))}
                  </div>

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
                          {bot.id === 'web' ? 'Imagenes + Stock Photos' :
                            bot.id === 'voxel' ? 'Meshy image-to-3D + preview HTML' :
                            bot.id === 'video' ? 'Veo 3 (video IA)' :
                            bot.id === 'seo' ? 'Keywords, Backlinks, Competencia' :
                            bot.id === 'ads' ? 'Copys, Campanas' :
                            'React + Stock Photos'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Tipo de entrega</p>
                        <p className="text-xs text-ink">
                          {['web', 'dev', 'video', 'voxel'].includes(bot.id) ? 'Visual (Canvas)' : 'Texto detallado'}
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
                        "{bot.prompt}" -&gt;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 p-6 rounded-2xl border-2 border-dashed border-edge text-center">
          <Sparkles size={24} className="text-ink-faint mx-auto mb-3" />
          <h3 className="text-sm font-bold text-ink mb-1">Mas agentes proximamente</h3>
          <p className="text-xs text-ink-faint max-w-md mx-auto">
            Estamos desarrollando nuevos bots especializados: Community Manager, Email Marketing, Analytics, Copywriter y mas.
          </p>
        </div>
      </div>
    </div>
  )
}

export default MarketplaceView
