import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

router.get('/search', optionalAuth, async (req, res) => {
  const { query, per_page = '12', orientation = 'landscape' } = req.query

  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'query parameter is required' })
    return
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    res.status(500).json({ error: 'UNSPLASH_ACCESS_KEY not configured' })
    return
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${per_page}&orientation=${orientation}`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Unsplash] Proxy error ${response.status}: ${errText.substring(0, 200)}`)
      res.status(response.status).json({ error: 'Unsplash API error' })
      return
    }

    const data = await response.json()
    const photos = (data.results || []).map((p: Record<string, unknown>) => {
      const urls = p.urls as Record<string, string>
      const user = p.user as Record<string, unknown>
      const userLinks = user.links as Record<string, string>
      return {
        id: p.id,
        url: urls.regular,
        urlFull: `${urls.raw}?w=1600&q=80`,
        thumb: urls.thumb,
        alt: (p.alt_description as string) || (p.description as string) || '',
        photographer: user.name as string,
        photographerUrl: `${userLinks.html}?utm_source=pluribots&utm_medium=referral`,
      }
    })

    res.json({ photos })
  } catch (err) {
    console.error('[Unsplash] Proxy error:', err)
    res.status(500).json({ error: 'Error searching Unsplash' })
  }
})

export default router
