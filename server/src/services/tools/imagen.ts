import type { ToolDefinition } from './types.js'
import { getStorageProvider } from '../storage/index.js'

// ─── Failure cache: avoid hammering API when down ───
const IMAGE_GEN_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let midjourneyAvailable: boolean | null = null
let midjourneyLastCheck = 0

function isMidjourneyCachedAsFailed(): boolean {
  if (midjourneyAvailable === null) return false
  if (Date.now() - midjourneyLastCheck > IMAGE_GEN_CACHE_TTL) {
    midjourneyAvailable = null
    return false
  }
  return !midjourneyAvailable
}

function markMidjourneyResult(success: boolean) {
  midjourneyAvailable = success
  midjourneyLastCheck = Date.now()
}

// ─── Midjourney via Apiframe ───
async function generateWithMidjourney(prompt: string, aspectRatio: string): Promise<Buffer | null> {
  const apiKey = process.env.APIFRAME_API_KEY
  if (!apiKey) return null

  try {
    console.log('[Imagen/Midjourney] Submitting imagine task...')
    const submitRes = await fetch('https://api.apiframe.pro/imagine', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
    })

    if (!submitRes.ok) {
      const errorText = await submitRes.text()
      console.log(`[Imagen/Midjourney] Submit failed (${submitRes.status}): ${errorText.substring(0, 200)}`)
      return null
    }

    const submitData = await submitRes.json() as { task_id?: string }
    const taskId = submitData.task_id
    if (!taskId) {
      console.log('[Imagen/Midjourney] No task_id in response')
      return null
    }

    console.log(`[Imagen/Midjourney] Task submitted: ${taskId}`)

    // Poll for result
    const maxAttempts = 8
    const pollInterval = 5_000 // 5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      console.log(`[Imagen/Midjourney] Polling attempt ${attempt}/${maxAttempts}...`)
      const fetchRes = await fetch('https://api.apiframe.pro/fetch', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_id: taskId }),
      })

      if (!fetchRes.ok) {
        console.log(`[Imagen/Midjourney] Fetch failed (${fetchRes.status})`)
        continue
      }

      const fetchData = await fetchRes.json() as { status?: string; image_url?: string }

      if (fetchData.status === 'finished' && fetchData.image_url) {
        console.log(`[Imagen/Midjourney] Task finished, downloading image...`)
        const imageRes = await fetch(fetchData.image_url)
        if (!imageRes.ok) {
          console.log(`[Imagen/Midjourney] Image download failed (${imageRes.status})`)
          return null
        }
        const arrayBuffer = await imageRes.arrayBuffer()
        console.log('[Imagen/Midjourney] Success')
        return Buffer.from(arrayBuffer)
      }

      if (fetchData.status && fetchData.status !== 'processing' && fetchData.status !== 'queued') {
        console.log(`[Imagen/Midjourney] Unexpected status: ${fetchData.status}`)
        return null
      }
    }

    console.log('[Imagen/Midjourney] Timeout after polling')
    return null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[Imagen/Midjourney] Error: ${msg.substring(0, 200)}`)
    return null
  }
}

const IMAGE_GEN_UNAVAILABLE_MSG = JSON.stringify({
  success: false,
  error: 'Image generation is temporarily unavailable (API quota exceeded or billing issue). DO NOT retry this tool — instead, create the design using only HTML, CSS, and Font Awesome icons. Use creative CSS techniques (gradients, clip-path, box-shadow, SVG inline) to produce a professional result without generated images.',
})

export const imagenTools: ToolDefinition[] = [
  {
    name: 'generate_image',
    description: 'Generates a high-quality image using Midjourney AI. Use this to create logos, graphics, illustrations, photos, product images, and any visual content. The prompt MUST be in English for best results. If this tool fails, DO NOT call it again — use Font Awesome icons and CSS instead.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed, enriched description of the image to generate, in ENGLISH. Must include: subject, style (photographic/illustration/vector/3D), color palette, composition, mood, lighting, background. Never pass the user prompt directly — always enrich it with professional art direction.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Aspect ratio of the image. Default: 1:1',
        },
      },
      required: ['prompt'],
    },
    execute: async (input) => {
      const prompt = input.prompt as string
      const aspectRatio = (input.aspectRatio as string) || '1:1'

      // Fast-fail if Midjourney recently failed
      if (isMidjourneyCachedAsFailed()) {
        console.log('[Imagen] Skipping — Midjourney cached as unavailable')
        return IMAGE_GEN_UNAVAILABLE_MSG
      }

      let imageBuffer: Buffer | null = null

      // Midjourney via Apiframe — best quality for logos and visuals
      if (process.env.APIFRAME_API_KEY) {
        imageBuffer = await generateWithMidjourney(prompt, aspectRatio)
        if (imageBuffer) {
          markMidjourneyResult(true)
        } else {
          markMidjourneyResult(false)
        }
      }

      // Provider failed
      if (!imageBuffer) {
        return IMAGE_GEN_UNAVAILABLE_MSG
      }

      // Save image via storage provider
      const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`
      const storage = getStorageProvider()
      const url = await storage.upload(imageBuffer, filename, 'image/png')

      return JSON.stringify({
        success: true,
        url,
        prompt,
        aspectRatio,
      })
    },
  },
]
