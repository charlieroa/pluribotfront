import { Router } from 'express'
import { prisma } from '../db/client.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { seniorTiers } from '../config/senior-tiers.js'

const router = Router()
const superadminAuth = requireRole('superadmin')

// ═══════════════════════════════════════════════════════════════
// Agency endpoints (authenticated users)
// ═══════════════════════════════════════════════════════════════

// ─── GET /subscription — Current user's senior subscription ───
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId
    const subscription = await prisma.seniorSubscription.findFirst({
      where: { userId, status: 'active' },
    })
    res.json({ subscription, tiers: seniorTiers })
  } catch (err) {
    console.error('[Senior] Error fetching subscription:', err)
    res.status(500).json({ error: 'Error al obtener suscripción' })
  }
})

// ─── POST /tasks — Create a new senior task request ───
router.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId

    // Check active subscription
    const subscription = await prisma.seniorSubscription.findFirst({
      where: { userId, status: 'active' },
    })
    if (!subscription) {
      res.status(403).json({ error: 'No tienes una suscripción Senior activa' })
      return
    }

    // Check maxConcurrent limit
    const activeTasks = await prisma.seniorTask.count({
      where: {
        requestedById: userId,
        status: { in: ['pending', 'in_progress', 'review'] },
      },
    })
    if (activeTasks >= subscription.maxConcurrent) {
      res.status(400).json({
        error: `Has alcanzado el límite de ${subscription.maxConcurrent} tarea(s) simultánea(s). Espera a que se complete una tarea antes de solicitar otra.`,
      })
      return
    }

    const { title, description, category, priority } = req.body as {
      title: string
      description: string
      category: string
      priority?: string
    }

    if (!title || !description || !category) {
      res.status(400).json({ error: 'Título, descripción y categoría son requeridos' })
      return
    }

    const validCategories = ['design', 'development', 'seo', 'ads', 'strategy', 'branding', 'video']
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: `Categoría inválida. Opciones: ${validCategories.join(', ')}` })
      return
    }

    // Calculate SLA deadline
    const slaDeadline = new Date(Date.now() + subscription.slaHours * 60 * 60 * 1000)

    // Fetch user to get organizationId
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } })

    const task = await prisma.seniorTask.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'normal',
        requestedById: userId,
        organizationId: user?.organizationId ?? null,
        slaDeadline,
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        senior: true,
      },
    })

    res.json(task)
  } catch (err) {
    console.error('[Senior] Error creating task:', err)
    res.status(500).json({ error: 'Error al crear tarea' })
  }
})

// ─── GET /tasks — List all tasks for the requesting user/org ───
router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId
    const status = req.query.status as string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { requestedById: userId }
    if (status) {
      where.status = status
    }

    const tasks = await prisma.seniorTask.findMany({
      where,
      include: {
        senior: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(tasks)
  } catch (err) {
    console.error('[Senior] Error listing tasks:', err)
    res.status(500).json({ error: 'Error al listar tareas' })
  }
})

// ─── GET /tasks/:id — Get task detail ───
router.get('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId
    const id = req.params.id as string

    const task = await prisma.seniorTask.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        senior: { select: { id: true, name: true, role: true, email: true } },
      },
    })

    if (!task) {
      res.status(404).json({ error: 'Tarea no encontrada' })
      return
    }

    // Only the requester can see their own tasks
    if (task.requestedById !== userId) {
      res.status(403).json({ error: 'Sin permisos para ver esta tarea' })
      return
    }

    res.json(task)
  } catch (err) {
    console.error('[Senior] Error fetching task:', err)
    res.status(500).json({ error: 'Error al obtener tarea' })
  }
})

// ═══════════════════════════════════════════════════════════════
// Superadmin endpoints
// ═══════════════════════════════════════════════════════════════

