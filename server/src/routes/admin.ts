import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/auth.js'
import { broadcast } from '../services/sse.js'
import { adminGrantCredits, resetCreditsForPlan } from '../services/credit-tracker.js'
import { plans } from '../config/plans.js'
import { calculateRealCost, toolApiCosts, getProviderForModel } from '../config/api-costs.js'
import { getProviderHealthStatus, invalidateHealthCache } from '../services/provider-health.js'
import { agentConfigs } from '../config/agents.js'

const router = Router()
const adminAuth = requireRole('superadmin', 'org_admin', 'agent')

// ─── API Keys (existing) ───

router.get('/api-keys', authMiddleware, async (_req, res) => {
  const keys = await prisma.apiKey.findMany()
  const masked = keys.map(k => ({
    id: k.id,
    provider: k.provider,
    key: k.key.slice(0, 8) + '...' + k.key.slice(-4),
    isActive: k.isActive,
  }))
  res.json(masked)
})

router.post('/api-keys', authMiddleware, async (req, res) => {
  const { provider, key } = req.body as { provider: string; key: string }
  if (!provider || !key) {
    res.status(400).json({ error: 'Provider y key son requeridos' })
    return
  }
  const apiKey = await prisma.apiKey.create({
    data: { provider, key, isActive: true },
  })
  res.json({
    id: apiKey.id,
    provider: apiKey.provider,
    key: apiKey.key.slice(0, 8) + '...' + apiKey.key.slice(-4),
    isActive: apiKey.isActive,
  })
})

router.patch('/api-keys/:id', authMiddleware, async (req, res) => {
  const { isActive } = req.body as { isActive: boolean }
  const id = req.params.id as string
  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: { isActive },
  })
  res.json({ id: apiKey.id, provider: apiKey.provider, isActive: apiKey.isActive })
})

router.delete('/api-keys/:id', authMiddleware, async (req, res) => {
  const id = req.params.id as string
  await prisma.apiKey.delete({ where: { id } })
  res.json({ ok: true })
})

// ─── Supervision: Flagged Conversations ───

router.get('/conversations/flagged', adminAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status === 'pending') {
      where.needsHumanReview = true
      where.assignedAgentId = null
    } else if (status === 'assigned') {
      where.needsHumanReview = true
      where.assignedAgentId = { not: null }
    } else if (status === 'resolved') {
      where.needsHumanReview = false
      where.updatedAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    } else {
      where.needsHumanReview = true
    }

    if (req.userRole === 'agent') {
      where.OR = [
        { assignedAgentId: req.auth!.userId },
        { assignedAgentId: null, needsHumanReview: true },
      ]
      delete where.assignedAgentId
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedAgent: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { text: true, sender: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      needsHumanReview: c.needsHumanReview,
      user: c.user,
      assignedAgent: c.assignedAgent,
      lastMessage: c.messages[0] ? {
        text: c.messages[0].text.slice(0, 100),
        sender: c.messages[0].sender,
        createdAt: c.messages[0].createdAt,
      } : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    res.json(result)
  } catch (err) {
    console.error('[Admin] Error fetching flagged conversations:', err)
    res.status(500).json({ error: 'Error al obtener conversaciones' })
  }
})

// ─── Conversation Detail ───

router.get('/conversations/:id', adminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const conversation: any = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedAgent: { select: { id: true, name: true, avatarUrl: true, specialty: true, specialtyColor: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        deliverables: { orderBy: { createdAt: 'desc' } },
        kanbanTasks: {
          orderBy: { createdAt: 'asc' },
          include: { deliverable: true },
        },
      },
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversación no encontrada' })
      return
    }

    const messages = conversation.messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      sender: m.sender,
      text: m.text,
      type: m.type,
      botType: m.botType,
      attachment: m.attachmentJson ? JSON.parse(m.attachmentJson) : undefined,
      approved: m.approved,
      createdAt: m.createdAt,
    }))

    res.json({
      ...conversation,
      messages,
    })
  } catch (err) {
    console.error('[Admin] Error fetching conversation:', err)
    res.status(500).json({ error: 'Error al obtener conversación' })
  }
})

// ─── Assign Agent ───

