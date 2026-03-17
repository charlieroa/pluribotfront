import { useState, useEffect, useCallback } from 'react'
import { Palette, Type } from 'lucide-react'
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

const DevSettingsPanel = ({ deliverable, iframeRef }: DevSettingsPanelProps) => {
  // Color state
  const [primaryColor, setPrimaryColor] = useState('#1e293b')
  const [secondaryColor, setSecondaryColor] = useState('#f1f5f9')
  const [accentColor, setAccentColor] = useState('#3b82f6')
  const [bgColor, setBgColor] = useState('#ffffff')

  // Font state
  const [fontFamily, setFontFamily] = useState('Poppins')

  // Parse current deliverable for existing font
  useEffect(() => {
    const html = deliverable.content
    const fontMatch = html.match(/fonts\.googleapis\.com\/css2\?family=([^:&]+)/)
    if (fontMatch) setFontFamily(decodeURIComponent(fontMatch[1]).replace(/\+/g, ' '))
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
    }

    // Dispatch custom event for ProjectWorkspace to pick up (multi-file projects)
    window.dispatchEvent(new CustomEvent('dev-theme-update', { detail: theme }))

    // Also send postMessage for iframes
    const message = { type: 'apply-theme', theme }
    if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*')
    } else {
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        iframe.contentWindow?.postMessage(message, '*')
      })
    }
  }, [primaryColor, secondaryColor, accentColor, bgColor, fontFamily, iframeRef])

  // Auto-apply on any change
  useEffect(() => {
    const timeout = setTimeout(applyTheme, 300)
    return () => clearTimeout(timeout)
  }, [applyTheme])

  return (
    <div className="flex-shrink-0 border-b border-edge">
      <div className="p-3 space-y-3">
        {/* Colors — compact inline row */}
        <section>
          <h3 className="flex items-center gap-2 text-[11px] font-bold text-ink mb-2">
            <Palette size={13} className="text-blue-500" />
            Colores
          </h3>
          <div className="flex items-center gap-2">
            <ColorDot label="Pri" value={primaryColor} onChange={setPrimaryColor} />
            <ColorDot label="Sec" value={secondaryColor} onChange={setSecondaryColor} />
            <ColorDot label="Acc" value={accentColor} onChange={setAccentColor} />
            <ColorDot label="Bg" value={bgColor} onChange={setBgColor} />
          </div>
        </section>

        {/* Font — compact select */}
        <section>
          <h3 className="flex items-center gap-2 text-[11px] font-bold text-ink mb-2">
            <Type size={13} className="text-blue-500" />
            Tipografia
          </h3>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-subtle border border-edge rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {GOOGLE_FONTS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </section>
      </div>
    </div>
  )
}

const ColorDot = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex flex-col items-center gap-1 cursor-pointer group flex-1">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-7 h-7 rounded-full border-2 border-edge cursor-pointer bg-transparent p-0 group-hover:border-blue-400 transition-colors"
    />
    <span className="text-[9px] font-medium text-ink-faint">{label}</span>
  </label>
)

export default DevSettingsPanel
