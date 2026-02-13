import { useState, useRef, useEffect, type FormEvent, type DragEvent } from 'react'
import { Send, ChevronDown, Sparkles, Paperclip, X } from 'lucide-react'
import { AVAILABLE_MODELS } from '../../types'

interface ChatInputProps {
  inputText: string
  setInputText: (text: string) => void
  isCoordinating: boolean
  onSubmit: (e: FormEvent, imageFile?: File) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  refineMode?: boolean
  refineAgentName?: string
}

const ChatInput = ({ inputText, setInputText, isCoordinating, onSubmit, selectedModel, onModelChange, refineMode, refineAgentName }: ChatInputProps) => {
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAuto = selectedModel === 'auto'
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleImageSelect = (file: File) => {
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleImageSelect(file)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(e, selectedImage ?? undefined)
    clearImage()
  }

  return (
    <div className="p-3 md:p-6 border-t border-edge-soft bg-surface">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 flex items-center gap-2 px-4">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-edge" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
          <span className="text-xs text-ink-faint">{selectedImage?.name}</span>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center gap-3 bg-subtle border rounded-2xl p-2 pl-4 transition-colors ${isDragging ? 'border-primary bg-primary-soft' : 'border-edge'}`}
      >
        {/* Model selector */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowModelMenu(!showModelMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
              isAuto
                ? 'text-white bg-gradient-to-r from-purple-500 to-indigo-500 border border-purple-400 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/25 dark:from-purple-600 dark:to-indigo-600 dark:border-purple-500 dark:hover:from-purple-700 dark:hover:to-indigo-700'
                : 'text-ink-light bg-surface border border-edge hover:bg-surface-alt'
            }`}
          >
            {isAuto && <Sparkles size={12} />}
            {isAuto ? 'Auto' : currentModel?.name ?? 'Auto'}
            <ChevronDown size={12} />
          </button>

          {showModelMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-surface border border-edge rounded-xl shadow-lg overflow-hidden z-50 min-w-[200px]">
              {/* Auto option */}
              <button
                type="button"
                onClick={() => {
                  onModelChange?.('auto')
                  setShowModelMenu(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2 ${
                  isAuto
                    ? 'bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/40 dark:text-purple-400'
                    : 'text-ink hover:bg-subtle font-medium'
                }`}
              >
                <Sparkles size={14} className={isAuto ? 'text-purple-500' : 'text-ink-faint'} />
                <div>
                  <p>Auto</p>
                  <p className="text-[10px] text-ink-faint mt-0.5">La IA elige el mejor modelo</p>
                </div>
              </button>

              {/* Separator */}
              <div className="border-t border-edge mx-3 my-1" />

              {/* Manual models */}
              {AVAILABLE_MODELS.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onModelChange?.(model.id)
                    setShowModelMenu(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                    model.id === selectedModel
                      ? 'bg-primary-soft text-primary font-bold'
                      : 'text-ink hover:bg-subtle font-medium'
                  }`}
                >
                  <p>{model.name}</p>
                  <p className="text-[10px] text-ink-faint mt-0.5">{model.provider === 'anthropic' ? 'Anthropic' : model.provider === 'google' ? 'Google' : 'OpenAI'}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={inputText}
          disabled={isCoordinating}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={refineMode ? `Pide cambios a ${refineAgentName ?? 'Pixel'}... (ej: "mas oscuro", "cambia los colores")` : isCoordinating ? 'Los agentes estan dialogando...' : 'Escribe instrucciones para Pluribots...'}
          className="flex-1 bg-transparent border-none outline-none text-sm py-2 text-ink placeholder:text-ink-faint disabled:opacity-40"
        />

        {/* Image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f) }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-ink-faint hover:text-ink transition-colors rounded-lg hover:bg-surface"
          title="Adjuntar imagen"
        >
          <Paperclip size={18} />
        </button>

        <button
          type="submit"
          disabled={isCoordinating}
          className="bg-primary text-primary-fg p-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-500/10 disabled:bg-inset disabled:shadow-none"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

export default ChatInput
