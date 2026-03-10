import { Router } from 'express'
import dns from 'dns'
import { promisify } from 'util'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
const resolveCname = promisify(dns.resolveCname)
const APP_DOMAIN = process.env.APP_DOMAIN || 'plury.co'

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/**
 * POST /api/domains — Add a custom domain to a deliverable
 * Body: { deliverableId: string, domain: string }
 */
router.post('/', authMiddleware, async (req, res) => {
  const { deliverableId, domain } = req.body as { deliverableId: string; domain: string }

  if (!deliverableId || !domain) {
    res.status(400).json({ error: 'deliverableId y domain requeridos' })
    return
  }

  const normalizedDomain = domain.toLowerCase().trim()

  if (!DOMAIN_REGEX.test(normalizedDomain)) {
    res.status(400).json({ error: 'Formato de dominio inválido' })
    return
  }

  try {
    // Verify deliverable exists and user owns it
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { conversation: true },
    })

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    if (deliverable.conversation.userId !== req.auth!.userId) {
      res.status(403).json({ error: 'No tienes permisos sobre este deliverable' })
      return
    }

    if (!deliverable.publishSlug) {
      res.status(400).json({ error: 'El deliverable debe estar publicado primero' })
      return
    }

    // Check domain uniqueness
    const existing = await prisma.deliverable.findFirst({
      where: { customDomain: normalizedDomain },
    })
    if (existing && existing.id !== deliverableId) {
      res.status(409).json({ error: 'Este dominio ya está asociado a otro proyecto' })
      return
    }

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        customDomain: normalizedDomain,
        customDomainStatus: 'pending_dns',
      },
    })

    res.json({
      domain: normalizedDomain,
      status: 'pending_dns',
      instructions: {
        type: 'CNAME',
        host: normalizedDomain,
        value: APP_DOMAIN,
        description: `Añade un registro CNAME en tu proveedor DNS: ${normalizedDomain} → ${APP_DOMAIN}`,
      },
    })
  } catch (err) {
    console.error('[Domains] Error:', err)
    res.status(500).json({ error: 'Error al configurar dominio' })
  }
})

/**
 * POST /api/domains/verify — Verify DNS for a custom domain
 * Body: { deliverableId: string }
 */
router.post('/verify', authMiddleware, async (req, res) => {
  const { deliverableId } = req.body as { deliverableId: string }

  if (!deliverableId) {
    res.status(400).json({ error: 'deliverableId requerido' })
    return
  }

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { conversation: true },
    })

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    if (deliverable.conversation.userId !== req.auth!.userId) {
      res.status(403).json({ error: 'No tienes permisos' })
      return
    }

    if (!deliverable.customDomain) {
      res.status(400).json({ error: 'No hay dominio personalizado configurado' })
      return
    }

    // DNS lookup
    try {
      const records = await resolveCname(deliverable.customDomain)
      const pointsToUs = records.some(r =>
        r.toLowerCase() === APP_DOMAIN || r.toLowerCase().endsWith(`.${APP_DOMAIN}`)
      )

      if (pointsToUs) {
        await prisma.deliverable.update({
          where: { id: deliverableId },
          data: {
            customDomainStatus: 'active',
            customDomainVerifiedAt: new Date(),
          },
        })
        res.json({ status: 'active', domain: deliverable.customDomain })
      } else {
        await prisma.deliverable.update({
          where: { id: deliverableId },
          data: { customDomainStatus: 'error' },
        })
        res.json({
          status: 'error',
          error: `El CNAME apunta a ${records[0] || 'desconocido'}, debe apuntar a ${APP_DOMAIN}`,
        })
      }
    } catch {
      res.json({
        status: 'pending_dns',
        error: 'No se encontró registro CNAME. Los cambios DNS pueden tardar hasta 48 horas.',
      })
    }
  } catch (err) {
    console.error('[Domains] Verify error:', err)
    res.status(500).json({ error: 'Error al verificar dominio' })
  }
})

/**
 * DELETE /api/domains/:deliverableId — Remove custom domain
 */
router.delete('/:deliverableId', authMiddleware, async (req, res) => {
  const deliverableId = req.params.deliverableId as string

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { conversation: true },
    })

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    if (deliverable.conversation.userId !== req.auth!.userId) {
      res.status(403).json({ error: 'No tienes permisos' })
      return
    }

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainVerifiedAt: null,
      },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Domains] Delete error:', err)
    res.status(500).json({ error: 'Error al eliminar dominio' })
  }
})

export default router