// ─── GET /admin/team — List all senior members ───
router.get('/admin/team', superadminAuth, async (_req, res) => {
  try {
    const team = await prisma.seniorMember.findMany({
      include: {
        tasks: {
          where: { status: { in: ['in_progress', 'review'] } },
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    res.json(team)
  } catch (err) {
    console.error('[Senior] Error listing team:', err)
    res.status(500).json({ error: 'Error al listar equipo' })
  }
})

// ─── POST /admin/team — Add senior member ───
router.post('/admin/team', superadminAuth, async (req, res) => {
  try {
    const { name, email, role, capacity } = req.body as {
      name: string
      email: string
      role: string
      capacity?: number
    }

    if (!name || !email || !role) {
      res.status(400).json({ error: 'Nombre, email y rol son requeridos' })
      return
    }

    const validRoles = ['designer', 'developer', 'strategist', 'seo', 'ads']
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Rol inválido. Opciones: ${validRoles.join(', ')}` })
      return
    }

    const member = await prisma.seniorMember.create({
      data: {
        name,
        email,
        role,
        capacity: capacity ?? 3,
      },
    })

    res.json(member)
  } catch (err) {
    console.error('[Senior] Error adding team member:', err)
    res.status(500).json({ error: 'Error al agregar miembro' })
  }
})

// ─── PUT /admin/team/:id — Update senior member ───
router.put('/admin/team/:id', superadminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const { name, email, role, status, capacity } = req.body as {
      name?: string
      email?: string
      role?: string
      status?: string
      capacity?: number
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = role
    if (status !== undefined) {
      const validStatuses = ['available', 'busy', 'offline']
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Status inválido. Opciones: ${validStatuses.join(', ')}` })
        return
      }
      data.status = status
    }
    if (capacity !== undefined) data.capacity = capacity

    const member = await prisma.seniorMember.update({
      where: { id },
      data,
      include: {
        tasks: {
          where: { status: { in: ['in_progress', 'review'] } },
          select: { id: true, title: true, status: true },
        },
      },
    })

    res.json(member)
  } catch (err) {
    console.error('[Senior] Error updating team member:', err)
    res.status(500).json({ error: 'Error al actualizar miembro' })
  }
})

// ─── GET /admin/tasks — List ALL tasks across all agencies ───
router.get('/admin/tasks', superadminAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status) {
      where.status = status
    }

    const tasks = await prisma.seniorTask.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, email: true, organizationId: true } },
        senior: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(tasks)
  } catch (err) {
    console.error('[Senior] Error listing all tasks:', err)
    res.status(500).json({ error: 'Error al listar tareas' })
  }
})

