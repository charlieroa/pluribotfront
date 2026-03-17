/**
 * Plury Public API v1
 *
 * Authentication: X-API-Key header or Authorization: Bearer pk_...
 * Available on Agency ($99/mo) and Enterprise ($299/mo) plans.
 *
 * Endpoints:
 *   POST   /api/v1/generate                    - Generate a web page/app
 *   GET    /api/v1/generations/:id              - Check generation status & get result
 *   GET    /api/v1/generations                  - List all generations
 *   POST   /api/v1/generations/:id/refine       - Refine/edit with text instructions
 *   POST   /api/v1/generations/:id/publish      - Publish to subdomain
 *   POST   /api/v1/generations/:id/edit         - Apply visual edits (font, color, image)
 *   GET    /api/v1/generations/:id/editor-url   - Get embeddable editor URL
 *   GET    /api/v1/usage                        - Credit balance & usage
 *   GET    /api/v1/agents                       - List available agents
 *   GET    /api/v1/docs                         - API documentation (OpenAPI JSON)
 */
import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import crypto from 'crypto'
import { prisma } from '../db/client.js'
import { apiKeyAuth } from '../middleware/api-key.js'
import { checkCredits, getCreditUsage } from '../services/credit-tracker.js'
import { processMessage } from '../services/orchestrator.js'
import { getExecutingPlan } from '../services/plan-cache.js'
import { refineStep } from '../services/refinement.js'
import { deployProject } from '../services/deploy.js'
import { generateUniqueSlug, isSlugValid, isSlugAvailable } from '../utils/slugify.js'
import { VISUAL_EDITOR_SCRIPT } from '../services/html-utils.js'
import { getNextVersionInfo } from '../services/deliverable-versioning.js'

const router = Router()

// Simple in-memory rate limit for free endpoints (edit, editor)
const editRateMap = new Map<string, { count: number; resetAt: number }>()
const EDIT_RATE_LIMIT = 60   // max requests
const EDIT_RATE_WINDOW = 60_000 // per minute

function checkEditRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = editRateMap.get(userId)
  if (!entry || now > entry.resetAt) {
    editRateMap.set(userId, { count: 1, resetAt: now + EDIT_RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= EDIT_RATE_LIMIT
}

// ─── GET /docs ─── (public, no auth required)
router.get('/docs', (_req, res) => {
  res.json(getOpenApiDocs())
})

// ─── GET /agents ─── (public, no auth required)
router.get('/agents', (_req, res) => {
  res.json({ agents: getAgentsList() })
})

// All remaining v1 routes require API key
router.use(apiKeyAuth)

// ─── POST /generate ───
// Creates a conversation, sends the prompt, and returns a generation ID to poll.
router.post('/generate', async (req, res) => {
  const { prompt, agent, model, webhook_url } = req.body as {
    prompt?: string
    agent?: string    // 'dev' | 'web' | 'seo' | 'content' | 'ads' — default 'dev'
    model?: string    // model override
    webhook_url?: string
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    res.status(400).json({ error: 'prompt is required (min 3 characters)' })
    return
  }

  const userId = req.apiKey!.userId
  const agentId = agent || 'dev'

  // Validate agent
  const validAgents = ['dev', 'web', 'voxel', 'seo', 'content', 'ads']
  if (!validAgents.includes(agentId)) {
    res.status(400).json({
      error: `Invalid agent: ${agentId}. Valid agents: ${validAgents.join(', ')}`,
    })
    return
  }

  // Credit check
  const creditCheck = await checkCredits(userId)
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: 'Insufficient credits',
      balance: creditCheck.balance,
      monthlyCredits: creditCheck.monthlyCredits,
    })
    return
  }

  try {
    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: prompt.slice(0, 80),
      },
    })

    // Save user message
    await prisma.message.create({
      data: {
        id: uuid(),
        conversationId: conversation.id,
        sender: 'User',
        text: prompt,
        type: 'user',
      },
    })

    // Log API usage
    prisma.apiUsageLog.create({
      data: {
        apiKeyId: req.apiKey!.apiKeyId,
        endpoint: '/v1/generate',
        method: 'POST',
        statusCode: 202,
        ip: req.ip || null,
      },
    }).catch(() => {})

    // Store webhook URL if provided
    if (webhook_url) {
      const webhookSecret = crypto.randomBytes(32).toString('hex')
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          webhookUrl: webhook_url,
          webhookSecret,
        },
      })
    }

    // Kick off generation asynchronously
    processMessage(conversation.id, prompt, userId, model).catch((err) => {
      console.error(`[API v1] Generation error for ${conversation.id}:`, err)
    })

    // Return generation ID immediately (async processing)
    res.status(202).json({
      id: conversation.id,
      status: 'processing',
      prompt,
      agent: agentId,
      poll_url: `/api/v1/generations/${conversation.id}`,
      message: 'Generation started. Poll the status endpoint or use webhook.',
    })
  } catch (err) {
    console.error('[API v1] Generate error:', err)
    res.status(500).json({ error: 'Internal error starting generation' })
  }
})

