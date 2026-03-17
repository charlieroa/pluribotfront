import { Router } from 'express'
import { generateModel, getTask } from '../services/meshy.js'

const router = Router()

// POST /api/3d/generate — Start 3D model generation from image URL
router.post('/generate', async (req, res) => {
  const { imageUrl } = req.body
  if (!imageUrl) {
    res.status(400).json({ error: 'imageUrl is required' })
    return
  }

  try {
    const result = await generateModel(imageUrl, (progress) => {
      // Progress is tracked internally, could be SSE'd in future
    })

    res.json({
      success: true,
      taskId: result.taskId,
      modelUrl: `/uploads/3d-models/${result.filename}`,
      thumbnailUrl: result.thumbnailUrl,
    })
  } catch (err: any) {
    console.error('[Meshy] Generation failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/3d/status/:taskId — Check generation status
router.get('/status/:taskId', async (req, res) => {
  try {
    const task = await getTask(req.params.taskId)
    res.json({
      status: task.status,
      progress: task.progress,
      modelUrl: task.status === 'SUCCEEDED' ? `/uploads/3d-models/${task.id}.glb` : null,
      thumbnailUrl: task.thumbnail_url,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
