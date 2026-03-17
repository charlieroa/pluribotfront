import { useEffect, useState } from 'react'
import { Type, ImageIcon, Palette, Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronDown, MousePointer, Wand2, Paintbrush, RotateCcw, Sparkles, Copy, ArrowUp, ArrowDown, EyeOff, Undo2, Redo2, LayoutGrid } from 'lucide-react'
import type { SelectedElement } from './VisualEditToolbar'
import type { Deliverable } from '../../types'
import SectionNavigator from './SectionNavigator'
import type { DetectedSection } from './SectionNavigator'

interface SelectedLogo {
  index: number
  src: string
  style: string
}

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
  selectedLogo?: SelectedLogo | null
  detectedSections?: DetectedSection[]
  onHighlightSection?: (sectionId: string) => void
  onUpdateSectionProp?: (sectionId: string, prop: string, value: string) => void
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a78bfa', '#ec4899', '#6b7280', '#0f172a', '#1e40af',
  '#15803d', '#b91c1c', '#a78bfa', '#db2777', '#0891b2', '#ca8a04',
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px']

const FONT_FAMILIES = [
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Lato', value: "'Lato', sans-serif" },
  { label: 'Playfair', value: "'Playfair Display', serif" },
  { label: 'Merriweather', value: "'Merriweather', serif" },
  { label: 'Raleway', value: "'Raleway', sans-serif" },
  { label: 'Nunito', value: "'Nunito', sans-serif" },
  { label: 'DM Sans', value: "'DM Sans', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
]

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
  { label: 'Purpura premium', colors: '#a78bfa, #a78bfa, #d8b4fe', prompt: 'Cambia la paleta del logo a tonos purpura premium' },
  { label: 'Negro y dorado', colors: '#0f172a, #ca8a04, #fde68a', prompt: 'Cambia la paleta del logo a negro con acentos dorados, look luxury' },
  { label: 'Pastel suave', colors: '#f9a8d4, #a5b4fc, #86efac', prompt: 'Cambia la paleta del logo a colores pastel suaves y modernos' },
]

