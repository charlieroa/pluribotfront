import crypto from 'crypto'
import { prisma } from '../db/client.js'
import { adminGrantCredits, resetCreditsForPlan } from './credit-tracker.js'
import { getCreditPackage, getPlan } from '../config/plans.js'

type StripeSession = {
  id: string
  url?: string
  customer?: string
  subscription?: string
  payment_intent?: string
  metadata?: Record<string, string>
  payment_status?: string
  status?: string
}

type StripeEvent = {
  id: string
  type: string
  data: { object: StripeSession & Record<string, unknown> }
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurado')
  return key
}

function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET no configurado')
  return secret
}

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.CORS_ORIGINS?.split(',')[0]?.trim() || 'http://localhost:5173'
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

function appendFormValue(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormValue(params, `${key}[${index}]`, item))
    return
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      appendFormValue(params, `${key}[${childKey}]`, childValue)
    })
    return
  }
  params.append(key, String(value))
}

async function stripePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const params = new URLSearchParams()
  Object.entries(body).forEach(([key, value]) => appendFormValue(params, key, value))

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const json = await response.json() as T & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(json.error?.message || `Stripe error ${response.status}`)
  }
  return json
}

async function ensureStripeCustomer(userId: string): Promise<{ customerId: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuario no encontrado')

  if (user.stripeCustomerId) {
    return { customerId: user.stripeCustomerId }
  }

  const customer = await stripePost<{ id: string }>('customers', {
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  })

  return { customerId: customer.id }
}

export async function createCreditCheckout(userId: string, packageId: string): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const pkg = getCreditPackage(packageId)
  if (!pkg) throw new Error('Paquete no encontrado')

  const { customerId } = await ensureStripeCustomer(userId)
  const baseUrl = getAppBaseUrl()

  const session = await stripePost<StripeSession>('checkout/sessions', {
    mode: 'payment',
    customer: customerId,
    success_url: `${baseUrl}/#settings?billing=success`,
    cancel_url: `${baseUrl}/#settings?billing=cancel`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: pkg.price * 100,
        product_data: { name: pkg.name, description: `${pkg.credits} creditos Plury` },
      },
    }],
    metadata: {
      purpose: 'credit_purchase',
      packageId: pkg.id,
      userId,
    },
  })

  const checkout = await prisma.billingCheckout.create({
    data: {
      userId,
      purpose: 'credit_purchase',
      status: 'open',
      packageId: pkg.id,
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      amount: pkg.price * 100,
      currency: 'usd',
      metadataJson: JSON.stringify({ credits: pkg.credits }),
    },
  })

  return { checkoutId: checkout.id, checkoutUrl: session.url || '' }
}

export async function createPlanCheckout(userId: string, planId: string): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const plan = getPlan(planId)
  if (!plan || plan.id !== planId || plan.price <= 0) throw new Error('Plan invalido para checkout')

  const { customerId } = await ensureStripeCustomer(userId)
  const baseUrl = getAppBaseUrl()

  const session = await stripePost<StripeSession>('checkout/sessions', {
    mode: 'subscription',
    customer: customerId,
    success_url: `${baseUrl}/#settings?plan=success`,
    cancel_url: `${baseUrl}/#settings?plan=cancel`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: plan.price * 100,
        recurring: { interval: 'month' },
        product_data: { name: `Plan ${plan.name}`, description: `${plan.monthlyCredits} creditos/mes` },
      },
    }],
    metadata: {
      purpose: 'plan_subscription',
      targetPlanId: planId,
      userId,
    },
    subscription_data: {
      metadata: {
        purpose: 'plan_subscription',
        targetPlanId: planId,
        userId,
      },
    },
  })

  const checkout = await prisma.billingCheckout.create({
    data: {
      userId,
      purpose: 'plan_subscription',
      status: 'open',
      targetPlanId: planId,
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      amount: plan.price * 100,
      currency: 'usd',
      metadataJson: JSON.stringify({ monthlyCredits: plan.monthlyCredits }),
    },
  })

  return { checkoutId: checkout.id, checkoutUrl: session.url || '' }
}

