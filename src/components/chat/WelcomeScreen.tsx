import { Search, Layout, TrendingUp, Code, Film, Bot, Sparkles, ArrowRight, ShieldCheck, Zap, Users, Store } from 'lucide-react'
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
    desc: 'Auditorias SEO, keywords, backlinks y posicionamiento en Google.',
    color: '#3b82f6',
    icon: <Search size={18} />,
    tag: 'Popular',
    tagColor: 'text-indigo-600 bg-indigo-500/10',
    category: 'Marketing',
    prompt: 'Analiza el SEO de mi sitio web',
  },
  {
    id: 'web',
    name: 'Pixel',
    role: 'Disenador Visual',
    desc: 'Logos, banners, landing pages, posts para redes y piezas graficas con IA.',
    color: '#a855f7',
    icon: <Layout size={18} />,
    tag: 'Estrella',
    tagColor: 'text-purple-600 bg-purple-500/10',
    category: 'Diseno',
    prompt: 'Disena un logo para mi negocio',
  },
  {
    id: 'ads',
    name: 'Metric',
    role: 'Ads Specialist',
    desc: 'Campanas Meta Ads, Google Ads, copys y optimizacion de ROAS.',
    color: '#10b981',
    icon: <TrendingUp size={18} />,
    tag: 'Pro',
    tagColor: 'text-emerald-600 bg-emerald-500/10',
    category: 'Marketing',
    prompt: 'Crea una campana publicitaria para mi producto',
  },
  {
    id: 'dev',
    name: 'Logic',
    role: 'Full-Stack Dev',
    desc: 'Paginas web funcionales, interactivas y responsivas con codigo real.',
    color: '#f59e0b',
    icon: <Code size={18} />,
    tag: 'Tech',
    tagColor: 'text-amber-600 bg-amber-500/10',
    category: 'Desarrollo',
    prompt: 'Construye una pagina web para mi negocio',
  },
  {
    id: 'video',
    name: 'Reel',
    role: 'Creador de Video',
    desc: 'Videos cortos, reels promocionales y contenido audiovisual con IA generativa.',
    color: '#ef4444',
    icon: <Film size={18} />,
    tag: 'Nuevo',
    tagColor: 'text-rose-600 bg-rose-500/10',
    category: 'Contenido',
    prompt: 'Crea un reel promocional para mi producto',
  },
]

const WelcomeScreen = ({ setInputText, onOpenMarketplace }: WelcomeScreenProps) => {
  const { user, activeBots } = useAuth()
  const isAuthenticated = !!user

  // Filter bots: authenticated users see only their active bots; anonymous see all but grayed
  const filteredBotCards = isAuthenticated
    ? botCards.filter(b => activeBots.includes(b.id))
    : botCards

  return (
  <div className="max-w-5xl mx-auto py-4 md:py-6 px-3 md:px-4">
    {/* Hero: Pluria */}
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
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Pluria</h1>
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Orquestador IA
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-4">
            Soy tu director creativo con IA. Describi lo que necesitas y yo coordino automaticamente al equipo de bots especializados. Puedo activar a uno o varios agentes segun tu proyecto.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setInputText('Quiero crear una landing page completa para mi negocio')}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-[11px] md:text-xs font-semibold rounded-lg border border-white/10 transition-all"
            >
              <Sparkles size={14} className="text-indigo-400" />
              Crear landing page
            </button>
            <button
              onClick={() => setInputText('Necesito un logo y branding completo')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg border border-white/10 transition-all"
            >
              <Sparkles size={14} className="text-purple-400" />
              Logo + Branding
            </button>
            <button
              onClick={() => setInputText('Crea un reel promocional para mi producto')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg border border-white/10 transition-all"
            >
              <Sparkles size={14} className="text-rose-400" />
              Video promocional
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Active Agents Section */}
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 md:mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-ink">Tus Agentes Activos</h2>
          <button
            onClick={onOpenMarketplace}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Ver todos →
          </button>
        </div>
        <button
          onClick={onOpenMarketplace}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
        >
          <Store size={14} />
          Marketplace
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredBotCards.map((bot) => {
          const isBotOff = !isAuthenticated
          return (
            <button
              key={bot.id}
              onClick={() => !isBotOff && setInputText(bot.prompt)}
              className={`bg-surface p-4 md:p-5 rounded-2xl border transition-all group text-left ${
                isBotOff
                  ? 'border-edge opacity-50 cursor-default'
                  : 'border-edge hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <BotAvatar3D seed={bot.name} color={bot.color} isActive={false} size="md" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-ink-faint bg-subtle px-2 py-0.5 rounded-full">{bot.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bot.tagColor}`}>
                    {bot.tag}
                  </span>
                </div>
              </div>
              <h3 className={`text-sm font-bold transition-colors ${isBotOff ? 'text-ink-faint' : 'text-ink group-hover:text-primary'}`}>
                {bot.name}
              </h3>
              <p className="text-[11px] text-ink-faint mt-0.5 mb-2">{bot.role}</p>
              <p className="text-xs text-ink-light leading-relaxed">{bot.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {isBotOff ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400">Inactivo</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600">Activo</span>
                    </>
                  )}
                </div>
                {!isBotOff && (
                  <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Usar <ArrowRight size={10} />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>

    {/* What can Pluria do */}
    <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-2xl bg-subtle border border-edge">
      <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
        <Zap size={16} className="text-primary" />
        Que puede hacer Pluria por ti
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Search size={14} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-ink">Analisis y Estrategia</p>
            <p className="text-[11px] text-ink-faint mt-0.5">SEO, keywords, competencia, auditorias completas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Layout size={14} className="text-purple-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-ink">Diseno con IA</p>
            <p className="text-[11px] text-ink-faint mt-0.5">Logos, banners, posts e imagenes generadas con IA</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <Film size={14} className="text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-ink">Video con IA</p>
            <p className="text-[11px] text-ink-faint mt-0.5">Reels, clips y videos generados con Veo 3</p>
          </div>
        </div>
      </div>
    </div>

    {/* Trust badges */}
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 px-4 md:px-8 py-3 md:py-4 border border-edge rounded-2xl bg-surface">
      <div className="flex items-center gap-1.5 md:gap-2 text-ink-faint">
        <ShieldCheck size={14} className="text-primary" />
        <span className="text-[11px] md:text-xs font-medium">Datos Encriptados</span>
      </div>
      <div className="hidden sm:block w-px h-5 bg-edge" />
      <div className="flex items-center gap-1.5 md:gap-2 text-ink-faint">
        <Zap size={14} className="text-emerald-500" />
        <span className="text-[11px] md:text-xs font-medium">IA de Ultima Generacion</span>
      </div>
      <div className="hidden sm:block w-px h-5 bg-edge" />
      <div className="flex items-center gap-1.5 md:gap-2 text-ink-faint">
        <Users size={14} className="text-amber-500" />
        <span className="text-[11px] md:text-xs font-medium">5 Agentes Especializados</span>
      </div>
    </div>
  </div>
  )
}

export default WelcomeScreen