router.post('/conversations/:id/assign', adminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const { agentId } = req.body as { agentId?: string }
    const assignTo = agentId || req.auth!.userId

    const conversation: any = await prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: assignTo },
      include: { assignedAgent: { select: { id: true, name: true, role: true, specialty: true, specialtyColor: true, avatarUrl: true } } },
    })

    // Notify client that a human agent has joined
    const agent = conversation.assignedAgent
    if (agent) {
      broadcast(id, {
        type: 'human_agent_joined',
        agentName: agent.name,
        agentRole: agent.specialty || (agent.role === 'superadmin' ? 'Supervisor' : agent.role === 'org_admin' ? 'Administrador' : 'Agente'),
        specialty: agent.specialty ?? undefined,
        specialtyColor: agent.specialtyColor ?? undefined,
        avatarUrl: agent.avatarUrl ?? undefined,
      })
    }

    res.json({
      id: conversation.id,
      assignedAgent: conversation.assignedAgent,
    })
  } catch (err) {
    console.error('[Admin] Error assigning agent:', err)
    res.status(500).json({ error: 'Error al asignar agente' })
  }
})

// ─── Resolve Supervision ───

router.post('/conversations/:id/resolve', adminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.conversation.update({
      where: { id },
      data: { needsHumanReview: false },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('[Admin] Error resolving conversation:', err)
    res.status(500).json({ error: 'Error al resolver conversación' })
  }
})

// ─── Intervene in Chat (send human message) ───

router.post('/conversations/:id/message', adminAuth, async (req, res) => {
  try {
    const { text } = req.body as { text: string }
    if (!text?.trim()) {
      res.status(400).json({ error: 'Texto requerido' })
      return
    }

    const conversationId = req.params.id as string
    const agent = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    if (!agent) {
      res.status(404).json({ error: 'Agente no encontrado' })
      return
    }

    const message = await prisma.message.create({
      data: {
        id: uuid(),
        conversationId,
        sender: 'human_agent',
        text: text.trim(),
        type: 'agent',
        botType: agent.id,
      },
    })

    broadcast(conversationId, {
      type: 'human_message',
      agentName: agent.name,
      agentRole: agent.specialty || (agent.role === 'superadmin' ? 'Supervisor' : agent.role === 'org_admin' ? 'Administrador' : 'Agente'),
      text: text.trim(),
      messageId: message.id,
      specialty: agent.specialty ?? undefined,
      specialtyColor: agent.specialtyColor ?? undefined,
      avatarUrl: agent.avatarUrl ?? undefined,
    })

    // Detect "resume AI" commands
    const RESUME_AI_PATTERNS = [/continuar con ia/i, /reanudar ia/i, /resume ai/i, /devolver a la ia/i, /seguir proceso con ia/i, /tarea entregada/i, /trabajo entregado/i, /libero el chat/i]
    const shouldResumeAI = RESUME_AI_PATTERNS.some(p => p.test(text.trim()))

    if (shouldResumeAI) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { needsHumanReview: false, assignedAgentId: null },
      })

      broadcast(conversationId, { type: 'human_agent_left' })

      // Customize message based on pattern
      const isTareaEntregada = /tarea entregada|trabajo entregado/i.test(text.trim())
      const systemText = isTareaEntregada
        ? `${agent.name} ha completado la tarea y entregado el trabajo. La IA vuelve a estar disponible.`
        : 'El agente humano ha devuelto el control a la IA.'

      // Create system message
      const sysMsg = await prisma.message.create({
        data: {
          id: uuid(),
          conversationId,
          sender: 'Sistema',
          text: systemText,
          type: 'agent',
          botType: 'system',
        },
      })

      broadcast(conversationId, {
        type: 'agent_end',
        agentId: 'system',
        messageId: sysMsg.id,
        fullText: sysMsg.text,
      })
    }

    res.json({
      id: message.id,
      sender: 'human_agent',
      text: message.text,
      agentName: agent.name,
      createdAt: message.createdAt,
    })
  } catch (err) {
    console.error('[Admin] Error sending message:', err)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
})

// ─── Manage Kanban Tasks ───

