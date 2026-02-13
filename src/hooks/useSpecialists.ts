import { useState, useEffect, useCallback } from 'react'

export interface Specialist {
  id: string
  name: string
  specialty: string
  specialtyColor: string | null
}

export function useSpecialists() {
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSpecialists = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('pluribots_token')
      const res = await fetch('/api/organization/specialists', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setSpecialists(data.specialists || [])
      }
    } catch (err) {
      console.error('[Specialists] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSpecialists() }, [fetchSpecialists])

  return { specialists, loading, refetch: fetchSpecialists }
}
