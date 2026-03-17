import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../db/client.js'
import { authMiddleware, optionalAuth } from '../middleware/auth.js'
import { deployProject, getDeployStatus, removeDeploy } from '../services/deploy.js'
import { validateBeforeDeploy } from '../services/test-runner.js'
import { slugify, isSlugValid, isSlugAvailable, generateUniqueSlug } from '../utils/slugify.js'
import { injectVisualOverrides } from '../services/html-utils.js'
import { findAccessibleDeliverable } from '../services/access-control.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = Router()
const APP_DOMAIN = process.env.APP_DOMAIN || 'plury.co'
const THUMBNAILS_DIR = path.resolve(__dirname, '../../uploads/thumbnails')

/**
 * Capture a screenshot of a deployed site using microlink API.
 * Runs async — does not block the deploy response.
 */
async function captureScreenshot(siteUrl: string, deliverableId: string): Promise<void> {
  try {
    // Ensure thumbnails directory exists
    if (!fs.existsSync(THUMBNAILS_DIR)) {
      fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
    }

    // Wait for the site to be accessible (code projects need time to boot React/Babel/deps)
    await new Promise(r => setTimeout(r, 5000))

    // waitUntil: networkidle0 ensures all resources (fonts, images, scripts) are loaded
    // waitForTimeout: generous wait for code projects that boot React+Babel+deps
    const params = new URLSearchParams({
      url: siteUrl,
      screenshot: 'true',
      meta: 'false',
      'viewport.width': '1280',
      'viewport.height': '800',
      waitUntil: 'networkidle0',
      waitForTimeout: '10000',
    })
    const apiUrl = `https://api.microlink.io/?${params.toString()}`
    const resp = await fetch(apiUrl)
    if (!resp.ok) {
      console.error(`[Screenshot] Microlink API error: ${resp.status}`)
      return
    }

    const data = await resp.json() as { status: string; data?: { screenshot?: { url?: string } } }
    const screenshotUrl = data.data?.screenshot?.url
    if (!screenshotUrl) {
      console.error('[Screenshot] No screenshot URL in response')
      return
    }

    // Download the image
    const imgResp = await fetch(screenshotUrl)
    if (!imgResp.ok) return

    const buffer = Buffer.from(await imgResp.arrayBuffer())
    const filename = `${deliverableId}.png`
    const filepath = path.join(THUMBNAILS_DIR, filename)
    fs.writeFileSync(filepath, buffer)

    // Update DB with thumbnail URL
    const thumbnailUrl = `/uploads/thumbnails/${filename}`
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { thumbnailUrl },
    })

    console.log(`[Screenshot] Captured for ${siteUrl} → ${thumbnailUrl}`)
  } catch (err) {
    console.error('[Screenshot] Error:', err)
  }
}

/**
 * GET /api/deploy/check-slug/:slug — Check if a slug is available
 */
router.get('/check-slug/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase()
  const validation = isSlugValid(slug)
  if (!validation.valid) {
    res.json({ available: false, error: validation.error })
    return
  }
  const available = await isSlugAvailable(slug)
  res.json({ available })
})

/**
 * POST /api/deploy/suggest-slug — Suggest a slug from a title
 * Body: { title: string }
 */
router.post('/suggest-slug', async (req, res) => {
  const { title } = req.body as { title?: string }
  if (!title) {
    res.status(400).json({ error: 'title requerido' })
    return
  }
  const slug = await generateUniqueSlug(title)
  res.json({ slug })
})

/**
 * POST /api/deploy — Deploy a deliverable as a static site
 * Body: { deliverableId: string, slug?: string }
 */