router.patch('/tasks/:taskId', adminAuth, async (req, res) => {
  try {
    const { status } = req.body as { status: string }
    if (!['todo', 'doing', 'done'].includes(status)) {
      res.status(400).json({ error: 'Status inválido' })
      return
    }

    const taskId = req.params.taskId as string
    const task = await prisma.kanbanTask.update({
      where: { id: taskId },
      data: { status },
      include: { deliverable: true },
    })

    broadcast(task.conversationId, {
      type: 'kanban_update',
      task: {
        id: task.id,
        title: task.title,
        agent: task.agent,
        status: task.status as 'todo' | 'doing' | 'done',
        botType: task.botType,
        deliverableId: task.deliverableId ?? undefined,
        instanceId: task.instanceId ?? undefined,
        createdAt: task.createdAt.toISOString(),
      },
    })

    res.json(task)
  } catch (err) {
    console.error('[Admin] Error updating task:', err)
    res.status(500).json({ error: 'Error al actualizar tarea' })
  }
})

// ─── Upload Deliverable as Human Agent ───

router.post('/conversations/:id/deliverable', adminAuth, async (req, res) => {
  try {
    const { title, type, content } = req.body as { title: string; type: string; content: string }
    if (!title || !type || !content) {
      res.status(400).json({ error: 'Título, tipo y contenido son requeridos' })
      return
    }

    const conversationId = req.params.id as string
    const deliverable = await prisma.deliverable.create({
      data: {
        id: uuid(),
        conversationId,
        title,
        type,
        content,
        agent: 'Agente Humano',
        botType: 'human',
      },
    })

    const task = await prisma.kanbanTask.create({
      data: {
        id: uuid(),
        conversationId,
        title,
        agent: 'Agente Humano',
        status: 'done',
        botType: 'human',
        deliverableId: deliverable.id,
      },
    })

    broadcast(conversationId, {
      type: 'deliverable',
      deliverable: {
        id: deliverable.id,
        title: deliverable.title,
        type: deliverable.type as 'report' | 'code' | 'design' | 'copy' | 'video',
        content: deliverable.content,
        agent: deliverable.agent,
        botType: deliverable.botType,
      },
    })

    broadcast(conversationId, {
      type: 'kanban_update',
      task: {
        id: task.id,
        title: task.title,
        agent: task.agent,
        status: task.status as 'todo' | 'doing' | 'done',
        botType: task.botType,
        deliverableId: task.deliverableId ?? undefined,
        createdAt: task.createdAt.toISOString(),
      },
    })

    res.json({ deliverable, task })
  } catch (err) {
    console.error('[Admin] Error creating deliverable:', err)
    res.status(500).json({ error: 'Error al crear entregable' })
  }
})

// ─── Admin Stats ───

router.get('/stats', adminAuth, async (_req, res) => {
  try {
    const [pending, assigned, totalConversations, totalUsers] = await Promise.all([
      prisma.conversation.count({ where: { needsHumanReview: true, assignedAgentId: null } }),
      prisma.conversation.count({ where: { needsHumanReview: true, assignedAgentId: { not: null } } }),
      prisma.conversation.count(),
      prisma.user.count({ where: { role: 'user' } }),
    ])
    res.json({ pending, assigned, totalConversations, totalUsers })
  } catch (err) {
    console.error('[Admin] Error fetching stats:', err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// ─── Billing: Global Stats ───

const superadminAuth = requireRole('superadmin')

router.get('/billing', superadminAuth, async (_req, res) => {
  try {
    // Total credits consumed across platform
    const totalConsumed = await prisma.creditLedger.aggregate({
      where: { type: { in: ['consumption', 'tool_consumption'] } },
      _sum: { amount: true },
    })

    // Total credits granted
    const totalGranted = await prisma.creditLedger.aggregate({
      where: { type: { in: ['plan_grant', 'admin_grant', 'reset'] } },
      _sum: { amount: true },
    })

    // Per-user breakdown
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        planId: true,
        creditBalance: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
      orderBy: { creditBalance: 'asc' },
    })

    // Per-user consumption this cycle
    const userConsumption = await prisma.creditLedger.groupBy({
      by: ['userId'],
      where: { type: { in: ['consumption', 'tool_consumption'] } },
      _sum: { amount: true },
    })
    const consumptionMap = new Map(userConsumption.map(u => [u.userId, Math.abs(u._sum.amount ?? 0)]))

    // Per-model breakdown
    const modelBreakdown = await prisma.creditLedger.groupBy({
      by: ['model'],
      where: { type: 'consumption', model: { not: null } },
      _sum: { amount: true },
    })

    // Per-agent breakdown
    const agentBreakdown = await prisma.creditLedger.groupBy({
      by: ['agentId'],
      where: { type: { in: ['consumption', 'tool_consumption'] }, agentId: { not: null } },
      _sum: { amount: true },
    })

    // Per-organization breakdown
    const orgMap = new Map<string, { name: string; consumed: number; balance: number; userCount: number }>()
    for (const u of users) {
      const orgId = u.organizationId ?? 'sin_org'
      const orgName = u.organization?.name ?? 'Sin organizacion'
      const existing = orgMap.get(orgId) ?? { name: orgName, consumed: 0, balance: 0, userCount: 0 }
      existing.consumed += consumptionMap.get(u.id) ?? 0
      existing.balance += u.creditBalance
      existing.userCount++
      orgMap.set(orgId, existing)
    }

    res.json({
      totalConsumed: Math.abs(totalConsumed._sum.amount ?? 0),
      totalGranted: totalGranted._sum.amount ?? 0,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        planId: u.planId,
        creditBalance: u.creditBalance,
        consumed: consumptionMap.get(u.id) ?? 0,
        organization: u.organization?.name ?? null,
      })),
      byModel: modelBreakdown.map(m => ({
        model: m.model,
        credits: Math.abs(m._sum.amount ?? 0),
      })),
      byAgent: agentBreakdown.map(a => ({
        agentId: a.agentId,
        credits: Math.abs(a._sum.amount ?? 0),
      })),
      byOrganization: Array.from(orgMap.entries()).map(([id, data]) => ({
        id,
        ...data,
      })),
    })
  } catch (err) {
    console.error('[Admin] Billing stats error:', err)
    res.status(500).json({ error: 'Error al obtener estadisticas de facturacion' })
  }
})

