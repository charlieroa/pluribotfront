import { Search, Layout, TrendingUp, Code, Film, Bot, Sparkles, ArrowRight, ShieldCheck, Zap, Users, Store, Palette } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import { useAuth } from '../../contexts/AuthContext'

interface WelcomeScreenProps {
  quickActions: { id: string; title: string; icon: React.ReactElement; desc: string }[]
  setInputText: (text: string) => void
  onOpenMarketplace?: () => void
}

const botCards = [
  {
    id: 'seo',
    name: 'Lupa',
    role: 'Estratega SEO',
    desc: 'Auditorías SEO, keywords, backlinks y posicionamiento en Google.',
    color: '#3b82f6',
    icon: <Search size={20} />,
    category: 'Marketing',
    prompt: 'Analiza el SEO de mi sitio web',
  },
  {
    id: 'brand',
    name: 'Nova',
    role: 'Branding e Identidad',
    desc: 'Logos profesionales, paletas de color, tipografía y manual de marca con IA.',
    color: '#ec4899',
    icon: <Palette size={20} />,
    category: 'Diseño',
    prompt: 'Diseña un logo para mi negocio',
  },
  {
    id: 'web',
    name: 'Pixel',
    role: 'Diseñador Web',
    desc: 'Landing pages y sitios web completos, interactivos y responsivos.',
    color: '#a855f7',
    icon: <Layout size={20} />,
    category: 'Diseño',
    prompt: 'Crea una landing page para mi negocio',
  },
  {
    id: 'social',
    name: 'Spark',
    role: 'Contenido Social',
    desc: 'Banners, posts para Instagram/Facebook, flyers, stories y piezas gráficas.',
    color: '#f97316',
    icon: <Sparkles size={20} />,
    category: 'Diseño',
    prompt: 'Diseña un post para Instagram de mi negocio',
  },
  {
    id: 'ads',
    name: 'Metric',
    role: 'Especialista en Publicidad',
    desc: 'Campañas Meta Ads, Google Ads, copys y optimización de ROAS.',
    color: '#10b981',
    icon: <TrendingUp size={20} />,
    category: 'Marketing',
    prompt: 'Crea una campaña publicitaria para mi producto',
  },
  {
    id: 'dev',
    name: 'Logic',
    role: 'Desarrollador Full-Stack',
    desc: 'Páginas web funcionales, interactivas y responsivas con código real.',
    color: '#f59e0b',
    icon: <Code size={20} />,
    category: 'Desarrollo',
    prompt: 'Construye una página web para mi negocio',
  },
  {
    id: 'video',
    name: 'Reel',
    role: 'Creador de Video',
    desc: 'Videos cortos, reels promocionales y contenido audiovisual con IA generativa.',
    color: '#ef4444',
    icon: <Film size={20} />,
    category: 'Contenido',
    prompt: 'Crea un reel promocional para mi producto',
  },
]


