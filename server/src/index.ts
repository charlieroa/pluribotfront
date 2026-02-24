import 'dotenv/config'
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
import githubRouter from './routes/github.js'
import portfolioRouter from './routes/portfolio.js'
import { errorHandler } from './middleware/errors.js'
import { getDeployDir } from './services/deploy.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = parseInt(process.env.PORT ?? '3002', 10)

// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true,
}))
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/chat', chatRouter)
app.use('/api/conversations', conversationsRouter)
app.use('/api/usage', usageRouter)
app.use('/api/admin', adminRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/user', userRouter)
app.use('/api/organization', organizationRouter)
app.use('/api/unsplash', unsplashRouter)
app.use('/api/senior', seniorRouter)
app.use('/api/deploy', deployRouter)
app.use('/api/github', githubRouter)
app.use('/api/portfolio', portfolioRouter)

// Serve deployed projects as static files
app.use('/deploys', express.static(getDeployDir()))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Available providers (public — used by frontend to filter model selector)
import { getDisabledProviders } from './services/provider-health.js'
app.get('/api/providers/available', async (_req, res) => {
  try {
    const disabled = await getDisabledProviders()
    const all = ['anthropic', 'openai', 'google'] as const
    const available = all.filter(p => !disabled.has(p))
    res.json({ available, disabled: [...disabled] })
  } catch (err) {
    console.error('[Providers] Error:', err)
    // Fallback: assume all available to avoid blocking users
    res.json({ available: ['anthropic', 'openai', 'google'], disabled: [] })
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
  console.log(`[Pluribots] Server running on http://localhost:${PORT}`)
})
