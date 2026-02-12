import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const LoginView = () => {
  const { login, register, error } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-fg font-bold text-lg mx-auto mb-3">P</div>
          <h1 className="text-2xl font-bold text-ink">Pluribots</h1>
          <p className="text-sm text-ink-faint mt-1">Agentes IA que trabajan por ti</p>
        </div>

        <div className="bg-surface border border-edge rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink mb-4">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>

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
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1.5 block">Contraseña</label>
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
              onClick={() => { setIsRegister(!isRegister); }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-ink-faint text-center mt-6">
          Puedes usar la app sin cuenta. El login es opcional.
        </p>
      </div>
    </div>
  )
}

export default LoginView
