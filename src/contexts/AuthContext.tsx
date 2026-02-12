import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  planId: string
  onboardingDone?: boolean
  profession?: string
  role?: string
}

const ALL_BOT_IDS = ['seo', 'web', 'ads', 'dev', 'video']

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
  activeBots: string[]
  fetchActiveBots: () => Promise<void>
  updateActiveBots: (bots: Array<{ botId: string; isActive: boolean }>) => Promise<void>
  completeOnboarding: (profession: string, botIds: string[]) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeBots, setActiveBots] = useState<string[]>(ALL_BOT_IDS)

  const fetchActiveBots = useCallback(async () => {
    const currentToken = token || localStorage.getItem('pluribots_token')
    if (!currentToken) {
      setActiveBots(ALL_BOT_IDS)
      return
    }
    try {
      const res = await fetch('/api/user/bots', {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        const active = (data.bots as Array<{ botId: string; isActive: boolean }>)
          .filter(b => b.isActive)
          .map(b => b.botId)
        // If user has no bot records yet, all are active
        setActiveBots(active.length > 0 ? active : ALL_BOT_IDS)
      }
    } catch {
      // Keep current state on error
    }
  }, [token])

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('pluribots_token')
    const savedUser = localStorage.getItem('pluribots_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  // Fetch active bots when user logs in
  useEffect(() => {
    if (user && token) {
      fetchActiveBots()
    } else if (!user) {
      setActiveBots(ALL_BOT_IDS)
    }
  }, [user, token, fetchActiveBots])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al iniciar sesion')
      }
      const data = await res.json()
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('pluribots_token', data.token)
      localStorage.setItem('pluribots_user', JSON.stringify(data.user))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      throw err
    }
  }

  const register = async (email: string, password: string, name: string) => {
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al registrarse')
      }
      const data = await res.json()
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('pluribots_token', data.token)
      localStorage.setItem('pluribots_user', JSON.stringify(data.user))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      throw err
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setActiveBots(ALL_BOT_IDS)
    localStorage.removeItem('pluribots_token')
    localStorage.removeItem('pluribots_user')
  }

  const updateActiveBots = async (bots: Array<{ botId: string; isActive: boolean }>) => {
    if (!token) return
    try {
      const res = await fetch('/api/user/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bots }),
      })
      if (res.ok) {
        const data = await res.json()
        const active = (data.bots as Array<{ botId: string; isActive: boolean }>)
          .filter(b => b.isActive)
          .map(b => b.botId)
        setActiveBots(active.length > 0 ? active : ALL_BOT_IDS)
      }
    } catch {
      // Revert on error
    }
  }

  const completeOnboarding = async (profession: string, botIds: string[]) => {
    if (!token) return
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profession, activeBots: botIds }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setActiveBots(data.activeBots)
        localStorage.setItem('pluribots_user', JSON.stringify(data.user))
      }
    } catch {
      // Keep current state on error
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, error, activeBots, fetchActiveBots, updateActiveBots, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
