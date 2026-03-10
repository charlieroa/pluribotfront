import { useState, useEffect } from 'react'
import { Menu, X, ChevronRight } from 'lucide-react'

interface LandingNavbarProps {
  onLogin: () => void
  onRegister: () => void
}

const LandingNavbar = ({ onLogin, onRegister }: LandingNavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const scroller = document.getElementById('landing-scroll')
    if (!scroller) return
    const handleScroll = () => setScrolled(scroller.scrollTop > 20)
    scroller.addEventListener('scroll', handleScroll)
    return () => scroller.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent'}`}>
      <div className="max-w-[1240px] mx-auto px-6 h-[80px] flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
          <img src="/logo-light.png" alt="Plury" className="h-20" />
        </div>

        {/* Center links */}
        <div className="hidden lg:flex items-center gap-0.5">
          {[
            { label: 'Soluciones', id: 'soluciones' },
            { label: 'Agencias', id: 'agencias' },
            { label: 'Precios', id: 'precios' },
            { label: 'Comunidad', id: 'comunidad' },
          ].map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)} className="px-3.5 py-1.5 text-[13.5px] text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04] font-medium">
              {l.label}
            </button>
          ))}
        </div>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-2.5">
          <button onClick={onLogin} className="px-4 py-[7px] text-[13.5px] text-zinc-400 hover:text-white transition-colors font-medium">
            Iniciar sesion
          </button>
          <button onClick={onRegister} className="group inline-flex items-center gap-1.5 px-5 py-[8px] text-[13.5px] font-semibold text-white bg-[#8b5cf6] rounded-full hover:bg-[#7c3aed] transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            Empezar gratis <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-zinc-400 hover:text-white">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#09090b] border-t border-white/[0.06] px-6 pb-5 pt-3 space-y-1">
          {['Soluciones', 'Agencias', 'Precios', 'Comunidad'].map((l, i) => (
            <button key={i} onClick={() => scrollTo(l.toLowerCase())} className="block w-full text-left text-[14px] text-zinc-400 hover:text-white py-2.5 font-medium">{l}</button>
          ))}
          <hr className="border-white/[0.06] !my-3" />
          <button onClick={() => { onLogin(); setMobileOpen(false) }} className="block w-full text-left text-[14px] text-zinc-400 hover:text-white py-2.5 font-medium">Iniciar sesion</button>
          <button onClick={() => { onRegister(); setMobileOpen(false) }} className="w-full py-2.5 text-[14px] font-semibold text-white bg-[#8b5cf6] rounded-full mt-2">Empezar gratis</button>
        </div>
      )}
    </nav>
  )
}

export default LandingNavbar
