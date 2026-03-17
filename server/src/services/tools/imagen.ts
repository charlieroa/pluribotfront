import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import type { ToolDefinition, ToolContext } from './types.js'
import { getStorageProvider } from '../storage/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

function detectMimeType(buffer: Buffer): string {
  if (buffer.length < 12) return 'application/octet-stream'
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif'
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp'
  return 'application/octet-stream'
}

function buildIdeogramError(message?: string): string {
  const raw = message || 'Error desconocido en la generacion de imagen'
  const friendlyMap: [RegExp, string][] = [
    [/rate.?limit|too many requests/i, 'Demasiadas solicitudes de imagen. Espera unos segundos e intenta de nuevo.'],
    [/invalid.*api.?key|unauthorized|401/i, 'La clave de Ideogram no es valida. Contacta al administrador.'],
    [/content.?policy|safety|nsfw/i, 'La imagen solicitada no cumple con las politicas de contenido. Intenta con otra descripcion.'],
    [/invalid.*image|image.*too|corrupt/i, 'La imagen proporcionada no se pudo procesar. Verifica que el archivo sea valido.'],
    [/timeout|timed out/i, 'La generacion de imagen tardo demasiado. Intenta de nuevo.'],
    [/server error|500|502|503/i, 'El servicio de imagenes esta temporalmente caido. Intenta en unos minutos.'],
  ]
  for (const [pattern, friendly] of friendlyMap) {
    if (pattern.test(raw)) return JSON.stringify({ success: false, error: friendly })
  }
  return JSON.stringify({ success: false, error: raw })
}

