import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { getStorageProvider } from '../services/storage/index.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imagenes'))
    }
  },
})

const router = Router()

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No se recibio imagen' })
    return
  }

  try {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(req.file.originalname)
    const filename = `${uniqueSuffix}${ext}`

    const storage = getStorageProvider()
    const url = await storage.upload(req.file.buffer, filename, req.file.mimetype)

    res.json({ url, filename })
  } catch (err) {
    console.error('[Upload] Error:', err)
    res.status(500).json({ error: 'Error al subir imagen' })
  }
})

export default router
