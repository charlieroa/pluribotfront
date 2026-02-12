import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ToolDefinition } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const generatedDir = path.resolve(__dirname, '../../../uploads/generated')
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true })
}

// Try Imagen API first, then fall back to Gemini native image generation
async function generateWithImagen(client: GoogleGenAI, prompt: string, aspectRatio: string): Promise<Buffer | null> {
  const modelNames = ['imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001']

  for (const modelName of modelNames) {
    try {
      const response = await client.models.generateImages({
        model: modelName,
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
        },
      })

      if (response.generatedImages && response.generatedImages.length > 0) {
        const image = response.generatedImages[0]
        if (image.image?.imageBytes) {
          console.log(`[Imagen] Success with model: ${modelName}`)
          return Buffer.from(image.image.imageBytes, 'base64')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[Imagen] Model ${modelName} not available: ${msg.substring(0, 100)}`)
    }
  }

  return null
}

// Use Gemini's native image generation (available with standard API keys)
async function generateWithGemini(client: GoogleGenAI, prompt: string): Promise<Buffer | null> {
  const modelNames = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.5-flash-image',
  ]

  for (const modelName of modelNames) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        } as Record<string, unknown>,
      })

      // Extract image from response parts
      const parts = response.candidates?.[0]?.content?.parts
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            console.log(`[Imagen] Success with Gemini model: ${modelName}`)
            return Buffer.from(part.inlineData.data, 'base64')
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[Imagen] Gemini model ${modelName} failed: ${msg.substring(0, 100)}`)
    }
  }

  return null
}

export const imagenTools: ToolDefinition[] = [
  {
    name: 'generate_image',
    description: 'Generates a high-quality image using AI. Use this to create logos, graphics, illustrations, photos, product images, and any visual content. The prompt MUST be in English for best results.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate, in ENGLISH. Be specific about style, colors, composition, mood, lighting. For product photos, describe the product, setting, and photographic style.',
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

      const apiKey = process.env.GOOGLE_API_KEY
      if (!apiKey) {
        return JSON.stringify({ success: false, error: 'GOOGLE_API_KEY not configured' })
      }

      try {
        const client = new GoogleGenAI({ apiKey })

        // Try Gemini native first (free tier), then Imagen 4 (requires billing)
        let imageBuffer = await generateWithGemini(client, prompt)

        if (!imageBuffer) {
          console.log('[Imagen] Falling back to Imagen 4 API...')
          imageBuffer = await generateWithImagen(client, prompt, aspectRatio)
        }

        if (!imageBuffer) {
          return JSON.stringify({ success: false, error: 'Image generation failed with all available models. The API key may not have access to image generation models.' })
        }

        // Save the image
        const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`
        const filePath = path.join(generatedDir, filename)
        fs.writeFileSync(filePath, imageBuffer)

        const url = `/uploads/generated/${filename}`

        return JSON.stringify({
          success: true,
          url,
          prompt,
          aspectRatio,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Imagen] Error generating image:', message)
        return JSON.stringify({ success: false, error: message })
      }
    },
  },
]