function toBlobPart(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function resolveLocalImagePath(imageUrl: string): string {
  return path.resolve(__dirname, '../../..', imageUrl.replace(/^\//, ''))
}

async function loadImageBuffer(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  try {
    let buffer: Buffer
    let filename = path.basename(imageUrl) || `image-${Date.now()}`

    if (/^https?:\/\//i.test(imageUrl)) {
      const response = await fetch(imageUrl)
      if (!response.ok) return null
      buffer = Buffer.from(await response.arrayBuffer())
      try {
        const url = new URL(imageUrl)
        filename = path.basename(url.pathname) || filename
      } catch {
        // ignore
      }
    } else {
      const filePath = resolveLocalImagePath(imageUrl)
      if (!fs.existsSync(filePath)) return null
      buffer = fs.readFileSync(filePath)
      filename = path.basename(filePath)
    }

    let mimeType = detectMimeType(buffer)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
      buffer = await sharp(buffer).png().toBuffer()
      mimeType = 'image/png'
      filename = filename.replace(/\.[^.]+$/, '') + '.png'
    }

    return { buffer, mimeType, filename }
  } catch (err) {
    console.error('[Imagen/Ideogram] Error loading image:', err)
    return null
  }
}

async function appendImageList(formData: FormData, field: string, urls: string[]): Promise<boolean> {
  for (const url of urls.filter(Boolean)) {
    const loaded = await loadImageBuffer(url)
    if (!loaded) return false
    formData.append(field, new Blob([toBlobPart(loaded.buffer)], { type: loaded.mimeType }), loaded.filename)
  }
  return true
}

async function downloadAndStoreImage(resultUrl: string): Promise<string | null> {
  const imageRes = await fetch(resultUrl)
  if (!imageRes.ok) return null
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
  const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`
  const storage = getStorageProvider()
  return await storage.upload(imageBuffer, filename, 'image/png')
}

function getDefaultStyleType(prompt: string, explicit?: string): string {
  if (explicit) return explicit
  const lowerPrompt = prompt.toLowerCase()
  const isGraphicDesignTask = /(logo|brand mark|branding|vector|flyer|banner|poster|social media|story|post design|ad creative|advertising|campaign|typography)/.test(lowerPrompt)
  return isGraphicDesignTask ? 'DESIGN' : 'AUTO'
}

function getNegativePrompt(prompt: string, mode: 'generate' | 'remix' | 'edit'): string {
  const lowerPrompt = prompt.toLowerCase()
  const isGraphicDesignTask = /(logo|brand mark|branding|vector|flyer|banner|poster|social media|story|post design|ad creative|advertising|campaign|typography)/.test(lowerPrompt)
  if (!isGraphicDesignTask) return 'blurry, low quality, distorted text, misspelled words, ugly, deformed'
  if (mode === 'edit') {
    return 'blurry, low quality, distorted text, misspelled words, ugly, deformed, unrelated changes, extra objects, photorealistic scene, busy background'
  }
  return 'blurry, low quality, distorted text, misspelled words, ugly, deformed, mockup, watermark, extra objects, busy background, photorealistic scene, gradients, shadows'
}

// ─── Gemini Image Generation ───

type GeminiImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'

const GEMINI_MODEL_LABELS: Record<GeminiImageModel, string> = {
  'gemini-2.5-flash-image': 'Nano Banana',
  'gemini-3-pro-image-preview': 'Nano Banana Pro',
}

const GEMINI_ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1:1',
  '16:9': '16:9',
  '9:16': '9:16',
  '4:3': '4:3',
  '3:4': '3:4',
}

function buildGeminiError(message?: string): string {
  const raw = message || 'Error desconocido en Gemini image generation'
  const friendlyMap: [RegExp, string][] = [
    [/rate.?limit|too many requests|429/i, 'Demasiadas solicitudes a Gemini. Espera unos segundos e intenta de nuevo.'],
    [/invalid.*api.?key|unauthorized|401|403/i, 'La clave de Gemini no es valida. Contacta al administrador.'],
    [/content.?policy|safety|blocked|SAFETY/i, 'La imagen solicitada fue bloqueada por las politicas de contenido de Gemini. Intenta con otra descripcion.'],
    [/timeout|timed out/i, 'La generacion de imagen con Gemini tardo demasiado. Intenta de nuevo.'],
    [/server error|500|502|503/i, 'El servicio de Gemini esta temporalmente caido. Intenta en unos minutos.'],
  ]
  for (const [pattern, friendly] of friendlyMap) {
    if (pattern.test(raw)) return JSON.stringify({ success: false, error: friendly })
  }
  return JSON.stringify({ success: false, error: raw })
}

async function generateWithGemini(
  prompt: string,
  aspectRatio: string,
  model: GeminiImageModel,
  context: ToolContext,
  referenceImageUrl?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return JSON.stringify({ success: false, error: 'GEMINI_API_KEY no esta configurada. Contacta al administrador.' })
  }

  const geminiAR = GEMINI_ASPECT_RATIOS[aspectRatio] || '1:1'
  const label = GEMINI_MODEL_LABELS[model] || model
  console.log(`[Imagen/Gemini] Generating with ${label} (${model}) for ${context.agentName}:${context.instanceId ?? 'no-instance'} (AR: ${geminiAR})${referenceImageUrl ? ' [with reference]' : ''}`)

  // Build request parts: text + optional reference image
  const requestParts: Record<string, unknown>[] = [{ text: prompt }]
  if (referenceImageUrl) {
    const loaded = await loadImageBuffer(referenceImageUrl)
    if (loaded) {
      requestParts.unshift({
        inlineData: {
          mimeType: loaded.mimeType,
          data: loaded.buffer.toString('base64'),
        },
      })
      requestParts.push({ text: 'Use the image above as visual reference. Create a new variation inspired by it but with the changes described.' })
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: requestParts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: geminiAR,
            },
          },
        }),
      })
      clearTimeout(timeout)

      if (response.status === 429 && attempt < 2) {
        console.warn(`[Imagen/Gemini] ${label} rate limited, retrying...`)
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      if (response.status >= 500 && attempt < 2) {
        console.warn(`[Imagen/Gemini] ${label} server error (${response.status}), retrying...`)
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Imagen/Gemini] ${label} API error (${response.status}):`, errorText)
        return buildGeminiError(errorText)
      }

      const result = await response.json()
      const candidates = result?.candidates
      if (!candidates || candidates.length === 0) {
        // Check for safety block
        const blockReason = result?.promptFeedback?.blockReason
        if (blockReason) {
          return buildGeminiError(`Blocked by safety filter: ${blockReason}`)
        }
        return buildGeminiError('Gemini no devolvio ninguna imagen.')
      }

      const parts = candidates[0]?.content?.parts || []
      let imageBase64: string | null = null
      let imageMimeType = 'image/png'
      let textResponse = ''

      for (const part of parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data
          imageMimeType = part.inlineData.mimeType || 'image/png'
        }
        if (part.text) {
          textResponse += part.text
        }
      }

      if (!imageBase64) {
        // Gemini might have returned only text (safety or refusal)
        return buildGeminiError(textResponse || 'Gemini no genero una imagen en la respuesta.')
      }

      // Save to storage
      const imageBuffer = Buffer.from(imageBase64, 'base64')
      const ext = imageMimeType.includes('jpeg') ? 'jpg' : 'png'
      const filename = `gemini-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
      const storage = getStorageProvider()
      const storedUrl = await storage.upload(imageBuffer, filename, imageMimeType)

      return JSON.stringify({
        success: true,
        url: storedUrl,
        model,
        modelLabel: label,
        textResponse: textResponse || undefined,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (attempt < 2 && /fetch|network|ECONNRESET|ETIMEDOUT/i.test(message)) {
        console.warn(`[Imagen/Gemini] ${label} network error, retrying:`, message)
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      console.error(`[Imagen/Gemini] ${label} error:`, message)
      return buildGeminiError(message)
    }
  }

  return buildGeminiError('No se pudo completar la solicitud a Gemini despues de varios intentos.')
}

// ─── Ideogram helpers ───

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000]

async function executeIdeogramRequest(
  endpoint: string,
  formData: FormData,
  logLabel: string,
): Promise<string> {
  if (!process.env.IDEOGRAM_API_KEY) {
    return IMAGE_GEN_UNAVAILABLE_MSG
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`https://api.ideogram.ai${endpoint}`, {
        method: 'POST',
        headers: {
          'Api-Key': process.env.IDEOGRAM_API_KEY,
        },
        body: formData,
      })

      // Rate limited — wait and retry
      if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt] || 3000
        console.warn(`[Imagen/Ideogram] ${logLabel} rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      // Server error — retry on 5xx
      if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt] || 3000
        console.warn(`[Imagen/Ideogram] ${logLabel} server error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Imagen/Ideogram] ${logLabel} API error (${response.status}):`, errorText)
        return buildIdeogramError(errorText)
      }

      const result = await response.json()
      const imageUrl = result?.data?.[0]?.url
      if (!imageUrl) {
        console.error(`[Imagen/Ideogram] ${logLabel} response missing image URL`)
        return buildIdeogramError('La API no devolvio una imagen. Intenta de nuevo.')
      }

      const storedUrl = await downloadAndStoreImage(imageUrl)
      if (!storedUrl) {
        // Retry download once
        const retryUrl = await downloadAndStoreImage(imageUrl)
        if (!retryUrl) {
          return buildIdeogramError('No se pudo descargar la imagen generada. Intenta de nuevo.')
        }
        return JSON.stringify({ success: true, url: retryUrl, remoteUrl: imageUrl, raw: result })
      }

      return JSON.stringify({
        success: true,
        url: storedUrl,
        remoteUrl: imageUrl,
        raw: result,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (attempt < MAX_RETRIES - 1 && /fetch|network|ECONNRESET|ETIMEDOUT/i.test(message)) {
        const delay = RETRY_DELAYS[attempt] || 3000
        console.warn(`[Imagen/Ideogram] ${logLabel} network error, retrying in ${delay}ms:`, message)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      console.error(`[Imagen/Ideogram] ${logLabel} error:`, message)
      return buildIdeogramError(message)
    }
  }

  return buildIdeogramError('No se pudo completar la solicitud despues de varios intentos.')
}

async function buildReferenceAwareGenerate(input: Record<string, unknown>, context: ToolContext): Promise<string> {
  const prompt = String(input.prompt || '')
  const aspectRatio = String(input.aspectRatio || '1:1')
  const imageModel = String(input.imageModel || 'ideogram')

  // Route to Gemini if requested
  const refUrl = input.referenceImageUrl ? String(input.referenceImageUrl) : undefined
  if (imageModel === 'gemini-flash') {
    return generateWithGemini(prompt, aspectRatio, 'gemini-2.5-flash-image', context, refUrl)
  }
  if (imageModel === 'gemini-pro') {
    return generateWithGemini(prompt, aspectRatio, 'gemini-3-pro-image-preview', context, refUrl)
  }

  const styleType = getDefaultStyleType(prompt, input.styleType as string | undefined)
  const ideogramAR = ASPECT_RATIO_MAP[aspectRatio] || '1x1'
  const referenceImageUrl = input.referenceImageUrl ? String(input.referenceImageUrl) : ''
  const styleReferenceUrls = Array.isArray(input.styleReferenceUrls) ? input.styleReferenceUrls.map(String) : []
  const characterReferenceUrls = Array.isArray(input.characterReferenceUrls) ? input.characterReferenceUrls.map(String) : []
  const referenceWeight = input.referenceWeight != null ? String(input.referenceWeight) : ''
  const background = input.background ? String(input.background) : ''
  const styleCodes = Array.isArray(input.styleCodes) ? input.styleCodes.map(String) : []
  const negativePrompt = input.negativePrompt ? String(input.negativePrompt) : getNegativePrompt(prompt, referenceImageUrl ? 'remix' : 'generate')
  const useMagicPrompt = input.magicPrompt ? String(input.magicPrompt) : (referenceImageUrl ? 'OFF' : styleType === 'DESIGN' ? 'OFF' : 'ON')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('aspect_ratio', ideogramAR)
  formData.append('style_type', styleType)
  formData.append('magic_prompt', useMagicPrompt)
  formData.append('rendering_speed', 'TURBO')
  formData.append('num_images', String(input.numImages || '1'))
  formData.append('negative_prompt', negativePrompt)
  if (background) formData.append('background', background)
  if (referenceWeight) formData.append('image_weight', referenceWeight)
  for (const code of styleCodes) formData.append('style_codes', code)

  if (styleReferenceUrls.length > 0) {
    const ok = await appendImageList(formData, 'style_reference_images', styleReferenceUrls)
    if (!ok) return buildIdeogramError('No se pudo cargar la imagen de referencia de estilo.')
  }

  if (characterReferenceUrls.length > 0) {
    const ok = await appendImageList(formData, 'character_reference_images', characterReferenceUrls)
    if (!ok) return buildIdeogramError('No se pudo cargar la imagen de referencia de personaje.')
  }

  let endpoint = '/v1/ideogram-v3/generate'
  if (referenceImageUrl) {
    const loaded = await loadImageBuffer(referenceImageUrl)
    if (!loaded) return buildIdeogramError('No se pudo cargar la imagen de referencia. Verifica que el archivo exista.')
    formData.append('image_file', new Blob([toBlobPart(loaded.buffer)], { type: loaded.mimeType }), loaded.filename)
    endpoint = '/v1/ideogram-v3/remix'
  }

  console.log(`[Imagen/Ideogram] ${endpoint.includes('remix') ? 'Remixing' : 'Generating'} image for ${context.agentName}:${context.instanceId ?? 'no-instance'} (${aspectRatio} -> ${ideogramAR}, style: ${styleType})`)
  return executeIdeogramRequest(endpoint, formData, endpoint.includes('remix') ? 'Remix' : 'Generate')
}

async function editImageWithIdeogram(input: Record<string, unknown>, context: ToolContext): Promise<string> {
  const prompt = String(input.prompt || '')
  const imageUrl = String(input.imageUrl || '')
  const maskUrl = input.maskUrl ? String(input.maskUrl) : ''
  const aspectRatio = String(input.aspectRatio || '1:1')
  const styleType = getDefaultStyleType(prompt, input.styleType as string | undefined)
  const ideogramAR = ASPECT_RATIO_MAP[aspectRatio] || '1x1'
  const loadedImage = await loadImageBuffer(imageUrl)
  if (!loadedImage) return buildIdeogramError('No se pudo cargar la imagen base. Verifica que exista y sea valida.')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('image_file', new Blob([toBlobPart(loadedImage.buffer)], { type: loadedImage.mimeType }), loadedImage.filename)
  formData.append('aspect_ratio', ideogramAR)
  formData.append('style_type', styleType)
  formData.append('magic_prompt', 'OFF')
  formData.append('rendering_speed', 'TURBO')
  formData.append('num_images', String(input.numImages || '1'))
  formData.append('negative_prompt', input.negativePrompt ? String(input.negativePrompt) : getNegativePrompt(prompt, 'edit'))

  if (maskUrl) {
    const loadedMask = await loadImageBuffer(maskUrl)
    if (!loadedMask) return buildIdeogramError('No se pudo cargar la mascara de edicion.')
    formData.append('mask', new Blob([toBlobPart(loadedMask.buffer)], { type: loadedMask.mimeType }), loadedMask.filename)
  }

  console.log(`[Imagen/Ideogram] Editing image for ${context.agentName}:${context.instanceId ?? 'no-instance'} (${aspectRatio} -> ${ideogramAR}, style: ${styleType})`)
  return executeIdeogramRequest('/v1/ideogram-v3/edit', formData, 'Edit')
}

async function reframeImageWithIdeogram(input: Record<string, unknown>, context: ToolContext): Promise<string> {
  const imageUrl = String(input.imageUrl || '')
  const aspectRatio = String(input.aspectRatio || '16:9')
  const ideogramAR = ASPECT_RATIO_MAP[aspectRatio] || '16x9'
  const loadedImage = await loadImageBuffer(imageUrl)
  if (!loadedImage) return buildIdeogramError('No se pudo cargar la imagen para reencuadrar.')

  const formData = new FormData()
  formData.append('image_file', new Blob([toBlobPart(loadedImage.buffer)], { type: loadedImage.mimeType }), loadedImage.filename)
  formData.append('aspect_ratio', ideogramAR)

  console.log(`[Imagen/Ideogram] Reframing image for ${context.agentName}:${context.instanceId ?? 'no-instance'} (${aspectRatio} -> ${ideogramAR})`)
  return executeIdeogramRequest('/v1/ideogram-v2/reframe', formData, 'Reframe')
}

async function upscaleImageWithIdeogram(input: Record<string, unknown>, context: ToolContext): Promise<string> {
  const imageUrl = String(input.imageUrl || '')
  const loadedImage = await loadImageBuffer(imageUrl)
  if (!loadedImage) return buildIdeogramError('No se pudo cargar la imagen para mejorar resolucion.')

  const formData = new FormData()
  formData.append('image_file', new Blob([toBlobPart(loadedImage.buffer)], { type: loadedImage.mimeType }), loadedImage.filename)
  formData.append('resemblance', String(input.resemblance || '50'))
  formData.append('detail', String(input.detail || '50'))
  if (input.prompt) formData.append('prompt', String(input.prompt))
  if (input.magicPrompt) formData.append('magic_prompt', String(input.magicPrompt))

  console.log(`[Imagen/Ideogram] Upscaling image for ${context.agentName}:${context.instanceId ?? 'no-instance'}`)
  return executeIdeogramRequest('/v1/ideogram-v2/upscale', formData, 'Upscale')
}

async function describeImageWithIdeogram(input: Record<string, unknown>, context: ToolContext): Promise<string> {
  const imageUrl = String(input.imageUrl || '')
  const loadedImage = await loadImageBuffer(imageUrl)
  if (!loadedImage) return buildIdeogramError('No se pudo cargar la imagen para analizar.')

  const formData = new FormData()
  formData.append('image_file', new Blob([toBlobPart(loadedImage.buffer)], { type: loadedImage.mimeType }), loadedImage.filename)

  console.log(`[Imagen/Ideogram] Describing image for ${context.agentName}:${context.instanceId ?? 'no-instance'}`)

  if (!process.env.IDEOGRAM_API_KEY) return IMAGE_GEN_UNAVAILABLE_MSG

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.ideogram.ai/v1/ideogram-v2/describe', {
        method: 'POST',
        headers: { 'Api-Key': process.env.IDEOGRAM_API_KEY },
        body: formData,
      })

      if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 3000))
        continue
      }
      if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 3000))
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Imagen/Ideogram] Describe API error:', errorText)
        return buildIdeogramError(errorText)
      }

      const result = await response.json()
      const descriptions = result?.data?.descriptions || result?.descriptions || []

      return JSON.stringify({
        success: true,
        descriptions: descriptions.map((d: any) => d?.text || d).filter(Boolean),
        raw: result,
      })
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 3000))
        continue
      }
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Imagen/Ideogram] Describe error:', message)
      return buildIdeogramError(message)
    }
  }

  return buildIdeogramError('No se pudo analizar la imagen.')
}

export const imagenTools: ToolDefinition[] = [
  {
    name: 'generate_image',
    description: 'Generates or remixes an image. Supports multiple providers: Ideogram (best for design/logos/text-heavy), Gemini Flash (Nano Banana — fast, good general quality), and Gemini Nano Banana 2 (newest, high quality). If referenceImageUrl is provided, the tool automatically uses Ideogram remix mode. styleReferenceUrls and characterReferenceUrls only work with Ideogram.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed, enriched description in ENGLISH. Include subject, style, palette, composition, mood, and constraints. For ad pieces include the full visual hierarchy. For logos include what must NOT appear.',
        },
        imageModel: {
          type: 'string',
          enum: ['ideogram', 'gemini-flash', 'gemini-pro'],
          description: 'Which image generation model to use. ideogram = Ideogram V3 (best for design/logos/text). gemini-flash = Gemini Flash Image / Nano Banana (fast ~6s). gemini-pro = Gemini Pro Image / Nano Banana Pro (best quality ~20s). Default: ideogram.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Aspect ratio. Default: 1:1',
        },
        styleType: {
          type: 'string',
          enum: ['DESIGN', 'REALISTIC', 'GENERAL', 'AUTO'],
          description: 'Prefer DESIGN for logos, flyers, banners, and social creatives.',
        },
        referenceImageUrl: {
          type: 'string',
          description: 'Optional. A previously uploaded image URL to use as the actual visual reference. When present, this tool uses Ideogram remix mode.',
        },
        referenceWeight: {
          type: 'number',
          description: 'Optional. Strength of the reference image when remixing. Use higher values when the original shape or composition must be preserved.',
        },
        styleReferenceUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional. One or more image URLs used only as style references.',
        },
        characterReferenceUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional. One or more image URLs used to preserve a subject or character identity.',
        },
        styleCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional. Ideogram style codes if available.',
        },
        background: {
          type: 'string',
          description: 'Optional. Background preference when supported by Ideogram, e.g. TRANSPARENT.',
        },
        negativePrompt: {
          type: 'string',
          description: 'Optional. Extra exclusions for the image.',
        },
        magicPrompt: {
          type: 'string',
          enum: ['ON', 'OFF', 'AUTO'],
          description: 'Optional. For strict brand/logo work prefer OFF.',
        },
        numImages: {
          type: 'number',
          description: 'Optional. Number of images to request. Default: 1',
        },
      },
      required: ['prompt'],
    },
    execute: async (input, context) => buildReferenceAwareGenerate(input, context),
  },
  {
    name: 'edit_image',
    description: 'Edits a real image using Ideogram edit mode. Use this when the user wants to keep an uploaded asset and change part of it. Optionally provide maskUrl to limit the edit area.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed edit instruction in ENGLISH.' },
        imageUrl: { type: 'string', description: 'A previously uploaded or generated image URL to edit.' },
        maskUrl: { type: 'string', description: 'Optional. A mask image URL defining the editable area.' },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Aspect ratio for the edited result. Default: 1:1',
        },
        styleType: {
          type: 'string',
          enum: ['DESIGN', 'REALISTIC', 'GENERAL', 'AUTO'],
          description: 'Prefer DESIGN for graphic pieces.',
        },
        negativePrompt: { type: 'string', description: 'Optional. Things that must not appear after the edit.' },
        numImages: { type: 'number', description: 'Optional. Number of edited images. Default: 1' },
      },
      required: ['prompt', 'imageUrl'],
    },
    execute: async (input, context) => editImageWithIdeogram(input, context),
  },
  {
    name: 'reframe_image',
    description: 'Reframes an existing image to a different aspect ratio using Ideogram. Use this when the creative is good but needs a different crop/layout for another placement.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'A previously uploaded or generated image URL to reframe.' },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Target aspect ratio. Default: 16:9',
        },
      },
      required: ['imageUrl', 'aspectRatio'],
    },
    execute: async (input, context) => reframeImageWithIdeogram(input, context),
  },
  {
    name: 'upscale_image',
    description: 'Upscales an image to higher resolution using Ideogram. Use this as a FINAL STEP after generating a logo, brand mark, or any visual that needs to be exported in high quality. Always upscale logos and brand assets before delivering them.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'The image URL to upscale (previously generated or uploaded).' },
        resemblance: {
          type: 'number',
          description: 'How closely the upscaled image should match the original (1-100). Default: 50. Use higher values for logos/brand marks.',
        },
        detail: {
          type: 'number',
          description: 'Level of detail enhancement (1-100). Default: 50. Use higher values for complex illustrations.',
        },
        prompt: { type: 'string', description: 'Optional prompt to guide upscaling direction.' },
        magicPrompt: { type: 'string', enum: ['ON', 'OFF', 'AUTO'], description: 'Optional. Default: AUTO' },
      },
      required: ['imageUrl'],
    },
    execute: async (input, context) => upscaleImageWithIdeogram(input, context),
  },
  {
    name: 'describe_image',
    description: 'Analyzes an uploaded image and returns detailed text descriptions of what it contains. Use this FIRST when a user uploads a reference image (logo, photo, design) — it helps you understand the image before generating something based on it. Returns multiple possible descriptions you can use to craft better generation prompts.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'The image URL to analyze and describe.' },
      },
      required: ['imageUrl'],
    },
    execute: async (input, context) => describeImageWithIdeogram(input, context),
  },
]
