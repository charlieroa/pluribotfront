import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { imagenTools } from '../services/tools/imagen.js'
import { consumeToolCredits } from '../services/credit-tracker.js'

const router = Router()

// POST /api/image/edit — user-facing image edit with mask
router.post('/edit', optionalAuth, async (req, res) => {
  try {
    const { imageUrl, maskUrl, prompt } = req.body
    if (!imageUrl || !prompt) {
      res.status(400).json({ error: 'Se requiere imageUrl y prompt' })
      return
    }

    const editTool = imagenTools.find(t => t.name === 'edit_image')
    if (!editTool) {
      res.status(500).json({ error: 'Herramienta de edicion no disponible' })
      return
    }

    const userId = (req as any).user?.id || 'anonymous'
    const result = await editTool.execute(
      { prompt, imageUrl, maskUrl: maskUrl || '', aspectRatio: '1:1', styleType: 'AUTO' },
      { conversationId: 'image-editor', agentId: 'web', agentName: 'Pixel', userId }
    )

    const parsed = JSON.parse(result)

    // Charge credits on success
    if (parsed.success && userId !== 'anonymous') {
      consumeToolCredits(userId, 'web', 'edit_image').catch(err =>
        console.error('[ImageEdit] Error charging credits:', err)
      )
    }

    if (parsed.success) {
      res.json({ url: parsed.url, remoteUrl: parsed.remoteUrl })
    } else {
      res.status(422).json({ error: parsed.error || 'Error al editar imagen' })
    }
  } catch (err) {
    console.error('[ImageEdit] Error:', err)
    res.status(500).json({ error: 'Error interno al editar imagen' })
  }
})

// POST /api/image/proxy — download external image to /uploads/ for editor use
router.post('/proxy', async (req, res) => {
  try {
    const { url } = req.body
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: 'URL invalida' })
      return
    }

    const response = await fetch(url)
    if (!response.ok) {
      res.status(422).json({ error: 'No se pudo descargar la imagen' })
      return
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = `proxy-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`
    const { getStorageProvider } = await import('../services/storage/index.js')
    const storage = getStorageProvider()
    const localUrl = await storage.upload(buffer, filename, 'image/png')

    res.json({ url: localUrl })
  } catch (err) {
    console.error('[ImageProxy] Error:', err)
    res.status(500).json({ error: 'Error descargando imagen' })
  }
})

export default router