// ─── PUT /admin/tasks/:id — Update task (assign, status, delivery) ───
router.put('/admin/tasks/:id', superadminAuth, async (req, res) => {
  try {
    const id = req.params.id as string
    const { seniorId, status, deliveryNotes, deliveryUrl } = req.body as {
      seniorId?: string
      status?: string
      deliveryNotes?: string
      deliveryUrl?: string
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}

    if (seniorId !== undefined) {
      data.seniorId = seniorId || null

      // Update senior member load
      if (seniorId) {
        const senior = await prisma.seniorMember.findUnique({ where: { id: seniorId } })
        if (!senior) {
          res.status(404).json({ error: 'Senior no encontrado' })
          return
        }
        if (senior.currentLoad >= senior.capacity) {
          res.status(400).json({ error: 'Este senior ha alcanzado su capacidad máxima' })
          return
        }
        await prisma.seniorMember.update({
          where: { id: seniorId },
          data: { currentLoad: { increment: 1 } },
        })
      }
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'review', 'delivered', 'cancelled']
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Status inválido. Opciones: ${validStatuses.join(', ')}` })
        return
      }
      data.status = status

      if (status === 'in_progress') {
        data.startedAt = new Date()
      }
      if (status === 'delivered') {
        data.deliveredAt = new Date()

        // Decrement senior load
        const currentTask = await prisma.seniorTask.findUnique({ where: { id } })
        if (currentTask?.seniorId) {
          await prisma.seniorMember.update({
            where: { id: currentTask.seniorId },
            data: { currentLoad: { decrement: 1 } },
          })
        }
      }
      if (status === 'cancelled') {
        // Decrement senior load if assigned
        const currentTask = await prisma.seniorTask.findUnique({ where: { id } })
        if (currentTask?.seniorId && ['in_progress', 'review'].includes(currentTask.status)) {
          await prisma.seniorMember.update({
            where: { id: currentTask.seniorId },
            data: { currentLoad: { decrement: 1 } },
          })
        }
      }
    }

    if (deliveryNotes !== undefined) data.deliveryNotes = deliveryNotes
    if (deliveryUrl !== undefined) data.deliveryUrl = deliveryUrl

    const task = await prisma.seniorTask.update({
      where: { id },
      data,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        senior: { select: { id: true, name: true, role: true } },
      },
    })

    res.json(task)
  } catch (err) {
    console.error('[Senior] Error updating task:', err)
    res.status(500).json({ error: 'Error al actualizar tarea' })
  }
})

// ─── GET /admin/subscriptions — List all subscriptions ───
router.get('/admin/subscriptions', superadminAuth, async (_req, res) => {
  try {
    const subscriptions = await prisma.seniorSubscription.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, organizationId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with active task count per user
    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const activeTasks = await prisma.seniorTask.count({
          where: {
            requestedById: sub.userId,
            status: { in: ['pending', 'in_progress', 'review'] },
          },
        })
        return { ...sub, activeTasks }
      })
    )

    res.json(enriched)
  } catch (err) {
    console.error('[Senior] Error listing subscriptions:', err)
    res.status(500).json({ error: 'Error al listar suscripciones' })
  }
})

// ─── POST /admin/subscriptions — Create subscription for a user/org ───
router.post('/admin/subscriptions', superadminAuth, async (req, res) => {
  try {
    const { userId, tier, organizationId } = req.body as {
      userId: string
      tier: string
      organizationId?: string
    }

    if (!userId || !tier) {
      res.status(400).json({ error: 'userId y tier son requeridos' })
      return
    }

    const tierConfig = seniorTiers.find(t => t.id === tier)
    if (!tierConfig) {
      res.status(400).json({ error: `Tier inválido. Opciones: ${seniorTiers.map(t => t.id).join(', ')}` })
      return
    }

    // Cancel existing active subscription if any
    await prisma.seniorSubscription.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'cancelled' },
    })

    const subscription = await prisma.seniorSubscription.create({
      data: {
        userId,
        organizationId: organizationId ?? null,
        tier: tierConfig.id,
        price: tierConfig.price,
        maxConcurrent: tierConfig.maxConcurrent,
        slaHours: tierConfig.slaHours,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    res.json(subscription)
  } catch (err) {
    console.error('[Senior] Error creating subscription:', err)
    res.status(500).json({ error: 'Error al crear suscripción' })
  }
})

// ─── GET /admin/stats — Dashboard stats ───
router.get('/admin/stats', superadminAuth, async (_req, res) => {
  try {
    // Active tasks count
    const activeTasks = await prisma.seniorTask.count({
      where: { status: { in: ['pending', 'in_progress', 'review'] } },
    })

    // Total delivered tasks
    const deliveredTasks = await prisma.seniorTask.findMany({
      where: { status: 'delivered', startedAt: { not: null }, deliveredAt: { not: null } },
      select: { startedAt: true, deliveredAt: true, slaDeadline: true },
    })

    // Average delivery time (in hours)
    let avgDeliveryHours = 0
    if (deliveredTasks.length > 0) {
      const totalHours = deliveredTasks.reduce((acc, t) => {
        const start = t.startedAt!.getTime()
        const end = t.deliveredAt!.getTime()
        return acc + (end - start) / (1000 * 60 * 60)
      }, 0)
      avgDeliveryHours = Math.round((totalHours / deliveredTasks.length) * 10) / 10
    }

    // SLA compliance percentage
    let slaCompliance = 100
    if (deliveredTasks.length > 0) {
      const onTime = deliveredTasks.filter(t => {
        if (!t.slaDeadline) return true
        return t.deliveredAt!.getTime() <= t.slaDeadline.getTime()
      }).length
      slaCompliance = Math.round((onTime / deliveredTasks.length) * 100)
    }

    // Monthly revenue from active subscriptions
    const activeSubscriptions = await prisma.seniorSubscription.findMany({
      where: { status: 'active' },
      select: { price: true },
    })
    const monthlyRevenue = activeSubscriptions.reduce((acc, s) => acc + s.price, 0)

    // Tasks by category
    const tasksByCategory = await prisma.seniorTask.groupBy({
      by: ['category'],
      _count: { id: true },
    })

    // Tasks by status
    const tasksByStatus = await prisma.seniorTask.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    res.json({
      activeTasks,
      totalDelivered: deliveredTasks.length,
      avgDeliveryHours,
      slaCompliance,
      monthlyRevenue,
      tasksByCategory: tasksByCategory.map(t => ({ category: t.category, count: t._count.id })),
      tasksByStatus: tasksByStatus.map(t => ({ status: t.status, count: t._count.id })),
    })
  } catch (err) {
    console.error('[Senior] Error fetching stats:', err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

export default router
