import type { ToolDefinition } from './types.js'
import { getStorageProvider } from '../storage/index.js'

// ─── Aspect ratio mapping for Ideogram ───
const ASPECT_RATIO_MAP: Record<string, string> = {
  '1:1': '1x1',
  '16:9': '16x9',
  '9:16': '9x16',
  '4:3': '4x3',
  '3:4': '3x4',
}

const IMAGE_GEN_UNAVAILABLE_MSG = JSON.stringify({
  success: false,
  error: 'Image generation is temporarily unavailable. DO NOT retry this tool — instead, create the design using only HTML, CSS, and Font Awesome icons. Use creative CSS techniques (gradients, clip-path, box-shadow, SVG inline) to produce a professional result without generated images.',
})

export const imagenTools: ToolDefinition[] = [
  {
    name: 'generate_image',
    description: 'Generates a high-quality image using Ideogram AI. Best for logos, flyers, banners, posters, social posts, campaign graphics, product visuals, and other branded assets. The prompt MUST be in English and art-directed. For logos and ad pieces, prefer styleType DESIGN and explicitly describe layout, hierarchy, vector cleanliness, and what must NOT appear. If this tool fails, DO NOT call it again — use Font Awesome icons and CSS instead.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed, enriched description of the image to generate, in ENGLISH. Must include: subject, style (photographic/illustration/vector/3D), color palette, composition, mood, lighting, background. Never pass the user prompt directly — always enrich it with professional art direction. For text in images: include the EXACT text in quotes within the prompt.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Aspect ratio of the image. Default: 1:1',
        },
        styleType: {
          type: 'string',
          enum: ['DESIGN', 'REALISTIC', 'GENERAL', 'AUTO'],
          description: 'DESIGN for flyers/posters/banners/logos/social media graphics with text. REALISTIC for photographic product shots or real-world scenes. GENERAL for illustrations. AUTO to let the AI decide. Default: AUTO',
        },
      },
      required: ['prompt'],
    },
    execute: async (input) => {
      const prompt = input.prompt as string
      const aspectRatio = (input.aspectRatio as string) || '1:1'
      const lowerPrompt = prompt.toLowerCase()
      const isGraphicDesignTask = /(logo|brand mark|branding|vector|flyer|banner|poster|social media|story|post design|ad creative|advertising|campaign|typography)/.test(lowerPrompt)
      const styleType = (input.styleType as string) || (isGraphicDesignTask ? 'DESIGN' : 'AUTO')
      const useMagicPrompt = isGraphicDesignTask ? 'OFF' : 'ON'
      const negativePrompt = isGraphicDesignTask
        ? 'blurry, low quality, distorted text, misspelled words, ugly, deformed, mockup, watermark, extra objects, busy background, photorealistic scene, gradients, shadows'
        : 'blurry, low quality, distorted text, misspelled words, ugly, deformed'

      if (!process.env.IDEOGRAM_API_KEY) {
        return IMAGE_GEN_UNAVAILABLE_MSG
      }

      try {
        const ideogramAR = ASPECT_RATIO_MAP[aspectRatio] || '1x1'
        console.log(`[Imagen/Ideogram] Generating image... (${aspectRatio} → ${ideogramAR}, style: ${styleType})`)

        const formData = new FormData()
        formData.append('prompt', prompt)
        formData.append('aspect_ratio', ideogramAR)
        formData.append('style_type', styleType)
        formData.append('magic_prompt', useMagicPrompt)
        formData.append('rendering_speed', 'TURBO')
        formData.append('num_images', '1')
        formData.append('negative_prompt', negativePrompt)

        const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
          method: 'POST',
          headers: {
            'Api-Key': process.env.IDEOGRAM_API_KEY,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Imagen/Ideogram] API error (${response.status}):`, errorText)
          return IMAGE_GEN_UNAVAILABLE_MSG
        }

        const result = await response.json()
        const imageUrl = result?.data?.[0]?.url
        if (!imageUrl) {
          console.log('[Imagen/Ideogram] No image URL in response')
          return IMAGE_GEN_UNAVAILABLE_MSG
        }

        // Download image buffer
        console.log('[Imagen/Ideogram] Downloading image...')
        const imageRes = await fetch(imageUrl)
        if (!imageRes.ok) {
          console.log(`[Imagen/Ideogram] Download failed (${imageRes.status})`)
          return IMAGE_GEN_UNAVAILABLE_MSG
        }
        const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

        // Upload via storage provider
        const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`
        const storage = getStorageProvider()
        const url = await storage.upload(imageBuffer, filename, 'image/png')

        console.log('[Imagen/Ideogram] Success')
        return JSON.stringify({
          success: true,
          url,
          prompt,
          aspectRatio,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Imagen/Ideogram] Error:', message)
        return IMAGE_GEN_UNAVAILABLE_MSG
      }
    },
  },
]
