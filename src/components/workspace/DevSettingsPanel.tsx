import { useState, useEffect, useCallback } from 'react'
import { Palette, Type, Building, FileText } from 'lucide-react'
import type { Deliverable } from '../../types'

interface DevSettingsPanelProps {
  deliverable: Deliverable
  iframeRef: React.RefObject<HTMLIFrameElement> | null
  conversationId?: string
}

const GOOGLE_FONTS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Plus Jakarta Sans',
  'DM Sans',
  'Nunito',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Raleway',
  'Source Sans 3',
  'Work Sans',
  'Outfit',
  'Space Grotesk',
  'Manrope',
]

const DevSettingsPanel = ({ deliverable, iframeRef, conversationId }: DevSettingsPanelProps) => {
  // Color state
  const [primaryColor, setPrimaryColor] = useState('#1e293b')
  const [secondaryColor, setSecondaryColor] = useState('#f1f5f9')
  const [accentColor, setAccentColor] = useState('#3b82f6')
  const [bgColor, setBgColor] = useState('#ffffff')

  // Font state
  const [fontFamily, setFontFamily] = useState('Poppins')

  // Branding state
  const [brandName, setBrandName] = useState('')
  const [brandTagline, setBrandTagline] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [brandCta, setBrandCta] = useState('')


  // Parse current deliverable HTML for existing values
  useEffect(() => {
    const html = deliverable.content
    // Extract brand values from data attributes
    const nameMatch = html.match(/data-brand-name[^>]*>([^<]+)</)
    if (nameMatch) setBrandName(nameMatch[1])
    const taglineMatch = html.match(/data-brand-tagline[^>]*>([^<]+)</)
    if (taglineMatch) setBrandTagline(taglineMatch[1])
    const ctaMatch = html.match(/data-brand-cta[^>]*>([^<]+)</)
    if (ctaMatch) setBrandCta(ctaMatch[1])
    const logoMatch = html.match(/data-brand-logo[^>]*src="([^"]+)"/)
    if (logoMatch) setBrandLogo(logoMatch[1])

    // Extract font from Google Fonts link
    const fontMatch = html.match(/fonts\.googleapis\.com\/css2\?family=([^:&]+)/)
    if (fontMatch) setFontFamily(decodeURIComponent(fontMatch[1]).replace(/\+/g, ' '))

    // Extract primary color from tailwind config
    const primaryMatch = html.match(/primary:\s*\{\s*DEFAULT:\s*['"]([^'"]+)['"]/)
    if (primaryMatch) {
      // It's HSL, just keep current default
    }
  }, [deliverable.id])


  const applyTheme = useCallback(() => {
    const theme = {
      colors: {
        primary: { DEFAULT: primaryColor, foreground: '#ffffff' },
        secondary: { DEFAULT: secondaryColor, foreground: '#1e293b' },
        accent: { DEFAULT: accentColor, foreground: '#ffffff' },
        background: bgColor,
      },
      fontFamily,
      brand: {
        name: brandName,
        tagline: brandTagline,
        logo: brandLogo,
        cta: brandCta,
      },
    }

    // Dispatch custom event for ProjectWorkspace to pick up (multi-file projects)
    window.dispatchEvent(new CustomEvent('dev-theme-update', { detail: theme }))

    // Also send postMessage for single-file HTML iframes
    const message = { type: 'apply-theme', theme }
    if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*')
    } else {
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        iframe.contentWindow?.postMessage(message, '*')
      })
    }
  }, [primaryColor, secondaryColor, accentColor, bgColor, fontFamily, brandName, brandTagline, brandLogo, brandCta, iframeRef])

  // Auto-apply on any change
  useEffect(() => {
    const timeout = setTimeout(applyTheme, 300)
    return () => clearTimeout(timeout)
  }, [applyTheme])

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-6">
        {/* Colors */}
        <section>
          <h3 className="flex items-center gap-2 text-xs font-bold text-ink mb-3">
            <Palette size={14} className="text-amber-500" />
            Colores
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker label="Primary" value={primaryColor} onChange={setPrimaryColor} />
            <ColorPicker label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
            <ColorPicker label="Accent" value={accentColor} onChange={setAccentColor} />
            <ColorPicker label="Background" value={bgColor} onChange={setBgColor} />
          </div>
        </section>

        {/* Font */}
        <section>
          <h3 className="flex items-center gap-2 text-xs font-bold text-ink mb-3">
            <Type size={14} className="text-amber-500" />
            Tipografia
          </h3>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-subtle border border-edge rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            {GOOGLE_FONTS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </section>

        {/* Branding */}
        <section>
          <h3 className="flex items-center gap-2 text-xs font-bold text-ink mb-3">
            <Building size={14} className="text-amber-500" />
            Branding
          </h3>
          <div className="space-y-2">
            <BrandInput label="Nombre empresa" value={brandName} onChange={setBrandName} placeholder="Mi Empresa" />
            <BrandInput label="Tagline" value={brandTagline} onChange={setBrandTagline} placeholder="Tu slogan aqui" />
            <BrandInput label="URL Logo" value={brandLogo} onChange={setBrandLogo} placeholder="https://..." />
            <BrandInput label="Texto CTA" value={brandCta} onChange={setBrandCta} placeholder="Empezar ahora" />
          </div>
        </section>

        {/* Info */}
        <div className="text-[10px] text-ink-faint bg-subtle/50 p-3 rounded-lg">
          <FileText size={12} className="inline mr-1" />
          Los cambios de colores, fuentes y branding se aplican al instante sin consumir creditos de IA.
        </div>
      </div>
    </div>
  )
}

const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-8 h-8 rounded-md border border-edge cursor-pointer bg-transparent p-0"
    />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-ink-faint">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[11px] font-mono text-ink bg-transparent border-none outline-none p-0"
      />
    </div>
  </div>
)

const BrandInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div>
    <label className="text-[10px] font-medium text-ink-faint mb-0.5 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 text-xs bg-subtle border border-edge rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-amber-500/30"
    />
  </div>
)

export default DevSettingsPanel
