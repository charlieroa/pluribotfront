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
      const { name, logoUrl, primaryColor } = req.body as { name?: string; logoUrl?: string; primaryColor?: string }
      const org = await prisma.organization.create({
        data: { name: name || 'Mi Organización', logoUrl, primaryColor },
      })
      await prisma.user.update({
        where: { id: user!.id },
        data: { organizationId: org.id },
      })
      res.json({ organization: org })
      return
    }

    const { name, logoUrl, primaryColor } = req.body as { name?: string; logoUrl?: string; primaryColor?: string }
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(primaryColor !== undefined ? { primaryColor } : {}),
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
      select: { id: true, name: true, email: true, role: true, specialty: true, specialtyColor: true, avatarUrl: true, createdAt: true },
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
    const { email, name, role, specialty, specialtyColor, specialtyKeywords, avatarUrl } = req.body as { email: string; name: string; role?: string; specialty?: string; specialtyColor?: string; specialtyKeywords?: string; avatarUrl?: string }
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
          ...(specialty !== undefined ? { specialty } : {}),
          ...(specialtyColor !== undefined ? { specialtyColor } : {}),
          ...(specialtyKeywords !== undefined ? { specialtyKeywords } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      })
      const updated = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true, specialty: true, specialtyColor: true, avatarUrl: true, createdAt: true },
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
        ...(specialty ? { specialty } : {}),
        ...(specialtyColor ? { specialtyColor } : {}),
        ...(specialtyKeywords ? { specialtyKeywords } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    })

    res.json({
      member: { id: member.id, name: member.name, email: member.email, role: member.role, specialty: member.specialty, specialtyColor: member.specialtyColor, avatarUrl: member.avatarUrl, createdAt: member.createdAt },
      tempPassword,
    })
  } catch (err) {
    console.error('[Org] Error inviting member:', err)
    res.status(500).json({ error: 'Error al invitar miembro' })
  }
})

// Update member specialty
router.patch('/members/:id', orgAdminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
    const memberId = req.params.id as string
    const member = await prisma.user.findUnique({ where: { id: memberId } })

    if (!member || member.organizationId !== user?.organizationId) {
      res.status(404).json({ error: 'Miembro no encontrado' })
      return
    }

    const { specialty, specialtyColor, specialtyKeywords, avatarUrl } = req.body as {
      specialty?: string
      specialtyColor?: string
      specialtyKeywords?: string
      avatarUrl?: string | null
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: {
        ...(specialty !== undefined ? { specialty: specialty || null } : {}),
        ...(specialtyColor !== undefined ? { specialtyColor: specialtyColor || null } : {}),
        ...(specialtyKeywords !== undefined ? { specialtyKeywords: specialtyKeywords || null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
      select: { id: true, name: true, email: true, role: true, specialty: true, specialtyColor: true, avatarUrl: true, createdAt: true },
    })

    res.json({ member: updated })
  } catch (err) {
    console.error('[Org] Error updating member:', err)
    res.status(500).json({ error: 'Error al actualizar miembro' })
  }
})

// List available specialists (public)
router.get('/specialists', async (req, res) => {
  try {
    const specialists = await prisma.user.findMany({
      where: {
        role: 'agent',
        specialty: { not: null },
      },
      select: { id: true, name: true, specialty: true, specialtyColor: true, avatarUrl: true },
    })

    res.json({ specialists })
  } catch (err) {
    console.error('[Org] Error fetching specialists:', err)
    res.status(500).json({ error: 'Error al obtener especialistas' })
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