// ─── Grant Credits ───

router.post('/credits/grant', superadminAuth, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body as { userId: string; amount: number; reason: string }

    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ error: 'userId y amount (> 0) son requeridos' })
      return
    }

    const result = await adminGrantCredits(userId, amount, reason || 'Creditos otorgados por admin')
    res.json({ ok: true, balance: result.balance })
  } catch (err) {
    console.error('[Admin] Grant credits error:', err)
    res.status(500).json({ error: 'Error al otorgar creditos' })
  }
})

// ─── Change User Plan ───

router.post('/users/:id/plan', superadminAuth, async (req, res) => {
  try {
    const userId = req.params.id as string
    const { planId } = req.body as { planId: string }

    if (!planId || !plans[planId]) {
      res.status(400).json({ error: `Plan invalido. Opciones: ${Object.keys(plans).join(', ')}` })
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: { planId },
    })

    await resetCreditsForPlan(userId, planId)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, planId: true, creditBalance: true },
    })

    res.json({ ok: true, user })
  } catch (err) {
    console.error('[Admin] Change plan error:', err)
    res.status(500).json({ error: 'Error al cambiar plan' })
  }
})

// ─── API Costs & Profitability ───

router.get('/costs', superadminAuth, async (_req, res) => {
  try {
    // 1. Get all usage records grouped by model
    const usageByModel = await prisma.usageRecord.groupBy({
      by: ['model'],
      _sum: { inputTokens: true, outputTokens: true },
      _count: { id: true },
    })

    // 2. Calculate real USD cost per model and aggregate by provider
    const byProvider: Record<string, { cost: number; tokens: { input: number; output: number } }> = {
      anthropic: { cost: 0, tokens: { input: 0, output: 0 } },
      openai: { cost: 0, tokens: { input: 0, output: 0 } },
      google: { cost: 0, tokens: { input: 0, output: 0 } },
    }

    const byModel: Array<{ model: string; calls: number; cost: number; creditsCharged: number }> = []
    let totalApiCost = 0

    // Get credit consumption per model for creditsCharged
    const creditsByModel = await prisma.creditLedger.groupBy({
      by: ['model'],
      where: { type: 'consumption', model: { not: null } },
      _sum: { amount: true },
    })
    const creditsMap = new Map(creditsByModel.map(c => [c.model, Math.abs(c._sum.amount ?? 0)]))

    for (const record of usageByModel) {
      const inputTokens = record._sum.inputTokens ?? 0
      const outputTokens = record._sum.outputTokens ?? 0
      const calls = record._count.id
      const cost = calculateRealCost(record.model, inputTokens, outputTokens)
      const provider = getProviderForModel(record.model)

      totalApiCost += cost

      if (byProvider[provider]) {
        byProvider[provider].cost += cost
        byProvider[provider].tokens.input += inputTokens
        byProvider[provider].tokens.output += outputTokens
      }

      byModel.push({
        model: record.model,
        calls,
        cost: Math.round(cost * 100) / 100,
        creditsCharged: creditsMap.get(record.model) ?? 0,
      })
    }

    // Round provider costs
    for (const key of Object.keys(byProvider)) {
      byProvider[key].cost = Math.round(byProvider[key].cost * 100) / 100
    }

    // 3. Calculate tool costs from CreditLedger entries with type 'tool_consumption'
    const toolLedgerEntries = await prisma.creditLedger.findMany({
      where: { type: 'tool_consumption' },
      select: { description: true, amount: true },
    })

    const toolCosts: Record<string, { calls: number; cost: number }> = {}
    let totalToolCost = 0

    for (const entry of toolLedgerEntries) {
      // Extract tool name from description (e.g., "Tool: generate_image" or similar)
      const toolMatch = entry.description.match(/(?:Tool|Herramienta):\s*(\w+)/i)
        ?? entry.description.match(/(generate_image|generate_video|search_stock_photo|search_web|run_code|deploy_site)/i)
      const toolName = toolMatch ? toolMatch[1] : 'unknown'

      if (!toolCosts[toolName]) {
        toolCosts[toolName] = { calls: 0, cost: 0 }
      }
      toolCosts[toolName].calls++
      const unitCost = toolApiCosts[toolName] ?? 0
      toolCosts[toolName].cost += unitCost
      totalToolCost += unitCost
    }

    // Round tool costs
    for (const key of Object.keys(toolCosts)) {
      toolCosts[key].cost = Math.round(toolCosts[key].cost * 100) / 100
    }

    totalApiCost = Math.round((totalApiCost + totalToolCost) * 100) / 100

    // 4. Calculate total credits consumed
    const totalConsumedResult = await prisma.creditLedger.aggregate({
      where: { type: { in: ['consumption', 'tool_consumption'] } },
      _sum: { amount: true },
    })
    const totalCreditsConsumed = Math.abs(totalConsumedResult._sum.amount ?? 0)

    // 5. Calculate revenue from paying users' plan prices
    const users = await prisma.user.findMany({
      select: { planId: true },
      where: { role: 'user' },
    })

    let totalRevenue = 0
    for (const u of users) {
      const plan = plans[u.planId]
      if (plan) totalRevenue += plan.price
    }

    // 6. Calculate margin
    const margin = Math.round((totalRevenue - totalApiCost) * 100) / 100
    const marginPercent = totalRevenue > 0
      ? Math.round((margin / totalRevenue) * 1000) / 10
      : 0

    // Sort byModel by cost descending
    byModel.sort((a, b) => b.cost - a.cost)

    res.json({
      totalApiCost,
      totalCreditsConsumed,
      totalRevenue,
      margin,
      marginPercent,
      byProvider,
      byModel,
      toolCosts,
    })
  } catch (err) {
    console.error('[Admin] Costs error:', err)
    res.status(500).json({ error: 'Error al obtener costos de API' })
  }
})