router.post('/', authMiddleware, async (req, res) => {
  const { deliverableId, slug: requestedSlug, isPublic } = req.body as { deliverableId: string; slug?: string; isPublic?: boolean }

  if (!deliverableId) {
    res.status(400).json({ error: 'deliverableId requerido' })
    return
  }

  try {
    const deliverable = await findAccessibleDeliverable(deliverableId, req.auth!.userId)

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado o sin permisos' })
      return
    }

    if (!deliverable.content) {
      res.status(400).json({ error: 'El deliverable no tiene contenido para desplegar' })
      return
    }

    // --- Determine publish slug ---
    let finalSlug = deliverable.publishSlug // reuse existing slug on re-deploy

    if (!finalSlug) {
      if (requestedSlug) {
        const slug = requestedSlug.toLowerCase()
        const validation = isSlugValid(slug)
        if (!validation.valid) {
          res.status(400).json({ error: validation.error })
          return
        }
        if (!(await isSlugAvailable(slug))) {
          res.status(409).json({ error: 'Este slug ya está en uso' })
          return
        }
        finalSlug = slug
      } else {
        finalSlug = await generateUniqueSlug(deliverable.title)
      }
    }

    // --- Determine if project should be public ---
    let shouldBePublic = isPublic === true
    if (!shouldBePublic) {
      try {
        const conv = await prisma.conversation.findUnique({
          where: { id: deliverable.conversationId },
          select: { user: { select: { planId: true } } },
        })
        if (conv?.user?.planId === 'starter') shouldBePublic = true
      } catch {}
    }

    // --- Pre-publish validation ---
    const validation = await validateBeforeDeploy(deliverable.content)
    if (!validation.passed && !req.body.skipChecks) {
      res.status(422).json({
        error: 'El proyecto tiene errores que deben corregirse antes de publicar',
        validation,
      })
      return
    }

    // --- Write HTML to disk ---
    const deployId = deliverable.id
    await deployProject(deployId, deliverable.content)

    // --- Update DB with publish info ---
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        publishSlug: finalSlug,
        publishedAt: new Date(),
        isPublic: shouldBePublic,
      },
    })

    const subdomainUrl = `https://${finalSlug}.${APP_DOMAIN}`
    console.log(`[Deploy] Subdomain deployed: ${subdomainUrl}`)

    // Capture screenshot async — don't block the response
    captureScreenshot(subdomainUrl, deliverableId).catch(err =>
      console.error('[Deploy] Screenshot capture failed:', err)
    )

    res.json({
      url: subdomainUrl,
      slug: finalSlug,
      deployId,
      provider: 'subdomain',
      validation,
    })
  } catch (err) {
    console.error('[Deploy] Error:', err)
    res.status(500).json({ error: 'Error al desplegar el proyecto' })
  }
})

/**
 * GET /api/deploy/:deployId — Check deploy status
 */
router.get('/:deployId', async (req, res) => {
  const deployId = req.params.deployId as string
  const status = getDeployStatus(deployId)

  if (status.exists) {
    res.json({ status: 'ready', url: status.url })
  } else {
    res.json({ status: 'not_found' })
  }
})

/**
 * DELETE /api/deploy/:deployId — Remove a deploy
 */
router.delete('/:deployId', authMiddleware, async (req, res) => {
  const deployId = req.params.deployId as string

  try {
    const deliverable = await findAccessibleDeliverable(deployId, req.auth!.userId)
    if (!deliverable) {
      res.status(404).json({ error: 'Deploy no encontrado o sin permisos' })
      return
    }

    removeDeploy(deployId)
    res.json({ ok: true })
  } catch (err) {
    console.error('[Deploy] Remove error:', err)
    res.status(500).json({ error: 'Error al eliminar deploy' })
  }
})

/**
 * POST /api/deploy/:deliverableId/visual-overrides — Save visual edits and re-deploy
 * Body: { theme, edits }
 */
router.post('/:deliverableId/visual-overrides', authMiddleware, async (req, res) => {
  const deliverableId = req.params.deliverableId as string
  const { theme, edits } = req.body as { theme?: any; edits?: any[] }

  try {
    const deliverable = await findAccessibleDeliverable(deliverableId, req.auth!.userId)

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado o sin permisos' })
      return
    }

    // Save the visual overrides as JSON (use raw query since column may not be in Prisma types yet)
    const overridesJson = JSON.stringify({ theme, edits: edits ?? [] })
    await prisma.$executeRawUnsafe(
      `UPDATE Deliverable SET visualOverrides = ? WHERE id = ?`,
      overridesJson,
      deliverableId,
    )

    // If published, re-inject overrides into deployed HTML
    if (deliverable.publishSlug) {
      const htmlPath = path.join(path.resolve(__dirname, '../../deploys'), deliverableId, 'index.html')
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8')
        html = injectVisualOverrides(html, overridesJson)
        fs.writeFileSync(htmlPath, html, 'utf-8')
        console.log(`[Deploy] Visual overrides applied to ${deliverable.publishSlug}.${APP_DOMAIN}`)
      }
    }

    res.json({ ok: true, published: !!deliverable.publishSlug })
  } catch (err) {
    console.error('[Deploy] Save visual overrides error:', err)
    res.status(500).json({ error: 'Error al guardar cambios visuales' })
  }
})

export default router
