import { useState } from 'react'
import { LayoutGrid, Navigation, Image, Star, DollarSign, Zap, Footprints, ChevronDown, Eye, EyeOff, RefreshCw, Wand2 } from 'lucide-react'

export interface DetectedSection {
  id: string
  tag: string
  label: string
  sectionType: string
  headingText: string
  rect: { top: number; height: number }
}

interface SectionNavigatorProps {
  sections: DetectedSection[]
  onHighlightSection: (sectionId: string) => void
  onUpdateSectionProp: (sectionId: string, prop: string, value: string) => void
  onSendMessage: (text: string) => void
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  nav: <Navigation size={14} />,
  hero: <Image size={14} />,
  features: <LayoutGrid size={14} />,
  pricing: <DollarSign size={14} />,
  testimonials: <Star size={14} />,
  cta: <Zap size={14} />,
  banner: <Zap size={14} />,
  footer: <Footprints size={14} />,
  section: <LayoutGrid size={14} />,
}

const SECTION_LABELS: Record<string, string> = {
  nav: 'Navegacion',
  hero: 'Hero / Banner principal',
  features: 'Caracteristicas',
  pricing: 'Precios',
  testimonials: 'Testimonios',
  cta: 'Llamada a la accion',
  banner: 'Banner',
  footer: 'Footer',
  section: 'Seccion',
}

const BG_PRESETS = [
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Gris claro', value: '#f8fafc' },
  { label: 'Oscuro', value: '#0f172a' },
  { label: 'Azul', value: '#1e3a5f' },
  { label: 'Indigo', value: '#312e81' },
  { label: 'Verde', value: '#064e3b' },
]

const SectionNavigator = ({ sections, onHighlightSection, onUpdateSectionProp, onSendMessage }: SectionNavigatorProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set())

  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-ink-faint text-xs">
        No se detectaron secciones editables.
        <p className="mt-1 text-[10px]">Genera una pagina primero.</p>
      </div>
    )
  }

  const toggleHidden = (id: string) => {
    const next = new Set(hiddenSections)
    if (next.has(id)) {
      next.delete(id)
      onUpdateSectionProp(id, 'display', 'block')
    } else {
      next.add(id)
      onUpdateSectionProp(id, 'display', 'none')
    }
    setHiddenSections(next)
  }

  return (
    <div className="space-y-1 p-2">
      <p className="text-[10px] text-ink-faint font-medium uppercase tracking-wider px-2 mb-2">
        Secciones ({sections.length})
      </p>

      {sections.map((section) => {
        const isExpanded = expandedSection === section.id
        const isHidden = hiddenSections.has(section.id)
        const icon = SECTION_ICONS[section.sectionType] || SECTION_ICONS.section
        const typeLabel = SECTION_LABELS[section.sectionType] || section.sectionType

        return (
          <div key={section.id} className={`border border-edge rounded-lg overflow-hidden ${isHidden ? 'opacity-50' : ''}`}>
            {/* Section header */}
            <button
              onClick={() => {
                onHighlightSection(section.id)
                setExpandedSection(isExpanded ? null : section.id)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-subtle/50 transition-colors"
            >
              <span className="text-blue-500 flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-ink truncate">
                  {section.headingText || typeLabel}
                </p>
                <p className="text-[9px] text-ink-faint">
                  &lt;{section.tag}&gt; · {typeLabel}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleHidden(section.id) }}
                  className="p-1 text-ink-faint hover:text-ink rounded transition-colors"
                  title={isHidden ? 'Mostrar' : 'Ocultar'}
                >
                  {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
                <ChevronDown size={12} className={`text-ink-faint transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Section properties */}
            {isExpanded && (
              <div className="px-3 pb-3 border-t border-edge pt-2.5 space-y-3">
                {/* Background color */}
                <div>
                  <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Fondo</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {BG_PRESETS.map(bg => (
                      <button
                        key={bg.value}
                        onClick={() => onUpdateSectionProp(section.id, 'backgroundColor', bg.value)}
                        className="w-6 h-6 rounded-md border border-edge hover:scale-110 transition-transform"
                        style={{ backgroundColor: bg.value }}
                        title={bg.label}
                      />
                    ))}
                    <button
                      className="w-6 h-6 rounded-md border border-edge bg-gradient-to-br from-red-400 via-green-400 to-blue-400 hover:scale-110 transition-transform"
                      title="Color personalizado"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'color'
                        input.value = '#3b82f6'
                        input.addEventListener('input', (e) => {
                          onUpdateSectionProp(section.id, 'backgroundColor', (e.target as HTMLInputElement).value)
                        })
                        input.click()
                      }}
                    />
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Espaciado</label>
                  <div className="flex gap-1 mt-1.5">
                    {['16px', '32px', '48px', '64px', '80px', '96px'].map(val => (
                      <button
                        key={val}
                        onClick={() => onUpdateSectionProp(section.id, 'padding', `${val} 0`)}
                        className="px-2 py-1 text-[9px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                      >
                        {parseInt(val)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI actions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Acciones IA</label>
                  <button
                    onClick={() => onSendMessage(`Regenera la seccion "${section.headingText || typeLabel}" manteniendo el mismo estilo y contenido pero con un diseño diferente`)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
                  >
                    <RefreshCw size={11} className="text-blue-500 flex-shrink-0" />
                    Regenerar seccion
                  </button>
                  <button
                    onClick={() => onSendMessage(`Mejora el diseño de la seccion "${section.headingText || typeLabel}" haciendola mas moderna y atractiva`)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
                  >
                    <Wand2 size={11} className="text-purple-500 flex-shrink-0" />
                    Mejorar diseño
                  </button>
                  <button
                    onClick={() => onSendMessage(`Cambia el layout de la seccion "${section.headingText || typeLabel}" a un diseño alternativo`)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
                  >
                    <LayoutGrid size={11} className="text-green-500 flex-shrink-0" />
                    Cambiar layout
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SectionNavigator
