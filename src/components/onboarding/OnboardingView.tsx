import { useState } from 'react'
import { Palette, Megaphone, Code, Briefcase, HelpCircle, ArrowRight, Check, Store } from 'lucide-react'
import BotAvatar3D from '../avatars/BotAvatar3D'
import { useAuth } from '../../contexts/AuthContext'

interface OnboardingViewProps {
  onComplete: () => void
  onOpenMarketplace: () => void
}

type Profession = 'designer' | 'marketing' | 'developer' | 'entrepreneur' | 'other'

const professions: Array<{ id: Profession; label: string; icon: React.ReactNode; desc: string }> = [
  { id: 'designer', label: 'Disenador / Creativo', icon: <Palette size={24} />, desc: 'Diseno grafico, UX/UI, branding' },
  { id: 'marketing', label: 'Marketing / CM', icon: <Megaphone size={24} />, desc: 'Redes sociales, publicidad, contenido' },
  { id: 'developer', label: 'Desarrollador / Tech', icon: <Code size={24} />, desc: 'Programacion, automatizacion, APIs' },
  { id: 'entrepreneur', label: 'Emprendedor', icon: <Briefcase size={24} />, desc: 'Dueno de negocio, startup, freelance' },
  { id: 'other', label: 'Otro', icon: <HelpCircle size={24} />, desc: 'Explorar todas las opciones' },
]

const botSuggestions: Record<Profession, string[]> = {
  designer: ['web', 'video', 'dev'],
  marketing: ['seo', 'ads', 'web'],
  developer: ['dev', 'seo'],
  entrepreneur: ['seo', 'web', 'ads', 'dev', 'video'],
  other: ['seo', 'web', 'ads', 'dev', 'video'],
}

const allBots = [
  { id: 'seo', name: 'Lupa', role: 'Estratega SEO', color: '#3b82f6', desc: 'Auditorias SEO, keywords y posicionamiento' },
  { id: 'web', name: 'Pixel', role: 'Disenador Visual', color: '#a855f7', desc: 'Logos, banners, landing pages y graficas' },
  { id: 'ads', name: 'Metric', role: 'Ads Specialist', color: '#10b981', desc: 'Campanas Meta Ads y Google Ads' },
  { id: 'dev', name: 'Logic', role: 'Full-Stack Dev', color: '#f59e0b', desc: 'Paginas web funcionales y codigo' },
  { id: 'video', name: 'Reel', role: 'Creador de Video', color: '#ef4444', desc: 'Reels y videos con IA generativa' },
]

const OnboardingView = ({ onComplete, onOpenMarketplace }: OnboardingViewProps) => {
  const { completeOnboarding, user } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedProfession, setSelectedProfession] = useState<Profession | null>(null)
  const [selectedBots, setSelectedBots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleProfessionSelect = (prof: Profession) => {
    setSelectedProfession(prof)
    setSelectedBots([...botSuggestions[prof]])
    setStep(2)
  }

  const toggleBot = (botId: string) => {
    setSelectedBots(prev =>
      prev.includes(botId) ? prev.filter(b => b !== botId) : [...prev, botId]
    )
  }

  const handleComplete = async () => {
    if (!selectedProfession || selectedBots.length === 0) return
    setLoading(true)
    try {
      await completeOnboarding(selectedProfession, selectedBots)
      onComplete()
    } catch {
      // Error handled in context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-page flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-2xl mx-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            P
          </div>
          <h1 className="text-2xl font-bold text-ink mb-1">
            Bienvenido{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-sm text-ink-faint">
            {step === 1 ? 'Contanos un poco sobre ti para personalizar tu experiencia' : 'Estos bots estan sugeridos para ti. Activa los que quieras.'}
          </p>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`w-8 h-1 rounded-full transition-all ${step >= 1 ? 'bg-primary' : 'bg-edge'}`} />
            <div className={`w-8 h-1 rounded-full transition-all ${step >= 2 ? 'bg-primary' : 'bg-edge'}`} />
          </div>
        </div>

        {/* Step 1: Profession */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professions.map(prof => (
              <button
                key={prof.id}
                onClick={() => handleProfessionSelect(prof.id)}
                className="flex items-center gap-4 p-5 bg-surface border border-edge rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  {prof.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink group-hover:text-primary transition-colors">{prof.label}</p>
                  <p className="text-xs text-ink-faint">{prof.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Bot selection */}
        {step === 2 && (
          <div>
            <div className="space-y-3 mb-6">
              {allBots.map(bot => {
                const isSelected = selectedBots.includes(bot.id)
                const isSuggested = selectedProfession ? botSuggestions[selectedProfession].includes(bot.id) : false
                return (
                  <button
                    key={bot.id}
                    onClick={() => toggleBot(bot.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-primary/5 border-primary/40 shadow-sm'
                        : 'bg-surface border-edge hover:border-primary/20'
                    }`}
                  >
                    <BotAvatar3D seed={bot.name} color={bot.color} isActive={isSelected} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-ink">{bot.name}</p>
                        <span className="text-[10px] text-ink-faint">{bot.role}</span>
                        {isSuggested && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            Sugerido
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-light mt-0.5">{bot.desc}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-primary border-primary' : 'border-edge'
                    }`}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-semibold text-ink-light hover:text-ink bg-subtle rounded-xl hover:bg-surface-alt transition-all"
              >
                Atras
              </button>
              <button
                onClick={() => { onOpenMarketplace(); onComplete() }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-ink-light hover:text-ink bg-subtle rounded-xl hover:bg-surface-alt transition-all"
              >
                <Store size={14} />
                Ir al Marketplace
              </button>
              <button
                onClick={handleComplete}
                disabled={selectedBots.length === 0 || loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-fg text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Comenzar'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OnboardingView
