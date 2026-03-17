import { useState, useRef, useEffect } from 'react'
import { LogIn, UserPlus, LogOut, Shield, Menu, Bell, Rocket, Palette, Sparkles, Globe, BarChart3, Settings, Moon, Sun, Zap, ChevronDown, ListTodo } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import AuthModal from '../auth/AuthModal'

interface HeaderProps {
  isCoordinating: boolean
  completionFlash?: boolean
  onMobileMenuToggle?: () => void
  onNewChat?: () => void
  onOpenSettings?: () => void
  onOpenAdmin?: () => void
  onOpenTasks?: () => void
  taskCount?: number
  activeTaskCount?: number
}

const shortcuts = [
  { id: 'landing', title: 'Crear una Landing', icon: Rocket, prompt: 'Quiero crear una landing page profesional' },
  { id: 'logo', title: 'Crear un Logo', icon: Palette, prompt: 'Quiero crear un logo profesional para mi marca' },
  { id: 'social', title: 'Post para Redes', icon: Sparkles, prompt: 'Quiero crear un post para redes sociales' },
  { id: 'seo', title: 'Analizar mi Web', icon: Globe, prompt: 'Quiero un analisis SEO completo de mi web' },
  { id: 'ads', title: 'Nueva Pauta', icon: BarChart3, prompt: 'Quiero crear una nueva pauta publicitaria' },
]

const Header = ({ isCoordinating, completionFlash, onMobileMenuToggle, onNewChat, onOpenSettings, onOpenAdmin, onOpenTasks, taskCount = 0, activeTaskCount = 0 }: HeaderProps) => {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const shortcutsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const openLogin = () => { setAuthMode('login'); setShowAuthModal(true) }
  const openRegister = () => { setAuthMode('register'); setShowAuthModal(true) }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShowShortcuts(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleShortcut = (prompt: string) => {
    setShowShortcuts(false)
    onNewChat?.()
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('plury:shortcut', { detail: prompt }))
    }, 100)
  }

  const isAdmin = user && ['superadmin', 'org_admin', 'agent'].includes(user.role || '')

  // Credit info
  const creditInfo = user?.creditBalance != null ? (() => {
    const planCredits: Record<string, number> = { starter: 50, pro: 500, agency: 2500, enterprise: 10000 }
    const max = planCredits[user.planId] ?? 100
    const balance = Math.max(0, user.creditBalance)
    const isLow = (balance / max) * 100 < 20
    return { balance, max, isLow }
  })() : null

  return (
    <>
      <header className="h-12 border-b border-edge px-4 md:px-6 flex items-center justify-between bg-surface">
        {/* Left */}
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button onClick={onMobileMenuToggle} className="md:hidden p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all">
              <Menu size={20} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-ink text-sm">Plury</h2>
              <span className={`flex items-center gap-1 text-[10px] font-semibold transition-colors duration-500 ${completionFlash ? 'text-emerald-400' : isCoordinating ? 'text-amber-500' : 'text-[#43f1f2]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${completionFlash ? 'bg-emerald-400 animate-ping' : isCoordinating ? 'bg-amber-500 animate-pulse' : 'bg-[#43f1f2]'}`} />
                {completionFlash ? 'Completado' : isCoordinating ? 'Trabajando...' : 'Listo'}
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Credits badge (inline) */}
          {creditInfo && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-subtle mr-1">
              <Zap size={10} className={creditInfo.isLow ? 'text-red-500' : 'text-primary'} />
              <span className={`text-[10px] font-bold ${creditInfo.isLow ? 'text-red-500' : 'text-ink-light'}`}>
                {creditInfo.balance}
              </span>
            </div>
          )}

          {user && onOpenTasks && (
            <button
              onClick={onOpenTasks}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-subtle hover:bg-surface-alt transition-all mr-1"
              title="Abrir mis tareas"
            >
              <ListTodo size={13} className={activeTaskCount > 0 ? 'text-amber-500' : 'text-primary'} />
              <span className="text-[11px] font-semibold text-ink">Mis tareas</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTaskCount > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                {taskCount}
              </span>
            </button>
          )}

          {/* Shortcuts bell */}
          {user && (
            <div className="relative" ref={shortcutsRef}>
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="relative p-2 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
              </button>

              {showShortcuts && (
                <div className="absolute top-full right-0 mt-1.5 bg-surface border border-edge rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-[fadeSlideIn_0.15s_ease-out]">
                  <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                  <p className="px-4 py-2 text-[10px] font-bold text-ink-faint uppercase tracking-wider border-b border-edge">Crear rapido</p>
                  {shortcuts.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleShortcut(s.prompt)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle transition-colors"
                    >
                      <s.icon size={15} className="text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-ink">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User avatar dropdown */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-subtle transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-fg text-[11px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-ink max-w-[100px] truncate">{user.name}</span>
                <ChevronDown size={12} className="text-ink-faint hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-1.5 bg-surface border border-edge rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-[fadeSlideIn_0.15s_ease-out]">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-edge">
                    <p className="text-sm font-bold text-ink truncate">{user.name}</p>
                    <p className="text-[11px] text-ink-faint truncate">{user.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-[#a78bfa]/10 text-[#8b5cf6] rounded-full">
                        {user.role === 'superadmin' ? 'Super Admin' : user.role === 'org_admin' ? 'Org Admin' : 'Agente'}
                      </span>
                    )}
                  </div>

                  {/* Credit bar */}
                  {creditInfo && (
                    <div className="px-4 py-2 border-b border-edge">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="flex items-center gap-0.5 font-medium text-ink-faint">
                          <Zap size={9} className={creditInfo.isLow ? 'text-red-500' : 'text-primary'} />
                          Creditos
                        </span>
                        <span className={`font-bold ${creditInfo.isLow ? 'text-red-500' : 'text-ink-light'}`}>
                          {creditInfo.balance} / {creditInfo.max}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-inset">
                        <div
                          className={`h-full rounded-full transition-all ${creditInfo.isLow ? 'bg-red-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min((creditInfo.balance / creditInfo.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); onOpenSettings?.() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle transition-colors"
                    >
                      <Settings size={15} className="text-ink-faint" />
                      <span className="text-sm font-medium text-ink">Ajustes</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowUserMenu(false); onOpenAdmin?.() }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle transition-colors"
                      >
                        <Shield size={15} className="text-[#8b5cf6]" />
                        <span className="text-sm font-medium text-ink">Panel Admin</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setShowUserMenu(false); toggle() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle transition-colors"
                    >
                      {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-ink-faint" />}
                      <span className="text-sm font-medium text-ink">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
                    </button>
                  </div>

                  <div className="border-t border-edge py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); logout() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={15} className="text-red-500" />
                      <span className="text-sm font-medium text-red-500">Cerrar sesion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={openLogin}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold text-ink-light hover:text-ink transition-colors rounded-lg hover:bg-subtle"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Iniciar sesion</span>
              </button>
              <button
                onClick={openRegister}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] rounded-lg hover:from-[#7c3aed] hover:to-[#6d28d9] transition-all shadow-sm"
              >
                <UserPlus size={14} />
                <span className="hidden sm:inline">Registrate gratis</span>
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