// ─── GET /generations/:id ───
// Poll for generation status and results.
router.get('/generations/:id', async (req, res) => {
  const userId = req.apiKey!.userId
  const convId = req.params.id

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      include: {
        deliverables: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            botType: true,
            version: true,
            publishSlug: true,
            createdAt: true,
          },
        },
        kanbanTasks: {
          select: {
            id: true,
            title: true,
            agent: true,
            status: true,
            botType: true,
            createdAt: true,
          },
        },
        messages: {
          where: { type: 'agent' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            sender: true,
            text: true,
            botType: true,
            createdAt: true,
          },
        },
      },
    })

    if (!conversation) {
      res.status(404).json({ error: 'Generation not found' })
      return
    }

    // Determine status from kanban tasks
    const tasks = conversation.kanbanTasks
    const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done')
    const anyDoing = tasks.some(t => t.status === 'doing')
    const status = allDone ? 'completed' : anyDoing ? 'processing' : tasks.length === 0 ? 'processing' : 'processing'

    // Calculate credits used
    const creditsUsed = await prisma.creditLedger.aggregate({
      where: {
        userId,
        type: { in: ['consumption', 'tool_consumption'] },
        usageRecordId: { not: null },
      },
      _sum: { amount: true },
    })

    // Format deliverables for API response
    const results = conversation.deliverables.map(d => ({
      id: d.id,
      title: d.title,
      type: d.type,
      html: d.type === 'code' || d.type === 'design' ? d.content : undefined,
      text: d.type !== 'code' && d.type !== 'design' ? d.content : undefined,
      agent: d.botType,
      version: d.version,
      published_url: d.publishSlug ? `https://plury.co/p/${d.publishSlug}` : null,
      created_at: d.createdAt.toISOString(),
    }))

    res.json({
      id: conversation.id,
      status,
      results,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        agent: t.agent,
        status: t.status,
      })),
      credits_used: Math.abs(creditsUsed._sum.amount ?? 0),
      created_at: conversation.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[API v1] Get generation error:', err)
    res.status(500).json({ error: 'Internal error fetching generation' })
  }
})

// ─── GET /generations ───
// List all generations for this API key user.
router.get('/generations', async (req, res) => {
  const userId = req.apiKey!.userId
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deliverables: true } },
        kanbanTasks: { select: { status: true } },
      },
    })

    const total = await prisma.conversation.count({ where: { userId } })

    res.json({
      data: conversations.map(c => {
        const tasks = c.kanbanTasks
        const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done')
        return {
          id: c.id,
          title: c.title,
          status: allDone ? 'completed' : 'processing',
          deliverable_count: c._count.deliverables,
          created_at: c.createdAt.toISOString(),
          updated_at: c.updatedAt.toISOString(),
        }
      }),
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[API v1] List generations error:', err)
    res.status(500).json({ error: 'Internal error listing generations' })
  }
})

// ─── GET /usage ───
// Credit balance and usage breakdown.
router.get('/usage', async (req, res) => {
  try {
    const usage = await getCreditUsage(req.apiKey!.userId)
    if (!usage) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({
      balance: usage.balance,
      plan: usage.planId,
      monthly_credits: usage.monthlyCredits,
      consumed_this_cycle: usage.totalConsumed,
      cycle_start: usage.cycleStart,
      by_agent: usage.byAgent,
      by_model: usage.byModel,
    })
  } catch (err) {
    console.error('[API v1] Usage error:', err)
    res.status(500).json({ error: 'Internal error fetching usage' })
  }
})

