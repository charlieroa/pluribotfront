import { useState, useRef, useEffect, type FormEvent, type DragEvent } from 'react'
import { ArrowUp, ChevronDown, Sparkles, Paperclip, X, Square, Image } from 'lucide-react'
import { AVAILABLE_MODELS, AVAILABLE_IMAGE_MODELS } from '../../types'

interface ChatInputProps {
  inputText: string
  setInputText: (text: string) => void
  isCoordinating: boolean
  onSubmit: (e: FormEvent, imageFile?: File) => void
  onAbort?: () => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  selectedImageModel?: string
  onImageModelChange?: (model: string) => void
  referenceImageUrl?: string | null
  onClearReference?: () => void
  refineMode?: boolean
  refineAgentName?: string
  disabledProviders?: string[]
}

const ChatInput = ({ inputText, setInputText, isCoordinating, onSubmit, onAbort, selectedModel, onModelChange, selectedImageModel, onImageModelChange, referenceImageUrl, onClearReference, refineMode, refineAgentName, disabledProviders = [] }: ChatInputProps) => {
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showImageModelMenu, setShowImageModelMenu] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const imageMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const disabledSet = new Set(disabledProviders)
  const availableModels = AVAILABLE_MODELS.filter(m => !disabledSet.has(m.provider))

  const isAuto = selectedModel === 'auto'
  const currentModel = availableModels.find(m => m.id === selectedModel)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false)
      }
      if (imageMenuRef.current && !imageMenuRef.current.contains(e.target as Node)) {
        setShowImageModelMenu(false)
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
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  useEffect(() => {
    const handler = () => {
      textareaRef.current?.focus()
      const length = textareaRef.current?.value.length ?? 0
      textareaRef.current?.setSelectionRange(length, length)
    }
    window.addEventListener('plury:focus-input', handler)
    return () => window.removeEventListener('plury:focus-input', handler)
  }, [])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const getDisplayLabel = () => {
    if (isAuto) return 'Auto'
    return currentModel?.label ?? currentModel?.name ?? 'Auto'
  }

  const isImageAuto = selectedImageModel === 'auto' || !selectedImageModel
  const currentImageModel = AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)
  const getImageDisplayLabel = () => {
    if (isImageAuto) return 'Auto'
    return currentImageModel?.label ?? 'Auto'
  }

  return (
    <div className="p-3 md:p-4 bg-surface">
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-subtle rounded-3xl border transition-colors ${isDragging ? 'border-primary bg-primary-soft' : 'border-edge focus-within:border-ink-faint/30'}`}
      >
        {/* Image preview (uploaded or reference) */}
        {(imagePreview || referenceImageUrl) && (
          <div className="px-5 pt-4 flex gap-2">
            {referenceImageUrl && (
              <div className="relative inline-block">
                <img src={referenceImageUrl} alt="Referencia" className="h-14 w-14 object-cover rounded-xl border-2 border-violet-400" />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">REF</span>
                <button type="button" onClick={onClearReference} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <X size={10} />
                </button>
              </div>
            )}
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-14 w-14 object-cover rounded-xl border border-edge" />
                <button type="button" onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          disabled={isCoordinating}
          onChange={(e) => { setInputText(e.target.value); autoResize(e.target) }}
          onKeyDown={handleKeyDown}
          placeholder={refineMode ? `Pide cambios a ${refineAgentName ?? 'Pixel'}...` : isCoordinating ? 'Los agentes estan trabajando...' : 'Escribe un mensaje...'}
          rows={1}
          className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint/50 px-6 pt-4 pb-1 resize-none focus:outline-none min-h-[44px] max-h-[160px] leading-relaxed disabled:opacity-40"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-0.5">
            {/* Attach */}
            <input
              ref={fileInputRef}
              id="chat-image-upload"
              type="file"
              accept="image/*"
              className="absolute w-0 h-0 opacity-0 overflow-hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f) }}
            />
            <label
              htmlFor="chat-image-upload"
              className="p-2 text-ink-faint hover:text-ink transition-colors rounded-full hover:bg-surface cursor-pointer"
              title="Adjuntar imagen"
            >
              <Paperclip size={18} />
            </label>

            {/* Model selector */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-ink-faint hover:text-ink rounded-full hover:bg-surface transition-colors"
              >
                {isAuto && <Sparkles size={12} className="text-primary" />}
                {getDisplayLabel()}
                <ChevronDown size={11} />
              </button>

              {showModelMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-surface border border-edge rounded-2xl shadow-xl overflow-hidden z-50 min-w-[240px] animate-[fadeUp_0.15s_ease-out]">
                  <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                  <button
                    type="button"
                    onClick={() => { onModelChange?.('auto'); setShowModelMenu(false) }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2 ${
                      isAuto ? 'bg-primary/10 text-primary font-bold' : 'text-ink hover:bg-subtle font-medium'
                    }`}
                  >
                    <Sparkles size={14} className={isAuto ? 'text-primary' : 'text-ink-faint'} />
                    <div>
                      <p className="font-semibold">Auto</p>
                      <p className="text-[10px] text-ink-faint mt-0.5">Elige el mejor modelo</p>
                    </div>
                  </button>
                  <div className="border-t border-edge mx-3 my-0.5" />
                  {availableModels.map(model => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { onModelChange?.(model.id); setShowModelMenu(false) }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        model.id === selectedModel ? 'bg-primary/10 text-primary font-bold' : 'text-ink hover:bg-subtle font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{model.label}</p>
                        <span className="text-[9px] text-ink-faint font-mono">{model.name}</span>
                      </div>
                      <p className="text-[10px] text-ink-faint mt-0.5">{model.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image model selector */}
            <div className="relative" ref={imageMenuRef}>
              <button
                type="button"
                onClick={() => setShowImageModelMenu(!showImageModelMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-ink-faint hover:text-ink rounded-full hover:bg-surface transition-colors"
              >
                <Image size={12} className={isImageAuto ? 'text-ink-faint' : 'text-violet-500'} />
                {getImageDisplayLabel()}
                <ChevronDown size={11} />
              </button>

              {showImageModelMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-surface border border-edge rounded-2xl shadow-xl overflow-hidden z-50 min-w-[220px] animate-[fadeUp_0.15s_ease-out]">
                  <div className="px-4 py-2 text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Modelo de imagen</div>
                  <button
                    type="button"
                    onClick={() => { onImageModelChange?.('auto'); setShowImageModelMenu(false) }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2 ${
                      isImageAuto ? 'bg-violet-500/10 text-violet-600 font-bold' : 'text-ink hover:bg-subtle font-medium'
                    }`}
                  >
                    <Sparkles size={14} className={isImageAuto ? 'text-violet-500' : 'text-ink-faint'} />
                    <div>
                      <p className="font-semibold">Auto</p>
                      <p className="text-[10px] text-ink-faint mt-0.5">Ideogram por defecto</p>
                    </div>
                  </button>
                  <div className="border-t border-edge mx-3 my-0.5" />
                  {AVAILABLE_IMAGE_MODELS.map(model => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { onImageModelChange?.(model.id); setShowImageModelMenu(false) }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        model.id === selectedImageModel ? 'bg-violet-500/10 text-violet-600 font-bold' : 'text-ink hover:bg-subtle font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{model.label}</p>
                        <span className="text-[9px] text-ink-faint font-mono">{model.name}</span>
                      </div>
                      <p className="text-[10px] text-ink-faint mt-0.5">{model.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Send / Abort */}
          {isCoordinating && onAbort ? (
            <button
              type="button"
              onClick={onAbort}
              className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all"
              title="Detener"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isCoordinating || (!inputText.trim() && !selectedImage)}
              className="w-9 h-9 rounded-full bg-ink text-surface flex items-center justify-center hover:opacity-80 disabled:opacity-15 disabled:cursor-default transition-all dark:bg-white dark:text-black"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default ChatInput
