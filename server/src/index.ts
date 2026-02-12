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
import { errorHandler } from './middleware/errors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// Middleware
app.use(cors())
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[Pluribots] Server running on http://localhost:${PORT}`)
})
