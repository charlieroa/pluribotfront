import 'dotenv/config'

// Safety net: prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err)
})
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import chatRouter from './routes/chat.js'
import authRouter from './routes/auth.js'
import conversationsRouter from './routes/conversations.js'
import usageRouter from './routes/usage.js'
import adminRouter from './routes/admin.js'
import uploadRouter from './routes/upload.js'
import userRouter from './routes/user.js'
import organizationRouter from './routes/organization.js'
import unsplashRouter from './routes/unsplash.js'
import seniorRouter from './routes/senior.js'
import deployRouter from './routes/deploy.js'
import portfolioRouter from './routes/portfolio.js'
import domainsRouter from './routes/domains.js'
import githubRouter from './routes/github.js'
import metaRouter from './routes/meta.js'
import projectDataRouter from './routes/project-data.js'
import workflowRouter from './routes/workflow.js'
import projectsRouter from './routes/projects.js'
import apiKeysRouter from './routes/api-keys.js'
import v1Router from './routes/v1.js'
import sdkRouter from './routes/sdk.js'
import embedRouter from './routes/embed.js'
import editorRouter from './routes/editor.js'
import meshyRouter from './routes/meshy.js'
import imageEditRouter from './routes/image-edit.js'
import billingRouter, { stripeWebhookHandler } from './routes/billing.js'
import { errorHandler } from './middleware/errors.js'
import { getDeployDir } from './services/deploy.js'
import { subdomainMiddleware } from './middleware/subdomain.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = parseInt(process.env.PORT ?? '3002', 10)
const isProduction = process.env.NODE_ENV === 'production'

function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}

// Middleware
app.disable('x-powered-by')
app.set('trust proxy', 1)
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow any *.plury.co subdomain and WebContainer origins (for project previews)
    try {
      const url = new URL(origin)
      if (url.hostname.endsWith('.plury.co')) return callback(null, true)
      if (url.hostname.includes('webcontainer')) return callback(null, true)
      if (url.hostname.endsWith('.local-credentialless.webcontainer-api.io')) return callback(null, true)
    } catch { /* ignore parse errors */ }
    // Allow any origin for API v1 and SDK routes (agencies embed from their own domains)
    // The API key auth middleware handles authorization
    callback(null, true)
  },
  credentials: true,
}))
app.post('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  stripeWebhookHandler(req, res).catch(err => {
    console.error('[Billing] Stripe webhook fatal error:', err)
    res.status(400).json({ error: 'Stripe webhook error' })
  })
})
app.use(securityHeaders)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }))

// Subdomain routing — MUST be before all routes
app.use(subdomainMiddleware)

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/chat', chatRouter)
app.use('/api/conversations', conversationsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/usage', usageRouter)
app.use('/api/admin', adminRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/user', userRouter)
app.use('/api/organization', organizationRouter)
app.use('/api/unsplash', unsplashRouter)
app.use('/api/senior', seniorRouter)
app.use('/api/deploy', deployRouter)
app.use('/api/domains', domainsRouter)
app.use('/api/portfolio', portfolioRouter)
app.use('/api/github', githubRouter)
app.use('/api/meta', metaRouter)
app.use('/api/billing', billingRouter)
app.use('/api/project', projectDataRouter)
app.use('/api/workflow', workflowRouter)
app.use('/api/api-keys', apiKeysRouter)
app.use('/api/v1', v1Router)
app.use('/sdk', sdkRouter)
app.use('/embed', embedRouter)
app.use('/editor', editorRouter)
app.use('/api/3d', meshyRouter)
app.use('/api/image', imageEditRouter)

// Serve deployed projects as static files
app.use('/deploys', express.static(getDeployDir()))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Community Gallery ───
app.get('/api/community/images', async (_req, res) => {
  try {
    const images = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, imageUrl, prompt, authorName, model, likes, createdAt FROM CommunityImage ORDER BY createdAt DESC LIMIT 50`
    )
    res.json(images)
  } catch (err) {
    console.error('[Community] List error:', err)
    res.json([])
  }
})

app.post('/api/community/share', async (req, res) => {
  try {
    const { imageUrl, prompt, model } = req.body as { imageUrl: string; prompt?: string; model?: string }
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' })

    let authorName = 'Anónimo'
    let authorId: string | null = null
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken')
        const decoded = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET || 'plury-secret') as any
        if (decoded?.userId) {
          const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { name: true, id: true } })
          if (user) { authorName = user.name; authorId = user.id }
        }
      } catch {}
    }

    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO CommunityImage (id, imageUrl, prompt, authorName, authorId, model, likes, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      id, imageUrl, prompt || null, authorName, authorId, model || null
    )
    res.json({ id, shared: true })
  } catch (err) {
    console.error('[Community] Share error:', err)
    res.status(500).json({ error: 'Error sharing image' })
  }
})

// Available providers (public — used by frontend to filter model selector)
import { getDisabledProviders } from './services/provider-health.js'
app.get('/api/providers/available', async (_req, res) => {
  try {
    const disabled = await getDisabledProviders()
    const all = ['anthropic'] as const
    const available = all.filter(p => !disabled.has(p))
    res.json({ available, disabled: [...disabled] })
  } catch (err) {
    console.error('[Providers] Error:', err)
    // Fallback: assume all available to avoid blocking users
    res.json({ available: ['anthropic'], disabled: [] })
  }
})

// Available bots (public — used by frontend to check globally disabled bots)
import { prisma } from './db/client.js'
app.get('/api/bots/available', async (_req, res) => {
  try {
    const disabled = await prisma.globalBotConfig.findMany({ where: { isActive: false } })
    const disabledIds = disabled.map(d => d.botId)
    res.json({ disabledIds })
  } catch (err) {
    console.error('[Bots] Error:', err)
    res.json({ disabledIds: [] })
  }
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[Plury] Server running on http://localhost:${PORT}`)
})