// ─── POST /generations/:id/refine ───
// Send text feedback to refine/edit the generated website.
router.post('/generations/:id/refine', async (req, res) => {
  const userId = req.apiKey!.userId
  const convId = req.params.id
  const { feedback, deliverable_id } = req.body as { feedback?: string; deliverable_id?: string }

  if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 3) {
    res.status(400).json({ error: 'feedback is required (min 3 characters)' })
    return
  }

  try {
    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      include: { deliverables: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Generation not found' })
      return
    }

    // Credit check
    const creditCheck = await checkCredits(userId)
    if (!creditCheck.allowed) {
      res.status(402).json({ error: 'Insufficient credits', balance: creditCheck.balance })
      return
    }

    // Try to find an existing plan for refinement (in-memory)
    const plan = await getExecutingPlan(convId)
    if (plan) {
      // Find the step to refine (prefer deliverable_id match, else last completed)
      let stepToRefine = plan.steps.find(s => {
        if (deliverable_id) {
          // Match by checking if the step produced this deliverable
          return plan.completedInstances.includes(s.instanceId)
        }
        return false
      })
      if (!stepToRefine) {
        // Fallback: last completed step
        for (let i = plan.steps.length - 1; i >= 0; i--) {
          if (plan.completedInstances.includes(plan.steps[i].instanceId)) {
            stepToRefine = plan.steps[i]
            break
          }
        }
      }

      if (stepToRefine) {
        refineStep(plan, stepToRefine, feedback, userId).catch(err => {
          console.error(`[API v1] Refinement error for ${convId}:`, err)
        })

        res.status(202).json({
          id: convId,
          status: 'refining',
          message: 'Refinement started. Poll the generation endpoint for updated results.',
          poll_url: `/api/v1/generations/${convId}`,
        })
        return
      }
    }

    // Fallback: send as a new message to the conversation (triggers orchestrator)
    await prisma.message.create({
      data: {
        id: uuid(),
        conversationId: convId,
        sender: 'User',
        text: feedback,
        type: 'user',
      },
    })

    processMessage(convId, feedback, userId).catch(err => {
      console.error(`[API v1] Refine via message error for ${convId}:`, err)
    })

    res.status(202).json({
      id: convId,
      status: 'refining',
      message: 'Refinement started. Poll the generation endpoint for updated results.',
      poll_url: `/api/v1/generations/${convId}`,
    })
  } catch (err) {
    console.error('[API v1] Refine error:', err)
    res.status(500).json({ error: 'Internal error starting refinement' })
  }
})

// ─── POST /generations/:id/publish ───
// Publish a deliverable to a plury.co subdomain.
router.post('/generations/:id/publish', async (req, res) => {
  const userId = req.apiKey!.userId
  const convId = req.params.id
  const { deliverable_id, slug } = req.body as { deliverable_id?: string; slug?: string }

  try {
    // Get the conversation's deliverables
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      include: { deliverables: { orderBy: { createdAt: 'desc' } } },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Generation not found' })
      return
    }

    // Find the deliverable to publish
    let deliverable = deliverable_id
      ? conversation.deliverables.find(d => d.id === deliverable_id)
      : conversation.deliverables[0]

    if (!deliverable || !deliverable.content) {
      res.status(400).json({ error: 'No publishable deliverable found' })
      return
    }

    // Determine slug
    let finalSlug = deliverable.publishSlug
    if (!finalSlug) {
      if (slug) {
        const s = slug.toLowerCase()
        const validation = isSlugValid(s)
        if (!validation.valid) {
          res.status(400).json({ error: validation.error })
          return
        }
        if (!(await isSlugAvailable(s))) {
          res.status(409).json({ error: 'Slug already taken' })
          return
        }
        finalSlug = s
      } else {
        finalSlug = await generateUniqueSlug(deliverable.title)
      }
    }

    // Deploy
    await deployProject(deliverable.id, deliverable.content)

    // Update DB
    await prisma.deliverable.update({
      where: { id: deliverable.id },
      data: {
        publishSlug: finalSlug,
        publishedAt: new Date(),
        isPublic: true,
      },
    })

    const APP_DOMAIN = process.env.APP_DOMAIN || 'plury.co'
    const url = `https://${finalSlug}.${APP_DOMAIN}`

    res.json({
      url,
      slug: finalSlug,
      deliverable_id: deliverable.id,
      message: 'Published successfully',
    })
  } catch (err) {
    console.error('[API v1] Publish error:', err)
    res.status(500).json({ error: 'Internal error publishing' })
  }
})

