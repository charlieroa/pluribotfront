import { describe, it, expect } from 'vitest'
import { detectImageMimeType } from './image-utils.js'

describe('detectImageMimeType', () => {
  it('detects JPEG from magic bytes', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00])
    expect(detectImageMimeType(buf)).toBe('image/jpeg')
  })

  it('detects PNG from magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A])
    expect(detectImageMimeType(buf)).toBe('image/png')
  })

  it('detects GIF from magic bytes', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    expect(detectImageMimeType(buf)).toBe('image/gif')
  })

  it('detects WebP from magic bytes', () => {
    // RIFF....WEBP
    const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46,  // RIFF
      0x00, 0x00, 0x00, 0x00,  // file size (placeholder)
      0x57, 0x45, 0x42, 0x50,  // WEBP
    ])
    expect(detectImageMimeType(buf)).toBe('image/webp')
  })

  it('returns unknown for unrecognized formats', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00])
    expect(detectImageMimeType(buf)).toBe('unknown')
  })

  it('returns unknown for buffers smaller than 4 bytes', () => {
    const buf = Buffer.from([0xFF, 0xD8])
    expect(detectImageMimeType(buf)).toBe('unknown')
  })
})
