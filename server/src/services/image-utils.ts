import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supported media types by Anthropic API
export const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

// Detect real MIME type from file magic bytes (not extension)
export function detectImageMimeType(buffer: Buffer): string {
  if (buffer.length < 4) return 'unknown'
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png'
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif'
  // WebP: RIFF....WEBP
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp'
  // Fallback: unknown (will be converted)
  return 'unknown'
}

// Read a local file, convert if needed, and encode as base64
export async function readAndEncodeImage(imageUrl: string): Promise<{ source: string; mediaType: string } | null> {
  try {
    const filePath = path.resolve(__dirname, '../..', imageUrl.replace(/^\//, ''))
    if (!fs.existsSync(filePath)) return null
    const data = fs.readFileSync(filePath)
    let mediaType = detectImageMimeType(data)
    console.log(`[Image] ${imageUrl} → detected: ${mediaType} (${data.length} bytes)`)

    // If the format is not supported by LLM APIs (e.g. AVIF, BMP, TIFF), convert to PNG
    if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) {
      console.log(`[Image] Converting unsupported format to PNG...`)
      const converted = await sharp(data).png().toBuffer()
      console.log(`[Image] Converted to PNG: ${converted.length} bytes`)
      return { source: converted.toString('base64'), mediaType: 'image/png' }
    }

    return { source: data.toString('base64'), mediaType }
  } catch (err) {
    console.error('[Image] Error reading/converting image:', err)
    return null
  }
}
