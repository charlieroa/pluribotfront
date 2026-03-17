// Meshy API service — Image to 3D model generation
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MESHY_API_BASE = 'https://api.meshy.ai/openapi/v1'
const MESHY_API_KEY = process.env.MESHY_API_KEY || ''
// Resolve relative to __dirname so it matches the same uploads dir as local.ts and Nginx
const MODELS_DIR = path.resolve(__dirname, '../../uploads/3d-models')

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
}

interface MeshyTask {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
  progress: number
  model_urls?: {
    glb?: string
    fbx?: string
    obj?: string
    usdz?: string
  }
  thumbnail_url?: string
  texture_urls?: Array<{ base_color?: string }>
  created_at: number
  finished_at?: number
}

async function meshyFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${MESHY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meshy API error ${res.status}: ${text}`)
  }
  return res.json()
}

/** Create an Image-to-3D task. Returns the task ID. */
export async function createImageTo3D(imageUrl: string): Promise<string> {
  const body = {
    image_url: imageUrl,
    ai_model: 'meshy-6',
    should_texture: true,
    target_polycount: 15000,
    topology: 'triangle',
  }
  const data = await meshyFetch('/image-to-3d', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data.result as string
}

/** Get task status */
export async function getTask(taskId: string): Promise<MeshyTask> {
  return meshyFetch(`/image-to-3d/${taskId}`) as Promise<MeshyTask>
}

/** Poll until task completes. Returns the finished task. */
export async function waitForTask(taskId: string, onProgress?: (progress: number) => void): Promise<MeshyTask> {
  const maxWait = 5 * 60 * 1000 // 5 min max
  const pollInterval = 5000 // 5s
  const start = Date.now()

  while (Date.now() - start < maxWait) {
    const task = await getTask(taskId)
    if (onProgress) onProgress(task.progress)

    if (task.status === 'SUCCEEDED') return task
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`Meshy task ${task.status}: ${taskId}`)
    }

    await new Promise(r => setTimeout(r, pollInterval))
  }

  throw new Error(`Meshy task timed out after ${maxWait / 1000}s: ${taskId}`)
}

/** Download the GLB file and save it locally. Returns the local path. */
export async function downloadModel(task: MeshyTask): Promise<{ localPath: string; filename: string }> {
  const glbUrl = task.model_urls?.glb
  if (!glbUrl) throw new Error('No GLB URL in task result')

  const filename = `${task.id}.glb`
  const localPath = path.join(MODELS_DIR, filename)

  const res = await fetch(glbUrl)
  if (!res.ok) throw new Error(`Failed to download GLB: ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(localPath, buffer)

  console.log(`[Meshy] Downloaded 3D model: ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`)
  return { localPath, filename }
}

/** Full pipeline: image → 3D model → downloaded GLB */
export async function generateModel(imageUrl: string, onProgress?: (progress: number) => void): Promise<{
  taskId: string
  filename: string
  localPath: string
  thumbnailUrl?: string
}> {
  console.log(`[Meshy] Starting Image-to-3D generation...`)
  const taskId = await createImageTo3D(imageUrl)
  console.log(`[Meshy] Task created: ${taskId}`)

  const task = await waitForTask(taskId, onProgress)
  console.log(`[Meshy] Task completed: ${taskId}`)

  const { localPath, filename } = await downloadModel(task)

  return {
    taskId,
    filename,
    localPath,
    thumbnailUrl: task.thumbnail_url,
  }
}
