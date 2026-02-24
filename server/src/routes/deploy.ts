import { Router } from 'express'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { deployProject, getDeployStatus, removeDeploy } from '../services/deploy.js'
import { deployToNetlify } from '../services/netlify-deploy.js'

const router = Router()

/**
 * POST /api/deploy — Deploy a deliverable as a static site
 * Body: { deliverableId: string }
 * Response: { url: string, deployId: string, provider: 'netlify' | 'local', adminUrl?: string }
 */
router.post('/', optionalAuth, async (req, res) => {
  const { deliverableId } = req.body as { deliverableId: string }

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

    // Try Netlify deploy if token is configured
    if (process.env.NETLIFY_TOKEN) {
      try {
        const result = await deployToNetlify(
          deliverable.content,
          deliverable.netlifySiteId ?? undefined
        )

        // Persist site ID and URL for re-deploy
        await prisma.deliverable.update({
          where: { id: deliverableId },
          data: {
            netlifySiteId: result.siteId,
            netlifyUrl: result.url,
          },
        })

        console.log(`[Deploy] Netlify deployed: ${result.url}`)

        res.json({
          url: result.url,
          deployId: result.deployId,
          provider: 'netlify',
          adminUrl: result.adminUrl,
        })
        return
      } catch (netlifyErr) {
        console.error('[Deploy] Netlify error, falling back to local:', netlifyErr)
        // Fall through to local deploy
      }
    }

    // Fallback: local deploy
    const deployId = deliverableId
    const url = await deployProject(deployId, deliverable.content)

    console.log(`[Deploy] Local deployed: ${url}`)

    res.json({ url, deployId, provider: 'local' })
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