// ─── POST /generations/:id/edit ───
// Apply programmatic visual edits (font, colors, images, text) directly to HTML.
router.post('/generations/:id/edit', async (req, res) => {
  const userId = req.apiKey!.userId
  const convId = req.params.id
  const { deliverable_id, edits } = req.body as {
    deliverable_id?: string
    edits?: Array<{
      action: 'change_font' | 'change_color' | 'change_text' | 'change_image' | 'change_background' | 'apply_style'
      selector: string        // CSS selector to target element(s)
      value: string            // new font family, color hex, text, image URL, etc.
      property?: string        // for apply_style: CSS property name
    }>
  }

  // Rate limit — /edit is free, prevent abuse
  if (!checkEditRateLimit(userId)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 60 edit requests per minute.' })
    return
  }

  if (!edits || !Array.isArray(edits) || edits.length === 0) {
    res.status(400).json({
      error: 'edits array is required',
      example: {
        edits: [
          { action: 'change_font', selector: 'h1', value: "'Montserrat', sans-serif" },
          { action: 'change_color', selector: '.hero h1', value: '#3b82f6' },
          { action: 'change_text', selector: '.hero h1', value: 'New Title' },
          { action: 'change_image', selector: '.hero img', value: 'https://images.unsplash.com/photo-xxx' },
          { action: 'change_background', selector: '.hero', value: '#0f172a' },
          { action: 'apply_style', selector: '.cta-btn', value: '16px', property: 'borderRadius' },
        ],
      },
    })
    return
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      include: { deliverables: { orderBy: { createdAt: 'desc' } } },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Generation not found' })
      return
    }

    let deliverable = deliverable_id
      ? conversation.deliverables.find(d => d.id === deliverable_id)
      : conversation.deliverables[0]

    if (!deliverable || !deliverable.content) {
      res.status(400).json({ error: 'No editable deliverable found' })
      return
    }

    // Build a JS script that applies all edits to the HTML DOM
    const editScript = edits.map((edit, i) => {
      const sel = edit.selector.replace(/'/g, "\\'")
      const val = edit.value.replace(/'/g, "\\'")
      switch (edit.action) {
        case 'change_font':
          return `document.querySelectorAll('${sel}').forEach(function(el){el.style.fontFamily='${val}';});`
        case 'change_color':
          return `document.querySelectorAll('${sel}').forEach(function(el){el.style.color='${val}';});`
        case 'change_background':
          return `document.querySelectorAll('${sel}').forEach(function(el){el.style.backgroundColor='${val}';});`
        case 'change_text':
          return `document.querySelectorAll('${sel}').forEach(function(el){el.textContent='${val}';});`
        case 'change_image':
          return `document.querySelectorAll('${sel}').forEach(function(el){if(el.tagName==='IMG')el.src='${val}';else el.style.backgroundImage='url(${val})';});`
        case 'apply_style': {
          const prop = (edit.property || '').replace(/'/g, "\\'")
          return `document.querySelectorAll('${sel}').forEach(function(el){el.style['${prop}']='${val}';});`
        }
        default:
          return ''
      }
    }).filter(Boolean).join('\n')

    // Inject Google Font links for any font edits
    const fontEdits = edits.filter(e => e.action === 'change_font')
    let fontLinks = ''
    for (const fe of fontEdits) {
      // Extract font name from value like "'Montserrat', sans-serif"
      const match = fe.value.match(/'([^']+)'/)
      if (match) {
        const fontName = match[1].replace(/ /g, '+')
        fontLinks += `<link href="https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">\n`
      }
    }

    // Apply edits: inject script that runs once on load, then removes itself
    let html = deliverable.content
    const applyScript = `<script>(function(){${editScript}document.currentScript.remove();})();</script>`

    if (fontLinks && html.includes('</head>')) {
      html = html.replace('</head>', `${fontLinks}</head>`)
    }
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${applyScript}\n</body>`)
    } else {
      html += applyScript
    }

    // Save as new version
    const { parentId, version } = await getNextVersionInfo(convId, deliverable.instanceId)
    const newId = uuid()
    await prisma.deliverable.create({
      data: {
        id: newId,
        conversationId: convId,
        title: deliverable.title,
        type: deliverable.type,
        content: html,
        agent: deliverable.agent,
        botType: deliverable.botType,
        instanceId: deliverable.instanceId,
        version,
        parentId,
        publishSlug: deliverable.publishSlug,
        createdAt: new Date(),
      },
    })

    // If already published, re-deploy with updated content
    if (deliverable.publishSlug) {
      await deployProject(newId, html)
    }

    res.json({
      deliverable_id: newId,
      version,
      edits_applied: edits.length,
      published_url: deliverable.publishSlug
        ? `https://${deliverable.publishSlug}.${process.env.APP_DOMAIN || 'plury.co'}`
        : null,
      message: 'Edits applied successfully',
    })
  } catch (err) {
    console.error('[API v1] Edit error:', err)
    res.status(500).json({ error: 'Internal error applying edits' })
  }
})

