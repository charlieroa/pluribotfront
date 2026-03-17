import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ToolDefinition } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const videosDir = path.resolve(__dirname, '../../../uploads/videos')
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true })
}

// ─── LTX-2 API config ───
const LTX_API_BASE = 'https://api.ltx.video/v1'

type SupportedAspectRatio = '16:9' | '9:16'

const RESOLUTION_MAP: Record<SupportedAspectRatio, string> = {
  '16:9': '1920x1080',
  '9:16': '1080x1920',
}

function normalizeAspectRatio(value: string): { requested: string; resolved: SupportedAspectRatio; fallbackApplied: boolean } {
  if (value === '9:16') return { requested: value, resolved: '9:16', fallbackApplied: false }
  if (value === '16:9') return { requested: value, resolved: '16:9', fallbackApplied: false }
  return { requested: value, resolved: '16:9', fallbackApplied: true }
}

function normalizeDuration(value: number): 6 | 8 | 10 {
  if (value <= 6) return 6
  if (value <= 8) return 8
  return 10
}

export const videoTools: ToolDefinition[] = [
  {
    name: 'generate_video',
    description: 'Generates a short video clip with audio using AI (LTX-2). Use this to create reels, promotional clips, animations, and short-form video content. The prompt MUST be in English for best results. Video generation takes 30-90 seconds.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the video to generate, in ENGLISH. Describe the scene, action, camera movement, style, and mood.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1'],
          description: 'Aspect ratio. 16:9 for landscape/YouTube, 9:16 for vertical/reels, 1:1 for square. Default: 16:9',
        },
        duration: {
          type: 'string',
          enum: ['5', '10'],
          description: 'Video duration in seconds. Default: 5',
        },
      },
      required: ['prompt'],
    },
    execute: async (input) => {
      const prompt = input.prompt as string
      const aspectRatio = (input.aspectRatio as string) || '16:9'
      const requestedDuration = parseInt((input.duration as string) || '5', 10)

      const apiKey = process.env.LTX_API_KEY
      if (!apiKey) {
        return JSON.stringify({ success: false, error: 'LTX_API_KEY not configured' })
      }

      try {
        const normalizedAspect = normalizeAspectRatio(aspectRatio)
        const duration = normalizeDuration(requestedDuration)
        const resolution = RESOLUTION_MAP[normalizedAspect.resolved]
        console.log(`[Video/LTX-2] Generating video... (${normalizedAspect.resolved}, ${duration}s, ${resolution})`)

        const response = await fetch(`${LTX_API_BASE}/text-to-video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            model: 'ltx-2-3-fast',
            duration,
            resolution,
            fps: 24,
            generate_audio: true,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Video/LTX-2] API error ${response.status}: ${errorText}`)
          return JSON.stringify({ success: false, error: `LTX API error: ${response.status}` })
        }

        // LTX returns the video directly as binary
        const videoBuffer = Buffer.from(await response.arrayBuffer())

        const filename = `vid-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`
        const filePath = path.join(videosDir, filename)
        fs.writeFileSync(filePath, videoBuffer)

        const url = `/uploads/videos/${filename}`

        console.log(`[Video/LTX-2] Success → ${url}`)
        return JSON.stringify({
          success: true,
          url,
          prompt,
          aspectRatio: normalizedAspect.resolved,
          requestedAspectRatio: normalizedAspect.requested,
          duration,
          requestedDuration,
          ...(normalizedAspect.fallbackApplied ? { note: 'Square video fallback applied as 16:9 for ltx-2-3-fast.' } : {}),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Video/LTX-2] Error:', message)
        return JSON.stringify({ success: false, error: message })
      }
    },
  },
]
