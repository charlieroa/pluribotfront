import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import JSZip from 'jszip'
import { prisma } from '../db/client.js'
import { optionalAuth } from '../middleware/auth.js'
import { broadcast } from '../services/sse.js'
import { getNextVersionInfo } from '../services/deliverable-versioning.js'
import { getExecutingPlan } from '../services/plan-cache.js'
import { parseProjectFilesFromText, validateProjectFiles } from '../services/project-files.js'
import type { ConversationListItem } from '../../../shared/types.js'

const router = Router()

// List conversations for the current user (+ assigned conversations for admin/agent roles)
router.get('/', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'

  // Check if user has admin/agent role
  const user = userId !== 'anonymous'
    ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    : null
  const isAdmin = user && ['superadmin', 'org_admin', 'agent'].includes(user.role)

  // Build where clause: own conversations + assigned/flagged conversations for admins
  let where: any = { userId }
  if (user?.role === 'superadmin') {
    // Superadmin sees own + all flagged + all assigned to them
    where = { OR: [{ userId }, { needsHumanReview: true }, { assignedAgentId: userId }] }
  } else if (isAdmin) {
    // Agent/org_admin sees own + assigned to them
    where = { OR: [{ userId }, { assignedAgentId: userId }] }
  }

  const conversations: any[] = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      userId: true,
      projectId: true,
      updatedAt: true,
      user: { select: { name: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { text: true },
      },
      _count: {
        select: { deliverables: true },
      },
    },
  })

  const items: ConversationListItem[] = conversations.map((c: any) => ({
    id: c.id,
    title: c.userId !== userId ? `[${c.user?.name}] ${c.title}` : c.title,
    updatedAt: c.updatedAt.toISOString(),
    lastMessage: c.messages[0]?.text,
    deliverableCount: c._count?.deliverables ?? 0,
    projectId: c.projectId ?? null,
  }))

  res.json(items)
})

// Get a conversation with messages
router.get('/:id', optionalAuth, async (req, res) => {
  const id = req.params.id as string
  const conversation: any = await prisma.conversation.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, name: true, role: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      deliverables: true,
      kanbanTasks: { include: { deliverable: true } },
    },
  })

  if (!conversation) {
    res.status(404).json({ error: 'Conversación no encontrada' })
    return
  }

  // Compute version counts per instanceId
  const instanceIds = [...new Set(
    conversation.deliverables
      .map((d: any) => d.instanceId)
      .filter(Boolean)
  )] as string[]

  const versionCountMap: Record<string, number> = {}
  for (const iid of instanceIds) {
    versionCountMap[iid] = conversation.deliverables.filter(
      (d: any) => d.instanceId === iid
    ).length
  }

  // Check if there's a plan currently executing for this conversation
  const executingPlan = await getExecutingPlan(id)

  res.json({
    id: conversation.id,
    title: conversation.title,
    needsHumanReview: conversation.needsHumanReview,
    assignedAgent: conversation.assignedAgent,
    isExecuting: !!executingPlan,
    executingSteps: executingPlan ? executingPlan.steps.map(s => ({
      agentId: s.agentId,
      instanceId: s.instanceId,
      task: s.userDescription || s.task,
      completed: executingPlan.completedInstances.includes(s.instanceId),
    })) : undefined,
    messages: conversation.messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      sender: m.sender,
      text: m.text,
      type: m.type,
      botType: m.botType,
      attachment: m.attachmentJson ? JSON.parse(m.attachmentJson) : undefined,
      approved: m.approved,
      createdAt: m.createdAt.toISOString(),
    })),
    deliverables: conversation.deliverables.map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      content: d.content,
      agent: d.agent,
      botType: d.botType,
      version: d.version,
      instanceId: d.instanceId,
      versionCount: d.instanceId ? (versionCountMap[d.instanceId] ?? 1) : 1,
    })),
    kanbanTasks: conversation.kanbanTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      agent: t.agent,
      status: t.status,
      botType: t.botType,
      deliverableId: t.deliverableId,
      deliverable: t.deliverable ? {
        id: t.deliverable.id,
        title: t.deliverable.title,
        type: t.deliverable.type,
        content: t.deliverable.content,
        agent: t.deliverable.agent,
        botType: t.deliverable.botType,
        version: t.deliverable.version,
        versionCount: t.deliverable.instanceId ? (versionCountMap[t.deliverable.instanceId] ?? 1) : 1,
      } : undefined,
    })),
  })
})

