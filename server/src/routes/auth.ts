import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/client.js'
import type { AuthRegisterRequest, AuthLoginRequest, AuthResponse } from '../../../shared/types.js'
import { getPlan } from '../config/plans.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body as AuthRegisterRequest

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'El email ya está registrado' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const plan = getPlan('starter')
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      planId: 'starter',
      creditBalance: plan.monthlyCredits,
      billingCycleStart: new Date(),
    },
  })

  // Record initial credit grant
  await prisma.creditLedger.create({
    data: {
      userId: user.id,
      amount: plan.monthlyCredits,
      balance: plan.monthlyCredits,
      type: 'plan_grant',
      description: `Creditos iniciales plan ${plan.name}`,
    },
  })

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  const response: AuthResponse = {
    token,
    user: { id: user.id, email: user.email, name: user.name, planId: user.planId, onboardingDone: user.onboardingDone, profession: user.profession ?? undefined, role: user.role, organizationId: user.organizationId ?? undefined, creditBalance: user.creditBalance },
  }

  res.json(response)
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body as AuthLoginRequest

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  const response: AuthResponse = {
    token,
    user: { id: user.id, email: user.email, name: user.name, planId: user.planId, onboardingDone: user.onboardingDone, profession: user.profession ?? undefined, role: user.role, organizationId: user.organizationId ?? undefined, creditBalance: user.creditBalance },
  }

  res.json(response)
})

export default router
