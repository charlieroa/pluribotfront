import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'register'
}

const AuthModal = ({ isOpen, onClose, defaultMode = 'register' }: AuthModalProps) => {
  const { login, register, error, user } = useAuth()
  const [isRegister, setIsRegister] = useState(defaultMode === 'register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsRegister(defaultMode === 'register')
      setEmail('')
      setPassword('')
      setName('')
      setLoading(false)
    }
  }, [defaultMode, isOpen])

  useEffect(() => {
    if (user && isOpen) {
      onClose()
    }
  }, [user, isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const toggleMode = () => {
    setIsRegister(prev => !prev)
    setEmail('')
    setPassword('')
    setName('')
  }

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
      // error set in context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[400px] bg-[#141416] border border-white/[0.08] rounded-2xl p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors">
          <X size={18} />
        </button>

        <div className="text-center mb-7">
          <img src="/logo-light.png" alt="Plury" className="h-10 mx-auto mb-3" />
          <h2 className="text-[20px] font-bold text-white">
            {isRegister ? 'Crea tu cuenta gratis' : 'Bienvenido de vuelta'}
          </h2>
          <p className="text-[13px] text-zinc-500 mt-1">
            {isRegister ? 'Empieza a crear con IA en minutos' : 'Inicia sesión para continuar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="text-[11.5px] font-medium text-zinc-500 mb-1 block">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full px-3.5 py-2.5 text-[13.5px] bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none focus:border-[#a78bfa]/50 focus:ring-2 focus:ring-[#a78bfa]/10 text-white placeholder:text-zinc-400 transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-[11.5px] font-medium text-zinc-500 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full px-3.5 py-2.5 text-[13.5px] bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none focus:border-[#a78bfa]/50 focus:ring-2 focus:ring-[#a78bfa]/10 text-white placeholder:text-zinc-400 transition-all"
            />
          </div>

          <div>
            <label className="text-[11.5px] font-medium text-zinc-500 mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 text-[13.5px] bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none focus:border-[#a78bfa]/50 focus:ring-2 focus:ring-[#a78bfa]/10 text-white placeholder:text-zinc-400 transition-all"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-black text-[13.5px] font-semibold rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Cargando...' : isRegister ? 'Crear cuenta gratis' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={toggleMode}
            className="text-[12.5px] text-[#a78bfa] font-medium hover:underline"
          >
            {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