// ─── Users CRUD (superadmin) ───

router.get('/users', superadminAuth, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planId: true,
        creditBalance: true,
        organizationId: true,
        organization: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    console.error('[Admin] Users list error:', err)
    res.status(500).json({ error: 'Error al listar usuarios' })
  }
})

router.patch('/users/:id', superadminAuth, async (req, res) => {
  try {
    const userId = req.params.id as string
    const { role, planId, creditBalance } = req.body as { role?: string; planId?: string; creditBalance?: number }

    const data: Record<string, unknown> = {}
    if (role && ['user', 'agent', 'org_admin', 'superadmin'].includes(role)) data.role = role
    if (planId && plans[planId]) {
      data.planId = planId
      await resetCreditsForPlan(userId, planId)
    }
    if (typeof creditBalance === 'number') data.creditBalance = creditBalance

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, planId: true, creditBalance: true },
    })
    res.json(user)
  } catch (err) {
    console.error('[Admin] Update user error:', err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

router.delete('/users/:id', superadminAuth, async (req, res) => {
  try {
    const userId = req.params.id as string
    // Delete related records first
    await prisma.creditLedger.deleteMany({ where: { userId } })
    await prisma.usageRecord.deleteMany({ where: { userId } })
    await prisma.userBot.deleteMany({ where: { userId } })
    await prisma.seniorSubscription.deleteMany({ where: { userId } })
    await prisma.seniorTask.deleteMany({ where: { requestedById: userId } })

    // Delete user's conversations (messages, deliverables, kanban tasks)
    const convIds = (await prisma.conversation.findMany({ where: { userId }, select: { id: true } })).map(c => c.id)
    if (convIds.length > 0) {
      await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } })
      await prisma.kanbanTask.deleteMany({ where: { conversationId: { in: convIds } } })
      await prisma.deliverable.deleteMany({ where: { conversationId: { in: convIds } } })
      await prisma.conversation.deleteMany({ where: { userId } })
    }

    await prisma.user.delete({ where: { id: userId } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[Admin] Delete user error:', err)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
})

// ─── Organizations CRUD (superadmin) ───

router.get('/organizations', superadminAuth, async (_req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(orgs.map(o => ({
      id: o.id,
      name: o.name,
      logoUrl: o.logoUrl,
      primaryColor: o.primaryColor,
      createdAt: o.createdAt,
      memberCount: o._count.members,
    })))
  } catch (err) {
    console.error('[Admin] Organizations list error:', err)
    res.status(500).json({ error: 'Error al listar organizaciones' })
  }
})

router.patch('/organizations/:id', superadminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const { name, primaryColor, logoUrl } = req.body as { name?: string; primaryColor?: string; logoUrl?: string }
    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (primaryColor !== undefined) data.primaryColor = primaryColor
    if (logoUrl !== undefined) data.logoUrl = logoUrl

    const org = await prisma.organization.update({ where: { id }, data })
    res.json(org)
  } catch (err) {
    console.error('[Admin] Update organization error:', err)
    res.status(500).json({ error: 'Error al actualizar organizacion' })
  }
})

