import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db/client.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()
const orgAdminAuth = requireRole('superadmin', 'org_admin')

// Get current user's organization
router.get('/', orgAdminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { organization: true },
    })

    if (!user?.organizationId || !user.organization) {
      res.json({ organization: null })
      return
    }

    res.json({ organization: user.organization })
  } catch (err) {
    console.error('[Org] Error fetching organization:', err)
    res.status(500).json({ error: 'Error al obtener organización' })
  }
})

// Update organization
router.patch('/', orgAdminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    if (!user?.organizationId) {
      // Create org if doesn't exist
      const { name, logoUrl } = req.body as { name?: string; logoUrl?: string }
      const org = await prisma.organization.create({
        data: { name: name || 'Mi Organización', logoUrl },
      })
      await prisma.user.update({
        where: { id: user!.id },
        data: { organizationId: org.id },
      })
      res.json({ organization: org })
      return
    }

    const { name, logoUrl } = req.body as { name?: string; logoUrl?: string }
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
    })
    res.json({ organization: org })
  } catch (err) {
    console.error('[Org] Error updating organization:', err)
    res.status(500).json({ error: 'Error al actualizar organización' })
  }
})

// List organization members
router.get('/members', orgAdminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    if (!user?.organizationId) {
      res.json({ members: [] })
      return
    }

    const members = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ members })
  } catch (err) {
    console.error('[Org] Error fetching members:', err)
    res.status(500).json({ error: 'Error al obtener miembros' })
  }
})

// Invite member (create user with agent role)
router.post('/members', orgAdminAuth, async (req, res) => {
  try {
    const { email, name, role } = req.body as { email: string; name: string; role?: string }
    if (!email || !name) {
      res.status(400).json({ error: 'Email y nombre son requeridos' })
      return
    }

    const inviter = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    let orgId = inviter?.organizationId

    // Create org if doesn't exist
    if (!orgId) {
      const org = await prisma.organization.create({
        data: { name: 'Mi Organización' },
      })
      await prisma.user.update({
        where: { id: inviter!.id },
        data: { organizationId: org.id },
      })
      orgId = org.id
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Add existing user to org
      await prisma.user.update({
        where: { email },
        data: {
          organizationId: orgId,
          role: role || 'agent',
        },
      })
      const updated = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
      res.json({ member: updated })
      return
    }

    // Create new user with temp password
    const tempPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const member = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: role || 'agent',
        organizationId: orgId,
        planId: 'starter',
        onboardingDone: true,
      },
    })

    res.json({
      member: { id: member.id, name: member.name, email: member.email, role: member.role, createdAt: member.createdAt },
      tempPassword,
    })
  } catch (err) {
    console.error('[Org] Error inviting member:', err)
    res.status(500).json({ error: 'Error al invitar miembro' })
  }
})

// Remove member
router.delete('/members/:id', orgAdminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    const memberId = req.params.id as string
    const member = await prisma.user.findUnique({ where: { id: memberId } })

    if (!member || member.organizationId !== user?.organizationId) {
      res.status(404).json({ error: 'Miembro no encontrado' })
      return
    }

    // Don't allow removing yourself
    if (member.id === user.id) {
      res.status(400).json({ error: 'No puedes removerte a ti mismo' })
      return
    }

    await prisma.user.update({
      where: { id: member.id },
      data: { organizationId: null, role: 'user' },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Org] Error removing member:', err)
    res.status(500).json({ error: 'Error al remover miembro' })
  }
})

// Assign member to conversation
router.post('/members/:id/assign', orgAdminAuth, async (req, res) => {
  try {
    const { conversationId } = req.body as { conversationId: string }
    if (!conversationId) {
      res.status(400).json({ error: 'conversationId requerido' })
      return
    }

    const agentMemberId = req.params.id as string
    const conversation: any = await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedAgentId: agentMemberId },
      include: { assignedAgent: { select: { id: true, name: true } } },
    })

    res.json({ id: conversation.id, assignedAgent: conversation.assignedAgent })
  } catch (err) {
    console.error('[Org] Error assigning member:', err)
    res.status(500).json({ error: 'Error al asignar miembro' })
  }
})

export default router