const WelcomeScreen = ({ setInputText, onOpenMarketplace }: WelcomeScreenProps) => {
  const { user, activeBots } = useAuth()
  const isAuthenticated = !!user

  const isBotActive = (botId: string) => isAuthenticated && activeBots.includes(botId)

  return (
  <div className="max-w-5xl mx-auto py-4 md:py-6 px-3 md:px-4">
    {/* Hero */}
    <div className="relative mb-6 md:mb-10 p-5 md:p-8 rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-white/10 overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-start gap-4 md:gap-6">
        <div className="flex-shrink-0 hidden sm:block">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <Bot size={36} className="text-white" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Pluribots</h1>
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Tu equipo digital
            </span>
          </div>
          <p className="text-sm text-indigo-300/80 mb-2">Tu equipo de marketing, diseño y desarrollo — sin contratar personal</p>
          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mb-5">
            Agentes de IA que ejecutan al instante + expertos humanos para tareas complejas. Logos, landing pages, campañas de ads, SEO, videos y código — describe lo que necesitas y tu equipo lo resuelve.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setInputText('Quiero crear una landing page completa para mi negocio')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs md:text-sm font-semibold rounded-lg border border-white/10 transition-all"
            >
              <Sparkles size={14} className="text-indigo-400" />
              Crear landing page
            </button>
            <button
              onClick={() => setInputText('Necesito un logo y branding completo')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs md:text-sm font-semibold rounded-lg border border-white/10 transition-all"
            >
              <Sparkles size={14} className="text-purple-400" />
              Logo + Branding
            </button>
            <button
              onClick={() => setInputText('Crea un reel promocional para mi producto')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs md:text-sm font-semibold rounded-lg border border-white/10 transition-all"
            >
              <Sparkles size={14} className="text-rose-400" />
              Video promocional
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Cómo funciona */}
    <div className="mb-8 md:mb-10">
      <h2 className="text-lg font-bold text-ink mb-4">¿Cómo funciona?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-edge">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
            <Bot size={20} className="text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-ink mb-1">1. Agentes de IA</h3>
          <p className="text-xs text-ink-faint leading-relaxed">7 bots especializados que crean logos, webs, campañas y videos en minutos. Automático e instantáneo.</p>
        </div>
        <div className="p-5 rounded-2xl bg-surface border border-edge">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <Users size={20} className="text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-ink mb-1">2. Seniors humanos</h3>
          <p className="text-xs text-ink-faint leading-relaxed">Expertos reales en diseño, desarrollo, SEO y marketing para tareas que necesitan criterio humano.</p>
        </div>
        <div className="p-5 rounded-2xl bg-surface border border-edge">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <Zap size={20} className="text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-ink mb-1">3. Sin contratar personal</h3>
          <p className="text-xs text-ink-faint leading-relaxed">Tienes un equipo completo desde $29/mes. Sin sueldos, sin freelancers, sin complicaciones.</p>
        </div>
      </div>
    </div>

    {/* Agentes disponibles */}
    <div className="mb-8 md:mb-10">
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <h2 className="text-xl font-bold text-ink">Agentes disponibles</h2>
        <button
          onClick={onOpenMarketplace}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
        >
          <Store size={15} />
          Ver todos
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {botCards.map((bot) => {
          const active = isBotActive(bot.id)
          return (
            <button
              key={bot.id}
              onClick={() => setInputText(bot.prompt)}
              className="relative overflow-hidden rounded-2xl p-5 md:p-6 text-left transition-all hover:shadow-lg group"
              style={{ background: `linear-gradient(135deg, ${bot.color}15, ${bot.color}05)` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: bot.color }} />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <BotAvatar3D seed={bot.name} color={bot.color} isActive={false} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-ink">{bot.name}</h3>
                      {active && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-faint">{bot.role}</p>
                  </div>
                </div>
                <p className="text-sm text-ink-light leading-relaxed mb-3 line-clamp-2">{bot.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-faint font-medium">{bot.category}</span>
                  <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Usar <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>

    {/* Trust badges */}
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 px-4 md:px-8 py-3 md:py-4 border border-edge rounded-2xl bg-surface">
      <div className="flex items-center gap-1.5 md:gap-2 text-ink-faint">
        <ShieldCheck size={14} className="text-primary" />
        <span className="text-xs md:text-sm font-medium">Datos encriptados</span>
      </div>
      <div className="hidden sm:block w-px h-5 bg-edge" />
      <div className="flex items-center gap-1.5 md:gap-2 text-ink-faint">
        <Zap size={14} className="text-emerald-500" />
        <span className="text-xs md:text-sm font-medium">Agentes IA + Seniors humanos</span>
      </div>
      <div className="hidden sm:block w-px h-5 bg-edge" />
      <div className="flex items-center gap-1.5 md:gap-2 text-ink-faint">
        <Users size={14} className="text-amber-500" />
        <span className="text-xs md:text-sm font-medium">Tu equipo desde $29/mes</span>
      </div>
    </div>
  </div>
  )
}

export default WelcomeScreen