// Delete a conversation and all related data (messages, deliverables, tasks)
router.delete('/:id', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const convId = req.params.id as string

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: convId } })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    // Delete in order: project data → kanban tasks → deliverables → messages → conversation
    await prisma.projectData.deleteMany({ where: { conversationId: convId } })
    await prisma.projectUser.deleteMany({ where: { conversationId: convId } })
    await prisma.projectSchema.deleteMany({ where: { conversationId: convId } })
    await prisma.kanbanTask.deleteMany({ where: { conversationId: convId } })
    await prisma.deliverable.deleteMany({ where: { conversationId: convId } })
    await prisma.message.deleteMany({ where: { conversationId: convId } })
    await prisma.conversation.delete({ where: { id: convId } })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Conversations] Delete error:', err)
    res.status(500).json({ error: 'Error al eliminar conversacion' })
  }
})

// Finalize a kanban task (client marks as 'done')
router.patch('/:conversationId/tasks/:taskId', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const { conversationId, taskId } = req.params as { conversationId: string; taskId: string }
  const { status } = req.body as { status: string }

  if (status !== 'done') {
    res.status(400).json({ error: 'Solo se permite cambiar a status "done"' })
    return
  }

  try {
    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    const task = await prisma.kanbanTask.update({
      where: { id: taskId },
      data: { status: 'done' },
      include: { deliverable: true },
    })

    broadcast(conversationId, {
      type: 'kanban_update',
      task: {
        id: task.id,
        title: task.title,
        agent: task.agent,
        status: 'done' as const,
        botType: task.botType,
        deliverableId: task.deliverableId ?? undefined,
        instanceId: task.instanceId ?? undefined,
        createdAt: task.createdAt.toISOString(),
        deliverable: task.deliverable ? {
          id: task.deliverable.id,
          title: task.deliverable.title,
          type: task.deliverable.type as 'report' | 'code' | 'design' | 'copy' | 'video',
          content: task.deliverable.content,
          agent: task.deliverable.agent,
          botType: task.deliverable.botType,
        } : undefined,
      },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Conversations] Finalize task error:', err)
    res.status(500).json({ error: 'Error al finalizar tarea' })
  }
})

// ─── Supabase config endpoints ───

// Save Supabase config for a conversation
router.put('/:id/supabase', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const convId = req.params.id as string
  const { supabaseUrl, supabaseAnonKey } = req.body as { supabaseUrl?: string; supabaseAnonKey?: string }

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: convId } })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    // Validate URL format
    if (supabaseUrl && !/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl.trim())) {
      res.status(400).json({ error: 'URL invalida. Debe ser https://xxx.supabase.co' })
      return
    }

    // Validate anon key format
    if (supabaseAnonKey && !supabaseAnonKey.trim().startsWith('eyJ')) {
      res.status(400).json({ error: 'Anon key invalida. Debe empezar con eyJ' })
      return
    }

    await prisma.conversation.update({
      where: { id: convId },
      data: {
        supabaseUrl: supabaseUrl?.trim() || null,
        supabaseAnonKey: supabaseAnonKey?.trim() || null,
      },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Conversations] Supabase config error:', err)
    res.status(500).json({ error: 'Error al guardar config de Supabase' })
  }
})

// Get Supabase config for a conversation
router.get('/:id/supabase', optionalAuth, async (req, res) => {
  const userId = req.auth?.userId ?? 'anonymous'
  const convId = req.params.id as string

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      select: { userId: true, supabaseUrl: true, supabaseAnonKey: true },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    res.json({
      supabaseUrl: conversation.supabaseUrl,
      supabaseAnonKey: conversation.supabaseAnonKey,
      connected: !!(conversation.supabaseUrl && conversation.supabaseAnonKey),
    })
  } catch (err) {
    console.error('[Conversations] Supabase config read error:', err)
    res.status(500).json({ error: 'Error al leer config de Supabase' })
  }
})

