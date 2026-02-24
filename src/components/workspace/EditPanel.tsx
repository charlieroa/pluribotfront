import { useEffect, useState } from 'react'
import { Type, ImageIcon, Palette, Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronDown, MousePointer, Wand2, Paintbrush, RotateCcw, Sparkles } from 'lucide-react'
import type { SelectedElement } from './VisualEditToolbar'
import type { Deliverable } from '../../types'

interface EditPanelProps {
  editMode: boolean
  onToggleEditMode: (enabled: boolean) => void
  selectedElement: SelectedElement | null
  deliverable: Deliverable | null
  onSendMessage: (text: string) => void
  onEditText: () => void
  onChangeImage: () => void
  onApplyStyle: (styles: Record<string, string>) => void
  onReplaceImage: (url: string, alt: string) => void
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#0f172a', '#1e40af',
  '#15803d', '#b91c1c', '#7c3aed', '#db2777', '#0891b2', '#ca8a04',
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px']

const LOGO_STYLES = [
  { label: 'Minimalista', prompt: 'Regenera el logo con estilo minimalista, lineas limpias y formas simples' },
  { label: 'Moderno', prompt: 'Regenera el logo con estilo moderno y contemporaneo, geometrico y bold' },
  { label: 'Elegante', prompt: 'Regenera el logo con estilo elegante y sofisticado, serif y tonos oscuros' },
  { label: 'Divertido', prompt: 'Regenera el logo con estilo divertido y colorido, formas redondeadas' },
  { label: 'Corporativo', prompt: 'Regenera el logo con estilo corporativo profesional, serio y confiable' },
  { label: '3D / Gradiente', prompt: 'Regenera el logo con efecto 3D y gradientes modernos' },
]

const LOGO_COLOR_PALETTES = [
  { label: 'Azul corporativo', colors: '#1e40af, #3b82f6, #93c5fd', prompt: 'Cambia la paleta del logo a tonos azules corporativos' },
  { label: 'Verde natura', colors: '#15803d, #22c55e, #86efac', prompt: 'Cambia la paleta del logo a tonos verdes naturales' },
  { label: 'Rojo energico', colors: '#b91c1c, #ef4444, #fca5a5', prompt: 'Cambia la paleta del logo a tonos rojos energicos' },
  { label: 'Purpura premium', colors: '#7c3aed, #a855f7, #d8b4fe', prompt: 'Cambia la paleta del logo a tonos purpura premium' },
  { label: 'Negro y dorado', colors: '#0f172a, #ca8a04, #fde68a', prompt: 'Cambia la paleta del logo a negro con acentos dorados, look luxury' },
  { label: 'Pastel suave', colors: '#f9a8d4, #a5b4fc, #86efac', prompt: 'Cambia la paleta del logo a colores pastel suaves y modernos' },
]

function isLogoDeliverable(d: Deliverable | null): boolean {
  if (!d) return false
  const title = d.title.toLowerCase()
  return title.includes('logo') || title.includes('identidad') || title.includes('marca') || title.includes('brand')
}

const EditPanel = ({
  onToggleEditMode,
  selectedElement,
  deliverable,
  onSendMessage,
  onEditText,
  onChangeImage,
  onApplyStyle,
}: EditPanelProps) => {
  const [activeSection, setActiveSection] = useState<string | null>('general')
  const isLogo = isLogoDeliverable(deliverable)

  // Auto-activate edit mode when this panel mounts (only for pages, not logos)
  useEffect(() => {
    if (!isLogo) {
      onToggleEditMode(true)
      return () => onToggleEditMode(false)
    }
  }, [onToggleEditMode, isLogo])

  // Logo editing panel
  if (isLogo) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-edge flex-shrink-0 bg-purple-500/5">
          <p className="text-[11px] text-purple-600 font-medium text-center">
            Edicion de logo e identidad visual
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {/* Style variations */}
          <Section
            title="Estilo"
            icon={<Wand2 size={14} />}
            isOpen={activeSection === 'style' || activeSection === 'general'}
            onToggle={() => setActiveSection(activeSection === 'style' ? null : 'style')}
          >
            <p className="text-[10px] text-ink-faint mb-2">Selecciona un estilo y se regenerara el logo</p>
            <div className="grid grid-cols-2 gap-1.5">
              {LOGO_STYLES.map(style => (
                <button
                  key={style.label}
                  onClick={() => onSendMessage(style.prompt)}
                  className="px-3 py-2 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
                >
                  {style.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Color palettes */}
          <Section
            title="Paleta de colores"
            icon={<Paintbrush size={14} />}
            isOpen={activeSection === 'colors'}
            onToggle={() => setActiveSection(activeSection === 'colors' ? null : 'colors')}
          >
            <div className="space-y-2">
              {LOGO_COLOR_PALETTES.map(palette => (
                <button
                  key={palette.label}
                  onClick={() => onSendMessage(palette.prompt)}
                  className="w-full flex items-center gap-3 p-2.5 bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
                >
                  <div className="flex gap-1 flex-shrink-0">
                    {palette.colors.split(', ').map(color => (
                      <div key={color} className="w-5 h-5 rounded-full border border-edge" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-ink">{palette.label}</span>
                </button>
              ))}
              <ColorPickerButton onSelect={(color) => onSendMessage(`Cambia el color principal del logo a ${color}`)} />
            </div>
          </Section>

          {/* Quick refinements */}
          <Section
            title="Ajustes rapidos"
            icon={<Sparkles size={14} />}
            isOpen={activeSection === 'refine'}
            onToggle={() => setActiveSection(activeSection === 'refine' ? null : 'refine')}
          >
            <div className="space-y-1.5">
              <button
                onClick={() => onSendMessage('Genera 3 variaciones adicionales del logo con estilos diferentes')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
              >
                <RotateCcw size={12} className="text-ink-faint flex-shrink-0" />
                Generar mas variaciones
              </button>
              <button
                onClick={() => onSendMessage('Hazlo mas simple y minimalista, menos detalles')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
              >
                <Wand2 size={12} className="text-ink-faint flex-shrink-0" />
                Mas simple / minimalista
              </button>
              <button
                onClick={() => onSendMessage('Agrega mockups de aplicacion: tarjeta de presentacion, camiseta, fachada, redes sociales')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
              >
                <ImageIcon size={12} className="text-ink-faint flex-shrink-0" />
                Ver en mockups
              </button>
              <button
                onClick={() => onSendMessage('Mejora la tipografia del logotipo, prueba con fuentes mas profesionales')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
              >
                <Type size={12} className="text-ink-faint flex-shrink-0" />
                Mejorar tipografia
              </button>
            </div>
          </Section>
        </div>
      </div>
    )
  }

  // Page editing panel
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header hint */}
      <div className="px-4 py-2.5 border-b border-edge flex-shrink-0 bg-blue-500/5">
        <p className="text-[11px] text-blue-600 font-medium text-center">
          Click para seleccionar, doble-click para editar texto
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedElement ? (
          <div className="p-6 flex flex-col items-center justify-center text-center gap-3 h-full">
            <MousePointer size={32} className="text-blue-400" />
            <p className="text-sm text-ink-faint">
              Haz click en un elemento del canvas para editarlo
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {/* Selected element info */}
            <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
              <p className="text-[11px] font-medium text-blue-600">
                Elemento seleccionado: &lt;{selectedElement.tag}&gt;
              </p>
              {selectedElement.text && (
                <p className="text-[10px] text-ink-faint mt-0.5 truncate">
                  {selectedElement.text}
                </p>
              )}
            </div>

            {/* Text editing section */}
            {!selectedElement.isImage && (
              <Section
                title="Texto"
                icon={<Type size={14} />}
                isOpen={activeSection === 'text'}
                onToggle={() => setActiveSection(activeSection === 'text' ? null : 'text')}
              >
                <button
                  onClick={onEditText}
                  className="w-full px-3 py-2 text-xs font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors text-left"
                >
                  Doble-click en el elemento para editar texto inline
                </button>

                {/* Font size */}
                <div className="mt-3">
                  <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Tamano</label>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {FONT_SIZES.map(size => (
                      <button
                        key={size}
                        onClick={() => onApplyStyle({ fontSize: size })}
                        className="px-2 py-1 text-[10px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                      >
                        {parseInt(size)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font weight & style */}
                <div className="flex gap-1 mt-3">
                  <button
                    onClick={() => onApplyStyle({ fontWeight: 'bold' })}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                  >
                    <Bold size={12} /> Bold
                  </button>
                  <button
                    onClick={() => onApplyStyle({ fontStyle: 'italic' })}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                  >
                    <Italic size={12} /> Italic
                  </button>
                </div>

                {/* Text align */}
                <div className="flex gap-1 mt-2">
                  <button onClick={() => onApplyStyle({ textAlign: 'left' })} className="flex-1 flex items-center justify-center px-2 py-1.5 text-ink-light bg-subtle hover:bg-edge rounded transition-colors">
                    <AlignLeft size={12} />
                  </button>
                  <button onClick={() => onApplyStyle({ textAlign: 'center' })} className="flex-1 flex items-center justify-center px-2 py-1.5 text-ink-light bg-subtle hover:bg-edge rounded transition-colors">
                    <AlignCenter size={12} />
                  </button>
                  <button onClick={() => onApplyStyle({ textAlign: 'right' })} className="flex-1 flex items-center justify-center px-2 py-1.5 text-ink-light bg-subtle hover:bg-edge rounded transition-colors">
                    <AlignRight size={12} />
                  </button>
                </div>
              </Section>
            )}

            {/* Image section */}
            {selectedElement.isImage && (
              <Section
                title="Imagen"
                icon={<ImageIcon size={14} />}
                isOpen={activeSection === 'image'}
                onToggle={() => setActiveSection(activeSection === 'image' ? null : 'image')}
              >
                {selectedElement.imageSrc && (
                  <div className="rounded-lg overflow-hidden border border-edge mb-3">
                    <img src={selectedElement.imageSrc} alt="" className="w-full h-24 object-cover" />
                  </div>
                )}
                <button
                  onClick={onChangeImage}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  <ImageIcon size={14} /> Buscar foto en Unsplash
                </button>
              </Section>
            )}

            {/* Colors section */}
            <Section
              title="Colores"
              icon={<Palette size={14} />}
              isOpen={activeSection === 'colors' || activeSection === 'general'}
              onToggle={() => setActiveSection(activeSection === 'colors' ? null : 'colors')}
            >
              {/* Text color */}
              {!selectedElement.isImage && (
                <div>
                  <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Color de texto</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={`text-${color}`}
                        onClick={() => onApplyStyle({ color })}
                        className="w-6 h-6 rounded-md border border-edge hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <ColorPickerButton onSelect={(color) => onApplyStyle({ color })} />
                  </div>
                </div>
              )}

              {/* Background color */}
              <div className="mt-3">
                <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Color de fondo</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={`bg-${color}`}
                      onClick={() => onApplyStyle({ backgroundColor: color })}
                      className="w-6 h-6 rounded-md border border-edge hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <ColorPickerButton onSelect={(color) => onApplyStyle({ backgroundColor: color })} />
                </div>
              </div>

              {/* Transparent bg */}
              <button
                onClick={() => onApplyStyle({ backgroundColor: 'transparent' })}
                className="mt-2 flex items-center gap-1.5 px-2 py-1 text-[10px] text-ink-faint hover:text-ink transition-colors"
              >
                <Trash2 size={10} /> Quitar fondo
              </button>
            </Section>

            {/* Spacing section */}
            <Section
              title="Espaciado"
              icon={<AlignCenter size={14} />}
              isOpen={activeSection === 'spacing'}
              onToggle={() => setActiveSection(activeSection === 'spacing' ? null : 'spacing')}
            >
              <div className="grid grid-cols-2 gap-2">
                {(['padding', 'margin'] as const).map(prop => (
                  <div key={prop}>
                    <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">{prop}</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['0px', '4px', '8px', '12px', '16px', '24px', '32px', '48px'].map(val => (
                        <button
                          key={`${prop}-${val}`}
                          onClick={() => onApplyStyle({ [prop]: val })}
                          className="px-1.5 py-0.5 text-[9px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                        >
                          {parseInt(val)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Border radius */}
              <div className="mt-3">
                <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Bordes</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['0px', '4px', '8px', '12px', '16px', '24px', '9999px'].map(val => (
                    <button
                      key={`radius-${val}`}
                      onClick={() => onApplyStyle({ borderRadius: val })}
                      className="px-1.5 py-0.5 text-[9px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                    >
                      {val === '9999px' ? 'pill' : parseInt(val)}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

// Collapsible section component
const Section = ({ title, icon, isOpen, onToggle, children }: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) => (
  <div className="border border-edge rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-ink hover:bg-subtle/50 transition-colors"
    >
      <span className="flex items-center gap-2">{icon} {title}</span>
      <ChevronDown size={12} className={`text-ink-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="px-3 pb-3 border-t border-edge pt-3">{children}</div>}
  </div>
)

// Color picker button that opens native color input
const ColorPickerButton = ({ onSelect }: { onSelect: (color: string) => void }) => (
  <button
    className="w-6 h-6 rounded-md border border-edge bg-gradient-to-br from-red-400 via-green-400 to-blue-400 hover:scale-110 transition-transform"
    title="Color personalizado"
    onClick={() => {
      const input = document.createElement('input')
      input.type = 'color'
      input.value = '#3b82f6'
      input.addEventListener('input', (e) => onSelect((e.target as HTMLInputElement).value))
      input.click()
    }}
  />
)

export default EditPanel
