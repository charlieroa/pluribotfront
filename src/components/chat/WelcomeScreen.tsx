import { useRef, useState, useEffect, type FormEvent } from 'react'
import { ArrowUp, Paperclip, X, Globe } from 'lucide-react'

interface WelcomeScreenProps {
  quickActions: { id: string; title: string; icon: React.ReactElement; desc: string }[]
  inputText: string
  setInputText: (text: string) => void
  onSubmit: (e: FormEvent, imageFile?: File) => void
  onOpenMarketplace?: () => void
  onLoadTemplate?: (templateId: string) => void
}

const suggestions = [
  { text: 'Landing page para mi restaurante', emoji: '🍽️' },
  { text: 'E-commerce de ropa minimalista', emoji: '🛒' },
  { text: 'Dashboard de métricas SaaS', emoji: '📊' },
  { text: 'Portfolio de fotografía', emoji: '🎨' },
  { text: 'Campaña de ads para mi negocio', emoji: '📈' },
  { text: 'Auditoría SEO de mi sitio', emoji: '🔍' },
]

const templates = [
  { id: 'landing', name: 'Landing Page' },
  { id: 'ecommerce', name: 'E-commerce' },
  { id: 'portfolio', name: 'Portfolio' },
  { id: 'blog', name: 'Blog' },
  { id: 'restaurant', name: 'Restaurante' },
  { id: 'saas', name: 'SaaS' },
  { id: 'crm', name: 'CRM' },
  { id: 'booking', name: 'Reservas' },
  { id: 'kanban', name: 'Kanban' },
]

const WelcomeScreen = ({ inputText, setInputText, onSubmit, onLoadTemplate }: WelcomeScreenProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templateMenuRef = useRef<HTMLDivElement>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

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

  useEffect(() => {
    if (inputText && textareaRef.current) {
      textareaRef.current.focus()
      const len = inputText.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as FormEvent, selectedImage ?? undefined)
      clearImage()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-3">
          ¿Qué vas a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#43f1f2]">crear</span>
          {' '}hoy?
        </h1>
        <p className="text-ink-faint text-sm sm:text-base max-w-lg mx-auto">
          Describe tu idea y nuestros agentes la construyen.
        </p>
      </div>

      {/* Input — ChatGPT/Gemini style */}
      <div className="w-full max-w-[680px] mb-8">
        <div className="bg-subtle rounded-3xl border border-edge focus-within:border-ink-faint/30 transition-colors shadow-sm">
          {/* Image preview inside box */}
          {imagePreview && (
            <div className="px-5 pt-4">
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-edge" />
                <button type="button" onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => { setInputText(e.target.value); autoResize(e.target) }}
            onKeyDown={handleKeyDown}
            placeholder="Describe lo que quieres crear..."
            rows={2}
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint/50 px-6 pt-5 pb-2 resize-none focus:outline-none min-h-[60px] max-h-[200px] leading-relaxed"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-0.5">
              {/* Attach */}
              <input ref={fileInputRef} id="welcome-image-upload" type="file" accept="image/*" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f) }} />
              <label htmlFor="welcome-image-upload" className="p-2 text-ink-faint hover:text-ink transition-colors rounded-full hover:bg-surface cursor-pointer inline-flex" title="Adjuntar imagen">
                <Paperclip size={18} />
              </label>

              {/* Template select */}
              {onLoadTemplate && (
                <div className="relative" ref={templateMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="p-2 text-ink-faint hover:text-ink transition-colors rounded-full hover:bg-surface"
                    title="Plantillas"
                  >
                    <Globe size={18} />
                  </button>

                  {showTemplates && (
                    <div className="absolute bottom-full left-0 mb-2 bg-surface border border-edge rounded-2xl shadow-xl overflow-hidden z-50 w-48 animate-[fadeUp_0.15s_ease-out]">
                      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                      <p className="px-4 py-2.5 text-[11px] font-semibold text-ink-faint border-b border-edge">Empezar con plantilla</p>
                      {templates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setShowTemplates(false); onLoadTemplate(t.id) }}
                          className="w-full text-left px-4 py-2 text-[13px] text-ink hover:bg-subtle transition-colors"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Send */}
            <button
              type="button"
              onClick={(e) => { onSubmit(e as unknown as FormEvent, selectedImage ?? undefined); clearImage() }}
              disabled={!inputText.trim() && !selectedImage}
              className="w-9 h-9 rounded-full bg-ink text-surface flex items-center justify-center hover:opacity-80 disabled:opacity-15 disabled:cursor-default transition-all dark:bg-white dark:text-black"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-[680px] w-full">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => setInputText(s.text)} className="flex items-start gap-2.5 px-4 py-3 text-left text-[13px] text-ink-faint bg-subtle border border-edge rounded-2xl hover:border-ink-faint/30 hover:text-ink hover:bg-surface transition-all">
            <span className="text-base mt-0.5">{s.emoji}</span>
            <span className="leading-snug">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default WelcomeScreen
