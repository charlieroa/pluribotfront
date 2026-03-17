import { Type, ImageIcon, Palette, Trash2 } from 'lucide-react'

export interface SelectedElement {
  tag: string
  text: string
  isImage: boolean
  imageSrc: string | null
  rect: { top: number; left: number; width: number; height: number }
  classes: string
  /** Human-readable label from edit overlay (e.g. "Imagen", "Titulo H1", "Boton") */
  elementLabel?: string
}

interface VisualEditToolbarProps {
  selectedElement: SelectedElement
  onEditText: () => void
  onChangeImage: () => void
  onChangeColor: (color: string) => void
  onDelete?: () => void
  position: { top: number; left: number }
}

const ELEMENT_COLORS: Record<string, string> = {
  'Imagen': '#a855f7',
  'Video': '#a855f7',
  'SVG': '#a855f7',
  'Navegacion': '#10b981',
  'Header': '#10b981',
  'Footer': '#10b981',
  'Seccion': '#10b981',
  'Principal': '#10b981',
  'Hero': '#10b981',
  'Enlace': '#f59e0b',
  'Boton': '#f59e0b',
  'Campo': '#f59e0b',
  'Tarjeta': '#6366f1',
  'Bloque': '#6366f1',
}

const VisualEditToolbar = ({ selectedElement, onEditText, onChangeImage, onChangeColor, onDelete, position }: VisualEditToolbarProps) => {
  const label = selectedElement.elementLabel || selectedElement.tag
  const accentColor = ELEMENT_COLORS[label] || '#3b82f6'

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 px-1.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl"
      style={{
        top: Math.max(4, position.top - 48),
        left: Math.max(4, position.left),
      }}
    >
      {/* Element type badge */}
      <span
        className="text-[9px] font-bold px-2 py-0.5 rounded mr-1 text-white"
        style={{ backgroundColor: accentColor }}
      >
        {label}
      </span>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />

      {!selectedElement.isImage && (
        <button
          onClick={onEditText}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
          title="Doble-click para editar texto inline"
        >
          <Type size={13} /> Editar
        </button>
      )}
      {selectedElement.isImage && (
        <button
          onClick={onChangeImage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-md transition-colors"
        >
          <ImageIcon size={13} /> Cambiar
        </button>
      )}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
        title="Cambiar color"
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'color'
          input.value = '#3b82f6'
          input.addEventListener('input', (e) => {
            onChangeColor((e.target as HTMLInputElement).value)
          })
          input.click()
        }}
      >
        <Palette size={13} /> Color
      </button>
      {onDelete && (
        <>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
            title="Eliminar (Delete)"
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  )
}

export default VisualEditToolbar