function isLogoDeliverable(d: Deliverable | null): boolean {
  if (!d) return false
  // Dev projects (multi-file apps) are never logos, even if the title mentions "marca"
  if (d.botType === 'dev') return false
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
  onReplaceImage,
  selectedLogo,
  detectedSections = [],
  onHighlightSection,
  onUpdateSectionProp,
}: EditPanelProps) => {
  const [activeSection, setActiveSection] = useState<string | null>('general')
  const [showSections, setShowSections] = useState(false)
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
        <div className="px-4 py-3 border-b border-edge flex-shrink-0 bg-[#a78bfa]/5">
          {selectedLogo ? (
            <div className="flex items-center gap-2.5">
              <img src={selectedLogo.src} alt="" className="w-8 h-8 rounded-lg object-contain border border-edge bg-white" />
              <div>
                <p className="text-[11px] text-[#8b5cf6] font-semibold">
                  Logo {selectedLogo.index + 1} seleccionado
                </p>
                {selectedLogo.style && (
                  <p className="text-[9px] text-ink-faint truncate max-w-[150px]">{selectedLogo.style}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[#8b5cf6] font-medium text-center">
              Selecciona un logo del canvas para editarlo
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {/* Style variations */}
          <Section
            title="Estilo"
            icon={<Wand2 size={14} />}
            isOpen={activeSection === 'style' || activeSection === 'general'}
            onToggle={() => setActiveSection(activeSection === 'style' ? null : 'style')}
          >
            <p className="text-[10px] text-ink-faint mb-2">
              {selectedLogo ? `Editar logo ${selectedLogo.index + 1}` : 'Selecciona un estilo y se regenerara el logo'}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {LOGO_STYLES.map(style => (
                <button
                  key={style.label}
                  onClick={() => {
                    const prefix = selectedLogo
                      ? `Trabaja SOLO sobre la opcion ${selectedLogo.index + 1} (URL: ${selectedLogo.src}). `
                      : ''
                    onSendMessage(prefix + style.prompt)
                  }}
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
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Auto-open relevant section when element type changes
  useEffect(() => {
    if (!selectedElement) return
    if (selectedElement.isImage) {
      setActiveSection('image')
    } else {
      setActiveSection('text')
    }
  }, [selectedElement?.tag, selectedElement?.isImage])

  // Listen for undo state updates from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'undo-state') {
        setCanUndo(e.data.canUndo)
        setCanRedo(e.data.canRedo)
      }
      if (e.data?.type === 'element-deselected') {
        // Parent will handle clearing selectedElement
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const dispatchToIframe = (action: string) => {
    window.dispatchEvent(new CustomEvent('editor-action', { detail: action }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with undo/redo */}
      <div className="px-4 py-2.5 border-b border-edge flex-shrink-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-[11px] text-blue-600 font-medium">
            Modo edicion activo
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatchToIframe('undo')}
            disabled={!canUndo}
            className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30 rounded transition-colors hover:bg-subtle"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => dispatchToIframe('redo')}
            disabled={!canRedo}
            className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30 rounded transition-colors hover:bg-subtle"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      {/* Section/Element toggle */}
      {detectedSections.length > 0 && (
        <div className="px-4 py-1.5 border-b border-edge flex gap-1">
          <button
            onClick={() => setShowSections(false)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors ${!showSections ? 'bg-blue-500/10 text-blue-600' : 'text-ink-faint hover:text-ink'}`}
          >
            <MousePointer size={11} /> Elemento
          </button>
          <button
            onClick={() => setShowSections(true)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors ${showSections ? 'bg-blue-500/10 text-blue-600' : 'text-ink-faint hover:text-ink'}`}
          >
            <LayoutGrid size={11} /> Secciones ({detectedSections.length})
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {showSections && detectedSections.length > 0 ? (
          <SectionNavigator
            sections={detectedSections}
            onHighlightSection={onHighlightSection || (() => {})}
            onUpdateSectionProp={onUpdateSectionProp || (() => {})}
            onSendMessage={onSendMessage}
          />
        ) : !selectedElement ? (
          <div className="p-6 flex flex-col items-center justify-center text-center gap-4 h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
              <MousePointer size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink mb-1">
                Selecciona un elemento
              </p>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Haz click en cualquier elemento del canvas.<br/>
                Doble-click para editar texto inline.
              </p>
            </div>
            <div className="w-full space-y-1.5 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-subtle rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-ink-faint">Textos y titulos</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-subtle rounded-lg">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[10px] text-ink-faint">Imagenes y media</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-subtle rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-ink-faint">Secciones y layout</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-subtle rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-ink-faint">Botones y enlaces</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {/* Selected element info */}
            <div className="px-3 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500 text-white">
                  {selectedElement.elementLabel || selectedElement.tag.toUpperCase()}
                </span>
                <span className="text-[10px] text-ink-faint">
                  &lt;{selectedElement.tag}&gt;
                </span>
              </div>
              {selectedElement.text && (
                <p className="text-[10px] text-ink-faint mt-1.5 truncate leading-relaxed">
                  "{selectedElement.text}"
                </p>
              )}
            </div>

            {/* Quick actions bar */}
            <div className="flex items-center gap-1 mb-3">
              <button
                onClick={() => dispatchToIframe('delete-element')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Eliminar elemento (Delete)"
              >
                <Trash2 size={11} /> Eliminar
              </button>
              <button
                onClick={() => dispatchToIframe('duplicate-element')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-ink-light bg-subtle hover:bg-edge rounded-lg transition-colors"
                title="Duplicar elemento"
              >
                <Copy size={11} /> Duplicar
              </button>
              <button
                onClick={() => dispatchToIframe('hide-element')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-ink-light bg-subtle hover:bg-edge rounded-lg transition-colors"
                title="Ocultar elemento"
              >
                <EyeOff size={11} /> Ocultar
              </button>
            </div>
            <div className="flex items-center gap-1 mb-3">
              <button
                onClick={() => dispatchToIframe('move-element-up')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-ink-light bg-subtle hover:bg-edge rounded-lg transition-colors"
                title="Mover arriba"
              >
                <ArrowUp size={11} /> Subir
              </button>
              <button
                onClick={() => dispatchToIframe('move-element-down')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-ink-light bg-subtle hover:bg-edge rounded-lg transition-colors"
                title="Mover abajo"
              >
                <ArrowDown size={11} /> Bajar
              </button>
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

                {/* Font family */}
                <div className="mt-3">
                  <label className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Fuente</label>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {FONT_FAMILIES.map(font => (
                      <button
                        key={font.label}
                        onClick={() => {
                          onApplyStyle({ fontFamily: font.value })
                          // Inject Google Font into iframe if not already loaded
                          const fontName = font.label.replace(/ /g, '+')
                          window.dispatchEvent(new CustomEvent('inject-font-to-iframe', { detail: fontName }))
                          // Also send directly to all iframes (for WebContainer dev projects)
                          document.querySelectorAll('iframe').forEach(f => f.contentWindow?.postMessage({ type: 'inject-font', fontName }, '*'))
                        }}
                        className="px-2 py-1 text-[10px] text-ink-light bg-subtle hover:bg-edge rounded transition-colors"
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
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
                <button
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = async () => {
                      const file = input.files?.[0]
                      if (!file) return
                      const formData = new FormData()
                      formData.append('file', file)
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData, headers: { Authorization: `Bearer ${localStorage.getItem('plury_token')}` } })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.url) {
                            onReplaceImage(data.url, file.name)
                          }
                        }
                      } catch (e) {
                        console.error('Upload error:', e)
                      }
                    }
                    input.click()
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-ink bg-subtle hover:bg-edge rounded-lg transition-colors mt-1.5"
                >
                  <ImageIcon size={14} /> Subir desde mi PC
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
