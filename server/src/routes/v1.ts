/**
 * Plury Public API v1
 *
 * Authentication: X-API-Key header or Authorization: Bearer pk_...
 * Available on Agency ($99/mo) and Enterprise ($299/mo) plans.
 *
 * Endpoints:
 *   POST   /api/v1/generate        - Generate a web page/app
 *   GET    /api/v1/generations/:id  - Check generation status & get result
 *   GET    /api/v1/usage            - Credit balance & usage
 *   GET    /api/v1/agents           - List available agents
 *   GET    /api/v1/docs             - API documentation (OpenAPI JSON)
 */
import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { apiKeyAuth } from '../middleware/api-key.js'
import { checkCredits, getCreditUsage } from '../services/credit-tracker.js'
import { processMessage } from '../services/orchestrator.js'

const router = Router()

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
  const validAgents = ['dev', 'web', 'seo', 'content', 'ads']
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
      // Store as conversation metadata (using title suffix for simplicity)
      // TODO: add dedicated webhook column
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
            netlifyUrl: true,
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
      published_url: d.publishSlug ? `https://plury.co/p/${d.publishSlug}` : d.netlifyUrl || null,
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
                    agent: { type: 'string', enum: ['dev', 'web', 'seo', 'content', 'ads'], default: 'dev', description: 'Which AI agent to use' },
                    model: { type: 'string', description: 'Model override (optional)' },
                    webhook_url: { type: 'string', format: 'uri', description: 'URL to POST results when generation completes (coming soon)' },
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
