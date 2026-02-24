import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { StorageProvider } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.resolve(__dirname, '../../../uploads')

// Ensure directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
const generatedDir = path.join(uploadsDir, 'generated')
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true })
}

export class LocalStorageProvider implements StorageProvider {
  async upload(buffer: Buffer, filename: string, _mimetype: string): Promise<string> {
    const isGenerated = filename.startsWith('img-')
    const dir = isGenerated ? generatedDir : uploadsDir
    const filePath = path.join(dir, filename)
    fs.writeFileSync(filePath, buffer)
    return isGenerated ? `/uploads/generated/${filename}` : `/uploads/${filename}`
  }

  getUrl(filePath: string): string {
    const cdnBase = process.env.CDN_BASE_URL
    if (cdnBase) return `${cdnBase}${filePath}`
    const port = process.env.PORT ?? '3002'
    return `http://localhost:${port}${filePath}`
  }

  async delete(filePath: string): Promise<void> {
    const absPath = path.resolve(uploadsDir, '..', filePath.replace(/^\//, ''))
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath)
    }
  }
}