// Test Supabase connection and introspect schema
router.post('/:id/supabase/test', optionalAuth, async (req, res) => {
  const convId = req.params.id as string
  const { url, anonKey } = req.body as { url?: string; anonKey?: string }

  // Use provided values or fall back to conversation's stored values
  let supabaseUrl = url?.trim()
  let supabaseAnonKey = anonKey?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: convId },
        select: { supabaseUrl: true, supabaseAnonKey: true },
      })
      if (conv) {
        supabaseUrl = supabaseUrl || conv.supabaseUrl || undefined
        supabaseAnonKey = supabaseAnonKey || conv.supabaseAnonKey || undefined
      }
    } catch { /* ignore */ }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(400).json({ error: 'Supabase URL and anon key required' })
    return
  }

  try {
    // Test connection by fetching table list via PostgREST
    const tablesResp = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    })

    if (!tablesResp.ok) {
      res.status(400).json({ error: 'Connection failed. Check URL and key.' })
      return
    }

    // Try to get schema info from information_schema via RPC
    // This may not work if the user hasn't set up the function, so we handle gracefully
    let tables: { name: string; columns: string[] }[] = []
    try {
      const schemaResp = await fetch(`${supabaseUrl}/rest/v1/rpc/get_table_info`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
      if (schemaResp.ok) {
        tables = await schemaResp.json() as any[]
      }
    } catch { /* ignore — function may not exist */ }

    // Save credentials to conversation
    await prisma.conversation.update({
      where: { id: convId },
      data: { supabaseUrl, supabaseAnonKey },
    })

    res.json({ connected: true, tables })
  } catch (err) {
    console.error('[Supabase Test] Error:', err)
    res.status(500).json({ error: 'Connection test failed' })
  }
})

// ─── Version history endpoints ───

// Get version history for a deliverable (metadata only, no content)
router.get('/:convId/deliverables/:deliverableId/versions', optionalAuth, async (req, res) => {
  const { convId, deliverableId } = req.params as { convId: string; deliverableId: string }

  try {
    const target = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { instanceId: true, conversationId: true },
    })

    if (!target || target.conversationId !== convId) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    if (!target.instanceId) {
      res.json([{ id: deliverableId, version: 1, title: '', agent: '', createdAt: '' }])
      return
    }

    const versions = await prisma.deliverable.findMany({
      where: { conversationId: convId, instanceId: target.instanceId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, title: true, agent: true, createdAt: true },
    })

    res.json(versions.map((v: any) => ({
      id: v.id,
      version: v.version,
      title: v.title,
      agent: v.agent,
      createdAt: v.createdAt.toISOString(),
    })))
  } catch (err) {
    console.error('[Conversations] Get versions error:', err)
    res.status(500).json({ error: 'Error al obtener versiones' })
  }
})

// Get a single deliverable with full content + version info
router.get('/:convId/deliverables/:deliverableId', optionalAuth, async (req, res) => {
  const { convId, deliverableId } = req.params as { convId: string; deliverableId: string }

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
    })

    if (!deliverable || deliverable.conversationId !== convId) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    let versionCount = 1
    if (deliverable.instanceId) {
      versionCount = await prisma.deliverable.count({
        where: { conversationId: convId, instanceId: deliverable.instanceId },
      })
    }

    res.json({
      id: deliverable.id,
      title: deliverable.title,
      type: deliverable.type,
      content: deliverable.content,
      agent: deliverable.agent,
      botType: deliverable.botType,
      version: deliverable.version,
      versionCount,
    })
  } catch (err) {
    console.error('[Conversations] Get deliverable error:', err)
    res.status(500).json({ error: 'Error al obtener deliverable' })
  }
})

// Save a multi-file project as a new deliverable version
router.post('/:convId/deliverables/:deliverableId/save-project', optionalAuth, async (req, res) => {
  const { convId, deliverableId } = req.params as { convId: string; deliverableId: string }
  const userId = req.auth?.userId ?? 'anonymous'
  const { files, title } = req.body as { files?: unknown; title?: string }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      select: { userId: true },
    })
    if (!conversation) {
      res.status(404).json({ error: 'Conversacion no encontrada' })
      return
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: 'Sin permiso' })
      return
    }

    const source = await prisma.deliverable.findUnique({ where: { id: deliverableId } })
    if (!source || source.conversationId !== convId) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }
    if (source.type !== 'code') {
      res.status(400).json({ error: 'Solo puedes guardar proyectos de codigo' })
      return
    }

    const validated = validateProjectFiles(files)
    const versionInfo = await getNextVersionInfo(convId, source.instanceId)
    const newDeliverable = await prisma.deliverable.create({
      data: {
        id: uuid(),
        conversationId: convId,
        title: title?.trim() || source.title,
        type: source.type,
        content: JSON.stringify(validated.files),
        agent: source.agent,
        botType: source.botType,
        instanceId: source.instanceId,
        version: versionInfo.version,
        parentId: versionInfo.parentId,
      },
    })

    const kanbanTask = await prisma.kanbanTask.findFirst({
      where: { conversationId: convId, instanceId: source.instanceId },
    })
    if (kanbanTask) {
      await prisma.kanbanTask.update({
        where: { id: kanbanTask.id },
        data: { deliverableId: newDeliverable.id, title: newDeliverable.title },
      })
    }

    broadcast(convId, {
      type: 'deliverable',
      deliverable: {
        id: newDeliverable.id,
        title: newDeliverable.title,
        type: newDeliverable.type as any,
        content: newDeliverable.content,
        agent: newDeliverable.agent,
        botType: newDeliverable.botType,
        version: newDeliverable.version,
        versionCount: versionInfo.version,
      },
    })

    res.json({
      id: newDeliverable.id,
      title: newDeliverable.title,
      type: newDeliverable.type,
      content: newDeliverable.content,
      agent: newDeliverable.agent,
      botType: newDeliverable.botType,
      version: newDeliverable.version,
      versionCount: versionInfo.version,
      warnings: validated.warnings,
    })
  } catch (err) {
    console.error('[Conversations] Save project error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error al guardar proyecto' })
  }
})