// ─── GET /generations/:id/editor-url ───
// Returns a URL to the embeddable visual editor for this generation.
router.get('/generations/:id/editor-url', async (req, res) => {
  const userId = req.apiKey!.userId
  const convId = req.params.id

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      include: { deliverables: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Generation not found' })
      return
    }

    const deliverable = conversation.deliverables[0]
    if (!deliverable) {
      res.status(400).json({ error: 'No deliverable found to edit' })
      return
    }

    // Generate a short-lived editor token (24h)
    const editorToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Store in dedicated editor token fields (separate from webhook)
    await prisma.conversation.update({
      where: { id: convId },
      data: {
        editorToken,
        editorTokenExpiresAt: expiresAt,
      },
    })

    const APP_DOMAIN = process.env.APP_DOMAIN || 'plury.co'
    const editorUrl = `https://${APP_DOMAIN}/editor?token=${editorToken}&id=${deliverable.id}`

    res.json({
      editor_url: editorUrl,
      deliverable_id: deliverable.id,
      expires_at: expiresAt.toISOString(),
      message: 'Embed this URL in an iframe to let your clients edit visually.',
    })
  } catch (err) {
    console.error('[API v1] Editor URL error:', err)
    res.status(500).json({ error: 'Internal error generating editor URL' })
  }
})

// ─── Helper functions (used by public routes above) ───

function getOpenApiDocs() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Plury API',
      version: '1.0.0',
      description: 'Generate web apps, landing pages, SEO reports, content, and ads with AI agents. Credits are consumed from your Plury plan balance.',
      contact: { email: 'api@plury.co', url: 'https://plury.co' },
    },
    servers: [{ url: 'https://plury.co/api/v1', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Your API key starting with pk_live_...',
        },
      },
    },
    paths: {
      '/generate': {
        post: {
          summary: 'Generate a web page or content',
          description: 'Starts an async generation job. Returns a generation ID to poll for results.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prompt'],
                  properties: {
                    prompt: { type: 'string', description: 'What to generate', example: 'Create a landing page for a pizza delivery business with online ordering' },
                    agent: { type: 'string', enum: ['dev', 'web', 'voxel', 'seo', 'content', 'ads'], default: 'dev', description: 'Which AI agent to use' },
                    model: { type: 'string', description: 'Model override (optional)' },
                    webhook_url: { type: 'string', format: 'uri', description: 'URL to POST results when generation completes. Signed with HMAC-SHA256.' },
                  },
                },
              },
            },
          },
          responses: {
            '202': {
              description: 'Generation started',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Generation ID' },
                      status: { type: 'string', enum: ['processing'] },
                      poll_url: { type: 'string', description: 'URL to poll for status' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Invalid request' },
            '401': { description: 'Invalid API key' },
            '402': { description: 'Insufficient credits' },
            '403': { description: 'Plan does not support API access' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/generations/{id}': {
        get: {
          summary: 'Get generation status and results',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Generation details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: { type: 'string', enum: ['processing', 'completed'] },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            type: { type: 'string' },
                            html: { type: 'string', description: 'HTML content (for code/design types)' },
                            text: { type: 'string', description: 'Text content (for reports/copy)' },
                            agent: { type: 'string' },
                            published_url: { type: 'string', nullable: true },
                          },
                        },
                      },
                      credits_used: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/generations': {
        get: {
          summary: 'List all generations',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': { description: 'Paginated list of generations' },
          },
        },
      },
      '/usage': {
        get: {
          summary: 'Get credit balance and usage',
          responses: {
            '200': {
              description: 'Credit usage details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      balance: { type: 'integer' },
                      plan: { type: 'string' },
                      monthly_credits: { type: 'integer' },
                      consumed_this_cycle: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/generations/{id}/refine': {
        post: {
          summary: 'Refine a generated website with text feedback',
          description: 'Send instructions like "change the hero color to blue" or "add a testimonials section". The AI will regenerate incorporating your feedback.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['feedback'],
                  properties: {
                    feedback: { type: 'string', description: 'What to change', example: 'Change the hero background to dark blue and use Montserrat font' },
                    deliverable_id: { type: 'string', description: 'Specific deliverable to refine (optional, defaults to latest)' },
                  },
                },
              },
            },
          },
          responses: {
            '202': { description: 'Refinement started' },
            '404': { description: 'Generation not found' },
          },
        },
      },
      '/generations/{id}/publish': {
        post: {
          summary: 'Publish to a plury.co subdomain',
          description: 'Deploy the generated website to a live URL like https://my-client.plury.co',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deliverable_id: { type: 'string', description: 'Specific deliverable to publish (optional)' },
                    slug: { type: 'string', description: 'Custom subdomain slug (optional, auto-generated if omitted)', example: 'my-client-site' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Published successfully', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, slug: { type: 'string' } } } } } },
            '409': { description: 'Slug already taken' },
          },
        },
      },
      '/generations/{id}/edit': {
        post: {
          summary: 'Apply visual edits programmatically',
          description: 'FREE — Change fonts, colors, text, images, and styles without AI. No credits consumed. Rate limited to 60 req/min.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['edits'],
                  properties: {
                    deliverable_id: { type: 'string' },
                    edits: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['action', 'selector', 'value'],
                        properties: {
                          action: { type: 'string', enum: ['change_font', 'change_color', 'change_text', 'change_image', 'change_background', 'apply_style'] },
                          selector: { type: 'string', description: 'CSS selector', example: '.hero h1' },
                          value: { type: 'string', description: 'New value', example: '#3b82f6' },
                          property: { type: 'string', description: 'CSS property (for apply_style action)', example: 'borderRadius' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Edits applied' },
            '429': { description: 'Rate limit exceeded (60/min)' },
          },
        },
      },
      '/generations/{id}/editor-url': {
        get: {
          summary: 'Get embeddable visual editor URL',
          description: 'FREE — Returns an embeddable editor URL. Clients edit visually (fonts, colors, images, text). Saves persist to DB. Token expires in 24h.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Editor URL', content: { 'application/json': { schema: { type: 'object', properties: { editor_url: { type: 'string' }, expires_at: { type: 'string' } } } } } },
          },
        },
      },
      '/agents': {
        get: {
          summary: 'List available AI agents',
          responses: { '200': { description: 'List of agents with capabilities' } },
        },
      },
    },
  }

}

