import { prisma } from '../db/client.js'

const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'cdn', 'staging', 'dev', 'test',
  'blog', 'help', 'support', 'status', 'docs', 'ftp', 'smtp', 'pop',
  'ns1', 'ns2', 'mx', 'dashboard', 'panel', 'login', 'signup',
])

/**
 * Normalize text to a URL-safe slug (lowercase, no accents, hyphens).
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')    // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')        // trim leading/trailing hyphens
    .slice(0, 63)
}

/**
 * Validate a slug: 3-63 chars, alphanumeric + hyphens, no reserved words.
 */
export function isSlugValid(slug: string): { valid: boolean; error?: string } {
  if (slug.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' }
  if (slug.length > 63) return { valid: false, error: 'Máximo 63 caracteres' }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { valid: false, error: 'Solo letras, números y guiones (no al inicio/final)' }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: 'Este nombre está reservado' }
  }
  return { valid: true }
}

/**
 * Check if a slug is available in the database.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.deliverable.findUnique({
    where: { publishSlug: slug },
    select: { id: true },
  })
  return !existing
}

/**
 * Generate a unique slug from a title, appending -2, -3, etc. if taken.
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'proyecto'
  if (await isSlugAvailable(base)) return base

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`.slice(0, 63)
    if (await isSlugAvailable(candidate)) return candidate
  }

  // Fallback: append random suffix
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`.slice(0, 63)
}
