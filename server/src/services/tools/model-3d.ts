import type { ToolDefinition } from './types.js'
import { generateModel } from '../meshy.js'

export const model3dTools: ToolDefinition[] = [
  {
    name: 'generate_3d_model',
    description: 'Generates a 3D model from a user image using Meshy. Use this when the user wants to convert a car, product, object, or reference image into a downloadable 3D asset.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'Public image URL to convert into 3D. Use the exact URL from the task context or attached image.',
        },
        title: {
          type: 'string',
          description: 'Short label for the asset, used only for presentation.',
        },
      },
      required: ['imageUrl'],
    },
    execute: async (input) => {
      const rawImageUrl = String(input.imageUrl || '').trim()
      const title = String(input.title || 'Modelo 3D').trim()

      if (!rawImageUrl) {
        return JSON.stringify({ success: false, error: 'imageUrl is required' })
      }

      try {
        const baseUrl = process.env.DEPLOY_BASE_URL || 'https://plury.co'
        const imageUrl = rawImageUrl.startsWith('http') ? rawImageUrl : `${baseUrl}${rawImageUrl}`
        const result = await generateModel(imageUrl)
        const modelUrl = `${baseUrl}/uploads/3d-models/${result.filename}`

        return JSON.stringify({
          success: true,
          title,
          imageUrl,
          modelUrl,
          thumbnailUrl: result.thumbnailUrl || null,
          filename: result.filename,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Tool/3D] Error:', message)
        return JSON.stringify({ success: false, error: message, imageUrl: rawImageUrl })
      }
    },
  },
]
