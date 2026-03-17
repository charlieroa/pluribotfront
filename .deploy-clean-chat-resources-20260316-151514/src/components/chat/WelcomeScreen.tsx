import { useRef, useState, useEffect, type FormEvent } from 'react'
import { ArrowUp, Paperclip, X, Globe, Sparkles } from 'lucide-react'

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
  { id: 'delivery', name: 'Delivery' },
  { id: 'saas', name: 'SaaS' },
  { id: 'crm', name: 'CRM' },
  { id: 'chatflow', name: 'Chatflow' },
  { id: 'mobility', name: 'Uber Simple' },
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
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
      {/* Heading — encima de la caja, Gemini style */}
      <div className="w-full max-w-[760px] text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-primary/15 bg-primary/6 text-[12px] font-semibold text-primary">
          <Sparkles size={13} />
          Crea marca, contenido y producto desde una idea
        </div>
        <h1 className="text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink">
          Convierte una idea
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#6366f1]">
            en recursos listos para lanzar.
          </span>
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] leading-relaxed text-ink-faint max-w-[640px] mx-auto">
          Pide un logo, una web, un SaaS, un video o una campana y sigue refinando todo desde el mismo chat.
        </p>
      </div>

      {/* Input box — protagonista */}
      <div className="w-full max-w-[680px] mb-5">
        <div className="bg-subtle rounded-3xl border border-edge focus-within:border-primary/30 focus-within:shadow-lg focus-within:shadow-primary/5 transition-all shadow-sm">
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

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => { setInputText(e.target.value); autoResize(e.target) }}
            onKeyDown={handleKeyDown}
            placeholder="Una landing para mi negocio, un logo, una app..."
            rows={2}
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint/40 px-6 pt-5 pb-2 resize-none focus:outline-none min-h-[60px] max-h-[200px] leading-relaxed"
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-0.5">
              <input ref={fileInputRef} id="welcome-image-upload" type="file" accept="image/*" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f) }} />
              <label htmlFor="welcome-image-upload" className="p-2 text-ink-faint hover:text-ink transition-colors rounded-full hover:bg-surface cursor-pointer inline-flex" title="Adjuntar imagen">
                <Paperclip size={18} />
              </label>
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

      {/* Suggestions — pills debajo */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[680px] w-full">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => setInputText(s.text)} className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-ink-faint bg-surface border border-edge rounded-full hover:border-primary/25 hover:text-ink transition-all">
            <span>{s.emoji}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default WelcomeScreen