export function verifyStripeWebhookSignature(rawBody: Buffer, signatureHeader?: string | string[]): StripeEvent {
  const header = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader
  if (!header) throw new Error('Firma Stripe ausente')

  const parts = Object.fromEntries(header.split(',').map(part => {
    const idx = part.indexOf('=')
    return [part.slice(0, idx), part.slice(idx + 1)]
  }))
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) throw new Error('Firma Stripe invalida')

  const payload = `${timestamp}.${rawBody.toString('utf8')}`
  const expected = crypto.createHmac('sha256', getStripeWebhookSecret()).update(payload).digest('hex')
  const sigBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Firma Stripe no valida')
  }

  return JSON.parse(rawBody.toString('utf8')) as StripeEvent
}

async function markWebhookReceived(event: StripeEvent): Promise<boolean> {
  try {
    await prisma.billingWebhookEvent.create({
      data: {
        provider: 'stripe',
        providerEventId: event.id,
        type: event.type,
        payloadJson: JSON.stringify(event),
      },
    })
    return true
  } catch {
    return false
  }
}

async function markWebhookProcessed(eventId: string): Promise<void> {
  await prisma.billingWebhookEvent.update({
    where: { providerEventId: eventId },
    data: { processedAt: new Date() },
  }).catch(() => {})
}

async function handleCheckoutCompleted(session: StripeSession): Promise<void> {
  const purpose = session.metadata?.purpose
  const userId = session.metadata?.userId
  if (!purpose || !userId) return

  const checkout = await prisma.billingCheckout.findFirst({
    where: { stripeSessionId: session.id },
  })
  if (!checkout || checkout.processedAt) return

  if (purpose === 'credit_purchase') {
    const pkg = checkout.packageId ? getCreditPackage(checkout.packageId) : undefined
    if (!pkg) throw new Error('Paquete de credito no encontrado en webhook')

    const result = await adminGrantCredits(userId, pkg.credits, `Compra Stripe: ${pkg.name} (${session.id})`)
    await prisma.billingCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'completed',
        stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : null,
        processedAt: new Date(),
        metadataJson: JSON.stringify({ ...(checkout.metadataJson ? JSON.parse(checkout.metadataJson) : {}), creditedBalance: result.balance }),
      },
    })
    return
  }

  if (purpose === 'plan_subscription') {
    const targetPlanId = checkout.targetPlanId || session.metadata?.targetPlanId
    if (!targetPlanId) throw new Error('targetPlanId ausente en webhook')

    const currentUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!currentUser) throw new Error('Usuario no encontrado en webhook')

    let organizationId = currentUser.organizationId
    let role = currentUser.role

    if (targetPlanId === 'agency' && currentUser.role !== 'org_admin') {
      const org = await prisma.organization.create({
        data: { name: `Agencia de ${currentUser.name}` },
      })
      organizationId = org.id
      role = 'org_admin'
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        planId: targetPlanId,
        stripeCustomerId: session.customer ? String(session.customer) : undefined,
        stripeSubscriptionId: session.subscription ? String(session.subscription) : undefined,
        stripeSubscriptionStatus: 'active',
        organizationId,
        role,
      },
    })
    await resetCreditsForPlan(userId, targetPlanId)

    await prisma.billingCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'completed',
        stripeSubscriptionId: session.subscription ? String(session.subscription) : null,
        processedAt: new Date(),
      },
    })
  }
}

async function handleSubscriptionUpdated(sessionLike: Record<string, unknown>): Promise<void> {
  const subscriptionId = String(sessionLike.id || '')
  if (!subscriptionId) return

  const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscriptionId } })
  if (!user) return

  const status = String(sessionLike.status || '')
  const updateData: {
    stripeSubscriptionStatus: string | null
    planId?: string
    stripeSubscriptionId?: string | null
    role?: string
    organizationId?: string | null
  } = {
    stripeSubscriptionStatus: status || null,
  }

  if (['canceled', 'unpaid', 'incomplete_expired'].includes(status)) {
    updateData.planId = 'starter'
    updateData.stripeSubscriptionId = null
    updateData.role = 'user'
    updateData.organizationId = null
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  })

  if (updateData.planId === 'starter') {
    await resetCreditsForPlan(user.id, 'starter')
  }
}

export async function processStripeWebhook(rawBody: Buffer, signatureHeader?: string | string[]): Promise<{ received: boolean }> {
  const event = verifyStripeWebhookSignature(rawBody, signatureHeader)
  const firstTime = await markWebhookReceived(event)
  if (!firstTime) return { received: true }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionUpdated(event.data.object)
      break
    default:
      break
  }

  await markWebhookProcessed(event.id)
  return { received: true }
}
