import { useState } from 'react'
import LandingNavbar from './LandingNavbar'
import HeroSection from './HeroSection'
import CompaniesBar from './CompaniesBar'
import HowItWorksSection from './HowItWorksSection'
import FeaturesSection from './FeaturesSection'
import AgencySection from './AgencySection'
import TestimonialsSection from './TestimonialsSection'
import ShowcaseSection from './ShowcaseSection'
import PricingSection from './PricingSection'
import CtaSection from './CtaSection'
import LandingFooter from './LandingFooter'
import AuthModal from './AuthModal'

const LandingPage = () => {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')

  const openLogin = () => {
    setAuthMode('login')
    setAuthOpen(true)
  }

  const openRegister = () => {
    setAuthMode('register')
    setAuthOpen(true)
  }

  const handlePromptClick = (prompt?: string) => {
    if (prompt) {
      localStorage.setItem('plury_pending_prompt', prompt)
    }
    openRegister()
  }

  return (
    <div className="min-h-screen bg-[#09090b] font-['Plus_Jakarta_Sans'] text-zinc-50 selection:bg-purple-500/30">
      <div id="landing-scroll" className="h-screen overflow-y-auto scroll-smooth">
        <LandingNavbar onLogin={openLogin} onRegister={openRegister} />
        <HeroSection onPromptClick={handlePromptClick} />
        <CompaniesBar />
        <HowItWorksSection />
        <FeaturesSection />
        <AgencySection onRegister={openRegister} />
        <TestimonialsSection />
        <ShowcaseSection />
        <PricingSection onRegister={openRegister} />
        <CtaSection onRegister={openRegister} />
        <LandingFooter />
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </div>
  )
}

export default LandingPage
