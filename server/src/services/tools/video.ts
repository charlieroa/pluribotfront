import { fal } from '@fal-ai/client'
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

// ─── Aspect ratio mapping for Kling ───
const ASPECT_RATIO_MAP: Record<string, string> = {
  '16:9': '16:9',
  '9:16': '9:16',
  '1:1': '1:1',
}

export const videoTools: ToolDefinition[] = [
  {
    name: 'generate_video',
    description: 'Generates a short video clip with audio using AI (Kling V3 Pro). Use this to create reels, promotional clips, animations, and short-form video content. The prompt MUST be in English for best results. Video generation takes 1-3 minutes.',
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
      const duration = parseInt((input.duration as string) || '5', 10)

      if (!process.env.FAL_KEY) {
        return JSON.stringify({ success: false, error: 'FAL_KEY not configured' })
      }

      try {
        fal.config({ credentials: process.env.FAL_KEY })

        console.log(`[Video/Kling] Generating video... (${aspectRatio}, ${duration}s)`)

        const result = await fal.subscribe('fal-ai/kling-video/v3/pro/text-to-video', {
          input: {
            prompt,
            duration: String(duration),
            aspect_ratio: ASPECT_RATIO_MAP[aspectRatio] || '16:9',
            generate_audio: true,
          },
        })

        const videoUrl = (result.data as any)?.video?.url
        if (!videoUrl) {
          console.log('[Video/Kling] No video URL in response')
          return JSON.stringify({ success: false, error: 'No video generated' })
        }

        // Download the video
        console.log('[Video/Kling] Downloading video...')
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
          return JSON.stringify({ success: false, error: `Video download failed (${videoResponse.status})` })
        }
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())

        const filename = `vid-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`
        const filePath = path.join(videosDir, filename)
        fs.writeFileSync(filePath, videoBuffer)

        const url = `/uploads/videos/${filename}`

        console.log('[Video/Kling] Success')
        return JSON.stringify({
          success: true,
          url,
          prompt,
          aspectRatio,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Video/Kling] Error:', message)
        return JSON.stringify({ success: false, error: message })
      }
    },
  },
]
