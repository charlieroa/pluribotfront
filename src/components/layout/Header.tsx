import { useState } from 'react'
import { LayoutList, Settings, LogIn, UserPlus, Store, LogOut, Bot, Shield, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AuthModal from '../auth/AuthModal'

interface HeaderProps {
  isCoordinating: boolean
  activeTab: string
  onMobileMenuToggle?: () => void
  setActiveTab?: (tab: string) => void
}

const Header = ({ isCoordinating, activeTab, onMobileMenuToggle, setActiveTab: _setActiveTab }: HeaderProps) => {
  const { user, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const isChat = activeTab === 'chat'

  const openLogin = () => { setAuthMode('login'); setShowAuthModal(true) }
  const openRegister = () => { setAuthMode('register'); setShowAuthModal(true) }

  return (
    <>
      <header className="h-14 md:h-16 border-b border-edge px-4 md:px-8 flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3 md:gap-4">
          {onMobileMenuToggle && (
            <button onClick={onMobileMenuToggle} className="md:hidden p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all">
              <Menu size={20} />
            </button>
          )}
          <div className="hidden sm:flex">
            {isChat ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Bot size={20} className="text-white" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-primary-fg ${activeTab === 'admin' ? 'bg-violet-600' : 'bg-primary'}`}>
                {activeTab === 'marketplace' ? <Store size={20} /> : activeTab === 'portfolio' ? <LayoutList size={20} /> : activeTab === 'tasks' ? <LayoutList size={20} /> : activeTab === 'admin' ? <Shield size={20} /> : <Settings size={20} />}
              </div>
            )}
          </div>
          <div>
            <h2 className="font-bold text-ink text-sm md:text-base">
              {isChat ? 'Pluribots' : activeTab === 'marketplace' ? 'Marketplace' : activeTab === 'portfolio' ? 'Proyectos' : activeTab === 'tasks' ? 'Tareas' : activeTab === 'admin' ? 'Admin' : 'Ajustes'}
            </h2>
            {isChat ? (
              <p className={`text-xs font-semibold flex items-center gap-1 ${isCoordinating ? 'text-amber-500' : 'text-emerald-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCoordinating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                {isCoordinating ? 'Trabajando en tu proyecto...' : 'Tu equipo esta listo'}
              </p>
            ) : (
              <p className="text-xs text-ink-faint">
                {activeTab === 'marketplace' ? 'Arma tu equipo de agentes IA' : activeTab === 'portfolio' ? 'Ejemplos de lo que puedes crear' : activeTab === 'tasks' ? 'Monitoreo en tiempo real' : activeTab === 'admin' ? 'Supervisión de conversaciones' : 'Preferencias y perfil'}
              </p>
            )}
          </div>
        </div>

        {/* Auth section */}
        <div className="flex items-center gap-1 md:gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-ink">{user.name}</span>
                {['superadmin', 'org_admin', 'agent'].includes(user.role || '') && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-violet-500/10 text-violet-600 rounded-full">
                    {user.role === 'superadmin' ? 'Super Admin' : user.role === 'org_admin' ? 'Org Admin' : 'Agente'}
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold text-ink-light hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openLogin}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold text-ink-light hover:text-ink transition-colors rounded-lg hover:bg-subtle"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </button>
              <button
                onClick={openRegister}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm"
              >
                <UserPlus size={14} />
                <span className="hidden sm:inline">Regístrate gratis</span>
              </button>
            </>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode={authMode} />
    </>
  )
}

export default Header
