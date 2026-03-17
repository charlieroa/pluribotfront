import type { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../db/client.js'
import { getProjectApiScript, injectVisualOverrides } from '../services/html-utils.js'
import { isCodeProject, buildCodeProjectHtml } from '../services/code-to-html.js'
import { readAllProjectFiles } from '../services/project-storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEPLOY_DIR = path.resolve(__dirname, '../../deploys')
const APP_DOMAIN = process.env.APP_DOMAIN || 'plury.co'

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>No encontrado — Plury</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#334155}
.c{text-align:center;max-width:400px;padding:2rem}
h1{font-size:4rem;font-weight:800;color:#8b5cf6;margin-bottom:.5rem}
p{font-size:1.1rem;margin-bottom:1.5rem}
a{color:#8b5cf6;text-decoration:none;font-weight:600}
a:hover{text-decoration:underline}
</style></head>
<body><div class="c">
<h1>404</h1>
<p>Este sitio no existe o no ha sido publicado.</p>
<a href="https://${APP_DOMAIN}">Ir a Plury</a>
</div></body></html>`

/**
 * Subdomain middleware — intercepts requests to {slug}.plury.co
 * and custom domains, serving the published project HTML.
 * Must be registered BEFORE all routes.
 */
export function subdomainMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip API requests — let Express routes handle them
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    next()
    return
  }

  const host = req.hostname || req.headers.host?.split(':')[0] || ''

  // Check if it's a subdomain of APP_DOMAIN
  let subdomain: string | null = null
  let isCustomDomain = false

  if (host.endsWith(`.${APP_DOMAIN}`)) {
    subdomain = host.slice(0, -(APP_DOMAIN.length + 1))
    // Skip www — treat as main app
    if (!subdomain || subdomain === 'www') {
      next()
      return
    }
  } else if (host === APP_DOMAIN || host === 'localhost' || host === '127.0.0.1') {
    // Main domain or localhost — skip to normal app
    next()
    return
  } else {
    // Custom domain
    isCustomDomain = true
  }

  // Look up the deliverable with its conversation's credentials
  const includeOpts = {
    conversation: { select: { id: true, supabaseUrl: true, supabaseAnonKey: true, projectBackendEnabled: true } },
  }
  const lookup = isCustomDomain
    ? prisma.deliverable.findFirst({
        where: { customDomain: host, customDomainStatus: 'active' },
        include: includeOpts,
      })
    : prisma.deliverable.findUnique({
        where: { publishSlug: subdomain! },
        include: includeOpts,
      })

  lookup
    .then(async deliverable => {
      if (!deliverable) {
        res.status(404).type('html').send(NOT_FOUND_HTML)
        return
      }

      const conv = (deliverable as any).conversation

      // Build injection scripts
      const scripts: string[] = []

      // Supabase (legacy)
      if (conv?.supabaseUrl && conv?.supabaseAnonKey) {
        scripts.push(`<script>window.__SUPABASE_URL__="${conv.supabaseUrl}";window.__SUPABASE_ANON_KEY__="${conv.supabaseAnonKey}";</script>`)
      }

      // Project Backend API client
      if (conv?.projectBackendEnabled && conv?.id) {
        const prodBaseUrl = process.env.CDN_BASE_URL || `https://${APP_DOMAIN}`
        scripts.push(getProjectApiScript(prodBaseUrl, conv.id))
      }

      const visualOverrides = (deliverable as any).visualOverrides as string | null

      const injectAll = (html: string) => {
        let result = html
        if (scripts.length > 0) {
          result = result.replace('</head>', `${scripts.join('\n')}\n</head>`)
        }
        result = injectVisualOverrides(result, visualOverrides)
        return result
      }

      // Try to serve from disk first
      const htmlPath = path.join(DEPLOY_DIR, deliverable.id, 'index.html')
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf-8')
        res.type('html').send(injectAll(html))
        return
      }

      // Fallback to DB content
      if (deliverable.content) {
        let html = deliverable.content

        // v2 manifest: read files from disk
        if (html.startsWith('{"type":"project-v2"') && conv?.id) {
          const files = await readAllProjectFiles(conv.id)
          if (files.length > 0) {
            html = buildCodeProjectHtml(JSON.stringify(files))
          }
        } else if (isCodeProject(html)) {
          // Legacy: multi-file code project (JSON array), build HTML on the fly
          html = buildCodeProjectHtml(html)
        }
        res.type('html').send(injectAll(html))
        return
      }

      res.status(404).type('html').send(NOT_FOUND_HTML)
    })
    .catch(err => {
      console.error('[Subdomain] Error:', err)
      next()
    })
}