router.delete('/organizations/:id', superadminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    // Unlink members first
    await prisma.user.updateMany({ where: { organizationId: id }, data: { organizationId: null } })
    await prisma.organization.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[Admin] Delete organization error:', err)
    res.status(500).json({ error: 'Error al eliminar organizacion' })
  }
})

// ─── Global Bot Config (superadmin) ───

router.get('/bots', superadminAuth, async (_req, res) => {
  try {
    const configs = await prisma.globalBotConfig.findMany()
    const configMap = new Map(configs.map(c => [c.botId, c.isActive]))

    const bots = agentConfigs.map(a => ({
      botId: a.id,
      name: a.name,
      role: a.role,
      isActive: configMap.get(a.id) ?? true, // default active
    }))
    res.json(bots)
  } catch (err) {
    console.error('[Admin] Bots list error:', err)
    res.status(500).json({ error: 'Error al listar bots' })
  }
})

router.patch('/bots/:botId', superadminAuth, async (req, res) => {
  try {
    const botId = req.params.botId as string
    const { isActive } = req.body as { isActive: boolean }

    const config = await prisma.globalBotConfig.upsert({
      where: { botId },
      update: { isActive },
      create: { botId, isActive },
    })
    res.json(config)
  } catch (err) {
    console.error('[Admin] Toggle bot error:', err)
    res.status(500).json({ error: 'Error al cambiar estado del bot' })
  }
})

// ─── Provider Health Status ───

router.get('/provider-status', authMiddleware, async (_req, res) => {
  try {
    const health = await getProviderHealthStatus()
    res.json(health)
  } catch (err) {
    console.error('[Admin] Provider status error:', err)
    res.status(500).json({ error: 'Error al verificar estado de proveedores' })
  }
})

router.post('/provider-status/refresh', authMiddleware, async (_req, res) => {
  try {
    invalidateHealthCache()
    const health = await getProviderHealthStatus()
    res.json(health)
  } catch (err) {
    console.error('[Admin] Provider refresh error:', err)
    res.status(500).json({ error: 'Error al refrescar estado de proveedores' })
  }
})

export default router
