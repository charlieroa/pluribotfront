import { Bot, Sparkles, Globe, ShoppingBag, Briefcase, FileText, UtensilsCrossed, Rocket, Users2, CalendarCheck, KanbanSquare } from 'lucide-react'

interface WelcomeScreenProps {
  quickActions: { id: string; title: string; icon: React.ReactElement; desc: string }[]
  setInputText: (text: string) => void
  onOpenMarketplace?: () => void
  onLoadTemplate?: (templateId: string) => void
}

const projectCards = [
  {
    id: 'landing',
    name: 'Landing Page',
    desc: 'Pagina de aterrizaje con hero, features y precios',
    icon: <Globe size={20} />,
    color: '#3b82f6',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    desc: 'Tienda online con catalogo, filtros y carrito',
    icon: <ShoppingBag size={20} />,
    color: '#10b981',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    desc: 'Portfolio profesional con galeria y contacto',
    icon: <Briefcase size={20} />,
    color: '#8b5cf6',
  },
  {
    id: 'blog',
    name: 'Blog',
    desc: 'Blog con posts, categorias y newsletter',
    icon: <FileText size={20} />,
    color: '#f59e0b',
  },
  {
    id: 'restaurant',
    name: 'Restaurante',
    desc: 'Menu interactivo con reservaciones',
    icon: <UtensilsCrossed size={20} />,
    color: '#ef4444',
  },
  {
    id: 'saas',
    name: 'SaaS',
    desc: 'Landing para producto digital con pricing',
    icon: <Rocket size={20} />,
    color: '#0ea5e9',
  },
  {
    id: 'crm',
    name: 'CRM',
    desc: 'Gestion de clientes con pipeline y tabla',
    icon: <Users2 size={20} />,
    color: '#6366f1',
  },
  {
    id: 'booking',
    name: 'Reservas',
    desc: 'Sistema de citas con calendario',
    icon: <CalendarCheck size={20} />,
    color: '#14b8a6',
  },
  {
    id: 'kanban',
    name: 'Kanban',
    desc: 'Board de tareas con filtros y prioridades',
    icon: <KanbanSquare size={20} />,
    color: '#f97316',
  },
]

const WelcomeScreen = ({ setInputText, onLoadTemplate }: WelcomeScreenProps) => {
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

    {/* Cajitas de lo que hacemos */}
    {onLoadTemplate && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {projectCards.map((proj) => (
          <button
            key={proj.id}
            onClick={() => onLoadTemplate(proj.id)}
            className="relative overflow-hidden rounded-xl p-4 text-left transition-all hover:shadow-lg group border border-edge"
            style={{ background: `linear-gradient(135deg, ${proj.color}15, ${proj.color}05)` }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: proj.color }} />
            <div className="relative">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white mb-3"
                style={{ background: `linear-gradient(135deg, ${proj.color}, ${proj.color}cc)` }}
              >
                {proj.icon}
              </div>
              <h3 className="text-sm font-bold text-ink mb-1">{proj.name}</h3>
              <p className="text-xs text-ink-faint leading-relaxed line-clamp-2">{proj.desc}</p>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
  )
}

export default WelcomeScreen
