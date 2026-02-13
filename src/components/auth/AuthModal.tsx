import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import BotAvatar3D from '../avatars/BotAvatar3D'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'register'
}

const AuthModal = ({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) => {
  const { login, register, error, user } = useAuth()
  const [isRegister, setIsRegister] = useState(defaultMode === 'register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRegister(defaultMode === 'register')
      setEmail('')
      setPassword('')
      setName('')
    }
  }, [isOpen, defaultMode])

  // Close on successful login/register
  useEffect(() => {
    if (user && isOpen) {
      onClose()
    }
  }, [user, isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, name)
      } else {
        await login(email, password)
      }
    } catch {
      // error is set in context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 animate-in fade-in zoom-in-95">
        <div className="bg-surface border border-edge rounded-2xl p-6 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-ink-faint hover:text-ink transition-colors rounded-lg hover:bg-subtle"
          >
            <X size={16} />
          </button>

          <div className="text-center mb-6">
            <div className="mx-auto mb-2 flex justify-center">
              <BotAvatar3D seed="Pluria" color="#6366f1" isActive={true} size="md" />
            </div>
            <h2 className="text-lg font-bold text-ink">
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesion'}
            </h2>
            <p className="text-xs text-ink-faint mt-1">Agentes IA que trabajan por ti</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-subtle border border-edge rounded-xl outline-none focus:border-primary text-ink placeholder:text-ink-faint"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-2.5 text-sm bg-subtle border border-edge rounded-xl outline-none focus:border-primary text-ink placeholder:text-ink-faint"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-2.5 text-sm bg-subtle border border-edge rounded-xl outline-none focus:border-primary text-ink placeholder:text-ink-faint"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-fg text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