function getAgentsList() {
  return [
    {
      id: 'dev',
      name: 'Code',
      description: 'Full-stack developer. Generates complete web apps, landing pages, dashboards, and e-commerce sites as single-file React SPAs.',
      capabilities: ['landing_pages', 'web_apps', 'dashboards', 'ecommerce', 'forms', 'crud_apps'],
      credit_cost: 'Variable — uses Claude Sonnet (~3 credits per 1K output tokens)',
    },
    {
      id: 'web',
      name: 'Pixel',
      description: 'Visual designer. Creates logos, branding materials, social media posts, and banners using AI image generation.',
      capabilities: ['logos', 'branding', 'social_posts', 'banners', 'moodboards'],
      credit_cost: '10 credits per image generation',
    },
    {
      id: 'voxel',
      name: 'Voxel',
      description: '3D artist. Converts uploaded reference images into downloadable 3D assets and clean preview deliverables.',
      capabilities: ['image_to_3d', 'glb_assets', '3d_preview', 'product_visualization'],
      credit_cost: 'Variable - depends on 3D generation',
    },
    {
      id: 'seo',
      name: 'Lupa',
      description: 'SEO specialist. Performs keyword research, competitor analysis, and technical SEO audits.',
      capabilities: ['keyword_research', 'competitor_analysis', 'seo_audit', 'backlink_analysis'],
      credit_cost: 'Variable — uses Claude Haiku (~1 credit per 1K output tokens)',
    },
    {
      id: 'content',
      name: 'Pluma',
      description: 'Content writer. Creates blog posts, email sequences, social media calendars, and marketing copy.',
      capabilities: ['blog_posts', 'email_sequences', 'social_calendars', 'marketing_copy', 'captions'],
      credit_cost: 'Variable — uses Claude Haiku (~1 credit per 1K output tokens)',
    },
    {
      id: 'ads',
      name: 'Metric',
      description: 'Advertising specialist. Plans campaigns, writes ad copy, and manages Meta (Facebook/Instagram) Ads.',
      capabilities: ['campaign_planning', 'ad_copywriting', 'meta_ads_management', 'audience_targeting'],
      credit_cost: 'Variable — uses Claude Haiku (~1 credit per 1K output tokens)',
    },
  ]
}

export default router
