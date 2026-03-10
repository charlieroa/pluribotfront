import { useState } from 'react'
import LandingNavbar from './LandingNavbar'
import HeroSection from './HeroSection'
import CompaniesBar from './CompaniesBar'
import CommunityCarousel from './CommunityCarousel'
import HowItWorksSection from './HowItWorksSection'
import FeaturesSection from './FeaturesSection'
import SeniorSection from './SeniorSection'
import AgencySection from './AgencySection'
import TestimonialsSection from './TestimonialsSection'
import ShowcaseSection from './ShowcaseSection'
import PricingSection from './PricingSection'
import CtaSection from './CtaSection'
import LandingFooter from './LandingFooter'
import AuthModal from './AuthModal'
import ShowcaseGallery from './ShowcaseGallery'

const LandingPage = () => {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [showGallery, setShowGallery] = useState(false)

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

  if (showGallery) {
    return (
      <div className="min-h-screen bg-[#09090b] font-['Plus_Jakarta_Sans'] text-zinc-50">
        <ShowcaseGallery onBack={() => setShowGallery(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] font-['Plus_Jakarta_Sans'] text-zinc-50 selection:bg-[#a78bfa]/30">
      <div id="landing-scroll" className="h-screen overflow-y-auto scroll-smooth">
        <LandingNavbar onLogin={openLogin} onRegister={openRegister} />
        <HeroSection onPromptClick={handlePromptClick} />
        <CompaniesBar />
        <CommunityCarousel onShowGallery={() => setShowGallery(true)} />
        <HowItWorksSection />
        <FeaturesSection />
        <SeniorSection onRegister={openRegister} />
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
