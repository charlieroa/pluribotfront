import { GoogleGenAI } from '@google/genai'
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const videoTools: ToolDefinition[] = [
  {
    name: 'generate_video',
    description: 'Generates a short video clip using AI (Veo 3). Use this to create reels, promotional clips, animations, and short-form video content. The prompt MUST be in English for best results. Video generation takes 1-3 minutes.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the video to generate, in ENGLISH. Describe the scene, action, camera movement, style, and mood.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16'],
          description: 'Aspect ratio. 16:9 for landscape/YouTube, 9:16 for vertical/reels. Default: 16:9',
        },
      },
      required: ['prompt'],
    },
    execute: async (input) => {
      const prompt = input.prompt as string
      const aspectRatio = (input.aspectRatio as string) || '16:9'

      const apiKey = process.env.GOOGLE_API_KEY
      if (!apiKey) {
        return JSON.stringify({ success: false, error: 'GOOGLE_API_KEY not configured' })
      }

      try {
        const client = new GoogleGenAI({ apiKey })

        // Start async video generation
        let operation = await client.models.generateVideos({
          model: 'veo-3.0-generate-001',
          prompt,
          config: {
            aspectRatio,
            numberOfVideos: 1,
          },
        })

        // Poll until done (max ~5 minutes)
        const maxAttempts = 60
        let attempts = 0
        while (!operation.done && attempts < maxAttempts) {
          await sleep(5000)
          operation = await client.operations.getVideosOperation({ operation })
          attempts++
        }

        if (!operation.done) {
          return JSON.stringify({ success: false, error: 'Video generation timed out' })
        }

        const generatedVideos = operation.response?.generatedVideos
        if (!generatedVideos || generatedVideos.length === 0) {
          return JSON.stringify({ success: false, error: 'No videos generated' })
        }

        const video = generatedVideos[0]
        if (!video.video?.uri) {
          return JSON.stringify({ success: false, error: 'No video URI returned' })
        }

        // Download the video
        const videoResponse = await fetch(video.video.uri)
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())

        const filename = `vid-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`
        const filePath = path.join(videosDir, filename)
        fs.writeFileSync(filePath, videoBuffer)

        const url = `/uploads/videos/${filename}`

        return JSON.stringify({
          success: true,
          url,
          prompt,
          aspectRatio,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Video] Error generating video:', message)
        return JSON.stringify({ success: false, error: message })
      }
    },
  },
]
