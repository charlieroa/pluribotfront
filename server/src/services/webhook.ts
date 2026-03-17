/**
 * Webhook delivery service
 * Sends POST notifications to agency webhook URLs when generation completes.
 * HMAC-SHA256 signed for security.
 */
import crypto from 'crypto'
import { prisma } from '../db/client.js'

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 5000, 15000] // 1s, 5s, 15s
const TIMEOUT_MS = 10000

interface WebhookPayload {
  event: 'generation.completed' | 'generation.failed'
  id: string
  status: string
  results: Array<{
    id: string
    title: string
    type: string
    html?: string
    text?: string
    agent: string | null
    published_url: string | null
  }>
  credits_used: number
  timestamp: string
}

function signPayload(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

async function deliverWebhook(url: string, payload: WebhookPayload, secret: string): Promise<boolean> {
  const body = JSON.stringify(payload)
  const signature = signPayload(body, secret)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Plury-Signature': signature,
          'X-Plury-Event': payload.event,
          'User-Agent': 'Plury-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (response.ok || (response.status >= 200 && response.status < 300)) {
        console.log(`[Webhook] Delivered to ${url} (attempt ${attempt + 1})`)
        return true
      }

      console.warn(`[Webhook] ${url} returned ${response.status} (attempt ${attempt + 1})`)
    } catch (err: any) {
      console.warn(`[Webhook] Failed attempt ${attempt + 1} to ${url}: ${err.message}`)
    }

    // Wait before retry (skip wait on last attempt)
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
    }
  }

  console.error(`[Webhook] All ${MAX_RETRIES} attempts failed for ${url}`)
  return false
}

/**
 * Send webhook if the conversation has a webhook URL configured.
 * Called after generation completes (coordination_end).
 */
export async function sendWebhookIfConfigured(conversationId: string): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        webhookUrl: true,
        webhookSecret: true,
        userId: true,
        deliverables: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            botType: true,
            publishSlug: true,
          },
        },
      },
    })

    if (!conversation?.webhookUrl) return

    // Calculate credits used for this conversation
    const creditsUsed = await prisma.creditLedger.aggregate({
      where: {
        userId: conversation.userId,
        type: { in: ['consumption', 'tool_consumption'] },
      },
      _sum: { amount: true },
    })

    const payload: WebhookPayload = {
      event: 'generation.completed',
      id: conversation.id,
      status: 'completed',
      results: conversation.deliverables.map(d => ({
        id: d.id,
        title: d.title,
        type: d.type,
        html: d.type === 'code' || d.type === 'design' ? d.content : undefined,
        text: d.type !== 'code' && d.type !== 'design' ? d.content : undefined,
        agent: d.botType,
        published_url: d.publishSlug ? `https://plury.co/p/${d.publishSlug}` : null,
      })),
      credits_used: Math.abs(creditsUsed._sum.amount ?? 0),
      timestamp: new Date().toISOString(),
    }

    const secret = conversation.webhookSecret || conversation.id
    await deliverWebhook(conversation.webhookUrl, payload, secret)
  } catch (err) {
    console.error(`[Webhook] Error sending webhook for ${conversationId}:`, err)
  }
}
