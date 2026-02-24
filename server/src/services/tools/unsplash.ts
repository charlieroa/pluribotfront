import type { ToolDefinition } from './types.js'

const UNSPLASH_API_BASE = 'https://api.unsplash.com'

export const unsplashTools: ToolDefinition[] = [
  {
    name: 'search_stock_photo',
    description: 'Searches for high-quality stock photos on Unsplash. Returns real, professional photographs perfect for hero images, team photos, product backgrounds, and lifestyle content. The query MUST be in English for best results. URLs returned are public Unsplash CDN links that work directly in <img> tags.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query in ENGLISH. Be specific: "modern office team meeting" is better than "team". Include style/mood when relevant: "dark moody coffee shop interior".',
        },
        orientation: {
          type: 'string',
          enum: ['landscape', 'portrait', 'squarish'],
          description: 'Photo orientation. Use landscape for hero/banner, portrait for cards/mobile, squarish for avatars/thumbnails. Default: landscape.',
        },
        count: {
          type: 'number',
          description: 'Number of photos to return (1-5). Default: 3. Request 3 to choose the best one.',
        },
      },
      required: ['query'],
    },
    execute: async (input) => {
      const query = input.query as string
      const orientation = (input.orientation as string) || 'landscape'
      const count = Math.min(Math.max((input.count as number) || 3, 1), 5)

      const accessKey = process.env.UNSPLASH_ACCESS_KEY
      if (!accessKey) {
        return JSON.stringify({
          success: false,
          error: 'UNSPLASH_ACCESS_KEY not configured. Use placeholder images or CSS gradients instead.',
        })
      }

      try {
        const url = `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${count}`
        const response = await fetch(url, {
          headers: { Authorization: `Client-ID ${accessKey}` },
        })

        if (!response.ok) {
          const errText = await response.text()
          console.error(`[Unsplash] API error ${response.status}: ${errText.substring(0, 200)}`)
          return JSON.stringify({
            success: false,
            error: `Unsplash API error (${response.status}). Use CSS gradients or Font Awesome icons as fallback.`,
          })
        }

        const data = await response.json()
        const results = data.results || []

        if (results.length === 0) {
          return JSON.stringify({
            success: true,
            photos: [],
            message: `No photos found for "${query}". Try a broader search term.`,
          })
        }

        const photos = results.map((p: Record<string, unknown>) => {
          const urls = p.urls as Record<string, string>
          const user = p.user as Record<string, unknown>
          const userLinks = user.links as Record<string, string>
          return {
            url: `${urls.raw}?w=1200&q=80`,
            thumb: urls.thumb,
            alt: (p.alt_description as string) || (p.description as string) || query,
            photographer: user.name as string,
            photographerUrl: `${userLinks.html}?utm_source=pluribots&utm_medium=referral`,
          }
        })

        return JSON.stringify({ success: true, photos })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Unsplash] Error searching photos:', message)
        return JSON.stringify({
          success: false,
          error: `Error searching Unsplash: ${message}. Use CSS gradients or Font Awesome icons as fallback.`,
        })
      }
    },
  },
]