// Restore a previous version (creates a new version with the old content)
router.post('/:convId/deliverables/:deliverableId/restore', optionalAuth, async (req, res) => {
  const { convId, deliverableId } = req.params as { convId: string; deliverableId: string }

  try {
    const source = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
    })

    if (!source || source.conversationId !== convId) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    if (!source.instanceId) {
      res.status(400).json({ error: 'Este deliverable no soporta versionado' })
      return
    }

    const versionInfo = await getNextVersionInfo(convId, source.instanceId)
    const newId = uuid()
    const restored = await prisma.deliverable.create({
      data: {
        id: newId,
        conversationId: convId,
        title: source.title,
        type: source.type,
        content: source.content,
        agent: source.agent,
        botType: source.botType,
        instanceId: source.instanceId,
        version: versionInfo.version,
        parentId: versionInfo.parentId,
      },
    })

    // Update kanban task to point to restored version
    const kanbanTask = await prisma.kanbanTask.findFirst({
      where: { conversationId: convId, instanceId: source.instanceId },
    })
    if (kanbanTask) {
      await prisma.kanbanTask.update({
        where: { id: kanbanTask.id },
        data: { deliverableId: newId },
      })
    }

    // Broadcast so all tabs see the change
    broadcast(convId, {
      type: 'deliverable',
      deliverable: {
        id: restored.id,
        title: restored.title,
        type: restored.type as any,
        content: restored.content,
        agent: restored.agent,
        botType: restored.botType,
        version: restored.version,
        versionCount: versionInfo.version,
      },
    })

    res.json({
      id: restored.id,
      title: restored.title,
      type: restored.type,
      content: restored.content,
      agent: restored.agent,
      botType: restored.botType,
      version: restored.version,
      versionCount: versionInfo.version,
    })
  } catch (err) {
    console.error('[Conversations] Restore version error:', err)
    res.status(500).json({ error: 'Error al restaurar version' })
  }
})

// Export code project as ZIP
router.get('/:convId/deliverables/:deliverableId/export-zip', optionalAuth, async (req, res) => {
  const { convId, deliverableId } = req.params as { convId: string; deliverableId: string }

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
    })

    if (!deliverable || deliverable.conversationId !== convId) {
      res.status(404).json({ error: 'Deliverable no encontrado' })
      return
    }

    if (deliverable.type !== 'code') {
      res.status(400).json({ error: 'Solo proyectos de codigo se pueden exportar como ZIP' })
      return
    }

    let description = deliverable.title
    let parsedFiles: Array<{ path: string; content: string }>
    try {
      parsedFiles = parseProjectFilesFromText(deliverable.content).files
    } catch {
      res.status(400).json({ error: 'No se pudo parsear el proyecto' })
      return
    }

    const zip = new JSZip()

    // Add source files
    for (const file of parsedFiles) {
      zip.file(file.path, file.content)
    }

    // Add package.json
    zip.file('package.json', JSON.stringify({
      name: 'plury-project',
      private: true,
      version: '1.0.0',
      description,
      scripts: {
        dev: 'vite',
        build: 'tsc -b && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        'lucide-react': '^0.468.0',
        recharts: '^2.15.0',
      },
      devDependencies: {
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        tailwindcss: '^4.0.0',
        '@tailwindcss/vite': '^4.0.0',
        typescript: '~5.7.2',
        vite: '^6.0.5',
      },
    }, null, 2))

    // Add README
    zip.file('README.md', `# ${description}\n\nProyecto generado por Plury.\n\n## Setup\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`)

    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    const safeName = deliverable.title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      'Content-Length': buffer.length.toString(),
    })
    res.send(buffer)
  } catch (err) {
    console.error('[Conversations] Export ZIP error:', err)
    res.status(500).json({ error: 'Error al exportar proyecto' })
  }
})

export default router
