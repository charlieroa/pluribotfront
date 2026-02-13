import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface Organization {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  createdAt: string
}

interface OrganizationContextValue {
  organization: Organization | null
  isLoading: boolean
  updateOrganization: (data: { name?: string; logoUrl?: string | null; primaryColor?: string | null }) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

// Calculate whether white or black text has better contrast on a given background
function getContrastForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

// Lighten or darken a hex color
function adjustColor(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function applyPrimaryColor(color: string | null) {
  const root = document.documentElement.style
  if (!color) {
    root.removeProperty('--primary-c')
    root.removeProperty('--primary-soft-c')
    root.removeProperty('--primary-fg-c')
    return
  }
  root.setProperty('--primary-c', color)
  // Determine if we're in dark mode
  const isDark = document.documentElement.classList.contains('dark')
  const softColor = isDark ? adjustColor(color, -40) : adjustColor(color, 60)
  root.setProperty('--primary-soft-c', softColor)
  root.setProperty('--primary-fg-c', getContrastForeground(color))
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchOrganization = useCallback(async () => {
    if (!token || !user || user.role !== 'org_admin') {
      setOrganization(null)
      applyPrimaryColor(null)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/organization', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.organization) {
          setOrganization(data.organization)
          applyPrimaryColor(data.organization.primaryColor)
        }
      }
    } catch (err) {
      console.error('[OrgContext] Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const updateOrganization = async (data: { name?: string; logoUrl?: string | null; primaryColor?: string | null }) => {
    if (!token) return
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        setOrganization(result.organization)
        applyPrimaryColor(result.organization.primaryColor)
      }
    } catch (err) {
      console.error('[OrgContext] Update error:', err)
    }
  }

  return (
    <OrganizationContext.Provider value={{ organization, isLoading, updateOrganization }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider')
  return ctx
}
