import { Type, ImageIcon, Palette } from 'lucide-react'

export interface SelectedElement {
  tag: string
  text: string
  isImage: boolean
  imageSrc: string | null
  rect: { top: number; left: number; width: number; height: number }
  classes: string
}

interface VisualEditToolbarProps {
  selectedElement: SelectedElement
  onEditText: () => void
  onChangeImage: () => void
  onChangeColor: (color: string) => void
  position: { top: number; left: number }
}

const VisualEditToolbar = ({ selectedElement, onEditText, onChangeImage, onChangeColor, position }: VisualEditToolbarProps) => {
  return (
    <div
      className="absolute z-50 flex items-center gap-1 px-2 py-1.5 bg-surface border border-edge rounded-lg shadow-lg"
      style={{
        top: Math.max(4, position.top - 44),
        left: Math.max(4, position.left),
      }}
    >
      {!selectedElement.isImage && (
        <button
          onClick={onEditText}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-light hover:text-ink hover:bg-subtle rounded-md transition-colors"
          title="Doble-click en el elemento para editar texto"
        >
          <Type size={12} /> Editar texto
        </button>
      )}
      {selectedElement.isImage && (
        <button
          onClick={onChangeImage}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-light hover:text-ink hover:bg-subtle rounded-md transition-colors"
        >
          <ImageIcon size={12} /> Cambiar imagen
        </button>
      )}
      <div className="relative">
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink-light hover:text-ink hover:bg-subtle rounded-md transition-colors"
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
          <Palette size={12} /> Color
        </button>
      </div>
      <span className="text-[9px] text-ink-faint px-1 border-l border-edge ml-1">
        &lt;{selectedElement.tag}&gt;
      </span>
    </div>
  )
}

export default VisualEditToolbar
