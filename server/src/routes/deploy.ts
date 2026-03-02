import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { deployProject, getDeployStatus, removeDeploy } from '../services/deploy.js'
import { deployToNetlify } from '../services/netlify-deploy.js'
import { slugify, isSlugValid, isSlugAvailable, generateUniqueSlug } from '../utils/slugify.js'

const router = Router()
const APP_DOMAIN = process.env.APP_DOMAIN || 'pluribots.com'

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
router.post('/', optionalAuth, async (req, res) => {
  const { deliverableId, slug: requestedSlug } = req.body as { deliverableId: string; slug?: string }

  if (!deliverableId) {
    res.status(400).json({ error: 'deliverableId requerido' })
    return
  }

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
    })

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
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

    // --- Write HTML to disk ---
    const deployId = deliverable.id
    await deployProject(deployId, deliverable.content)

    // --- Update DB with publish info ---
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        publishSlug: finalSlug,
        publishedAt: new Date(),
      },
    })

    const subdomainUrl = `https://${finalSlug}.${APP_DOMAIN}`
    console.log(`[Deploy] Subdomain deployed: ${subdomainUrl}`)

    res.json({
      url: subdomainUrl,
      slug: finalSlug,
      deployId,
      provider: 'subdomain',
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
router.delete('/:deployId', optionalAuth, async (req, res) => {
  const deployId = req.params.deployId as string

  try {
    removeDeploy(deployId)
    res.json({ ok: true })
  } catch (err) {
    console.error('[Deploy] Remove error:', err)
    res.status(500).json({ error: 'Error al eliminar deploy' })
  }
})

export default router
