import { describe, it, expect } from 'vitest'
import { extractHtmlBlock, validateHtml, extractDesignContext, wrapTextAsHtml } from './html-utils.js'

describe('extractHtmlBlock', () => {
  it('extracts a full HTML document from mixed text', () => {
    const input = 'Here is the HTML:\n<!DOCTYPE html>\n<html><head></head><body>Hello</body></html>\nDone.'
    const result = extractHtmlBlock(input)
    expect(result).toBe('<!DOCTYPE html>\n<html><head></head><body>Hello</body></html>')
  })

  it('extracts HTML starting with <html> when no DOCTYPE', () => {
    const input = '<html><head></head><body>Test</body></html>'
    const result = extractHtmlBlock(input)
    expect(result).toBe('<html><head></head><body>Test</body></html>')
  })

  it('returns null when no HTML document found', () => {
    const result = extractHtmlBlock('Just plain text without any HTML')
    expect(result).toBeNull()
  })

  it('returns null when </html> is missing', () => {
    const result = extractHtmlBlock('<!DOCTYPE html><html><body>Broken')
    expect(result).toBeNull()
  })
})

describe('validateHtml', () => {
  it('returns no errors for a valid HTML document', () => {
    const html = '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body><div></div></body></html>'
    const errors = validateHtml(html)
    expect(errors).toEqual([])
  })

  it('detects missing DOCTYPE', () => {
    const html = '<html><head><script src="https://cdn.tailwindcss.com"></script></head><body></body></html>'
    const errors = validateHtml(html)
    expect(errors).toContain('Missing <!DOCTYPE html>')
  })

  it('detects missing head tag', () => {
    const html = '<!DOCTYPE html><html><body></body></html>'
    const errors = validateHtml(html)
    expect(errors).toContain('Missing <head> tag')
  })

  it('detects unbalanced div tags', () => {
    const html = '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body><div><div></div></body></html>'
    const errors = validateHtml(html)
    expect(errors.some(e => e.includes('Unbalanced <div>'))).toBe(true)
  })

  it('detects missing Tailwind CDN', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>'
    const errors = validateHtml(html)
    expect(errors.some(e => e.includes('Tailwind'))).toBe(true)
  })
})

describe('extractDesignContext', () => {
  it('extracts tailwind config', () => {
    const html = `<script>tailwind.config = {
  theme: { colors: { primary: '#ff0' } }
}
</script>`
    const result = extractDesignContext(html)
    expect(result).toContain('TAILWIND CONFIG')
    expect(result).toContain('primary')
  })

  it('extracts Google Fonts links', () => {
    const html = '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">'
    const result = extractDesignContext(html)
    expect(result).toContain('GOOGLE FONTS')
    expect(result).toContain('Inter')
  })

  it('extracts generated image URLs', () => {
    const html = '<img src="/uploads/generated/img-123.png">'
    const result = extractDesignContext(html)
    expect(result).toContain('IMAGENES GENERADAS')
    expect(result).toContain('/uploads/generated/img-123.png')
  })

  it('extracts Unsplash URLs', () => {
    const html = '<img src="https://images.unsplash.com/photo-123?w=800">'
    const result = extractDesignContext(html)
    expect(result).toContain('FOTOS UNSPLASH')
  })

  it('returns empty string when nothing to extract', () => {
    const result = extractDesignContext('<div>Plain content</div>')
    expect(result).toBe('')
  })
})

describe('wrapTextAsHtml', () => {
  it('wraps plain text into a valid HTML document', () => {
    const result = wrapTextAsHtml('Hello world', 'Lupa', 'SEO Strategist')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('Hello world')
    expect(result).toContain('Lupa')
    expect(result).toContain('SEO Strategist')
  })

  it('converts markdown bold to strong tags', () => {
    const result = wrapTextAsHtml('This is **bold** text', 'Nova', 'Designer')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('converts markdown headers', () => {
    const result = wrapTextAsHtml('# Title\n## Subtitle', 'Pixel', 'Web Designer')
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<h2>Subtitle</h2>')
  })
})
