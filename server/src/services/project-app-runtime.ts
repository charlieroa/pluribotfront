import type { ProjectAppEventRecord } from './project-app-events.js'
import type { ProjectAppType } from './project-apps.js'

export interface ProjectAppRuntimeEventInput {
  channelKey: string
  eventKey: string
  direction: 'emit' | 'listen' | 'bi'
  payload: Record<string, unknown>
  source: 'runtime'
}

export interface ProjectAppRuntimeScenario {
  key: string
  label: string
  description: string
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function getLatestValue(events: ProjectAppEventRecord[], key: string): string | null {
  for (const event of events) {
    const payload = parsePayload(event.payloadJson)
    const value = payload[key]
    if (typeof value === 'string' && value) return value
  }
  return null
}

function getLatestNumber(events: ProjectAppEventRecord[], key: string): number | null {
  for (const event of events) {
    const payload = parsePayload(event.payloadJson)
    const value = payload[key]
    if (typeof value === 'number') return value
  }
  return null
}

export function buildProjectAppRuntimeExecution(
  appType: ProjectAppType,
  recentEvents: ProjectAppEventRecord[],
  input?: Record<string, unknown>,
): ProjectAppRuntimeEventInput[] {
  if (appType === 'generic') {
    const recordId = (typeof input?.recordId === 'string' && input.recordId) || getLatestValue(recentEvents, 'recordId') || randomId('rec')
    const scenario = typeof input?.scenario === 'string' ? input.scenario : 'ops_review'
    const trigger = typeof input?.trigger === 'string' ? input.trigger : `runtime_${scenario}`

    return [
      {
        channelKey: 'records',
        eventKey: 'record.created',
        direction: 'emit',
        source: 'runtime',
        payload: { recordId, entity: 'task', status: 'open', trigger, scenario },
      },
      {
        channelKey: 'workflow',
        eventKey: 'record.assigned',
        direction: 'bi',
        source: 'runtime',
        payload: { recordId, ownerName: 'Operador Runtime', status: 'assigned' },
      },
      {
        channelKey: 'workflow',
        eventKey: 'record.completed',
        direction: 'bi',
        source: 'runtime',
        payload: { recordId, status: 'completed', resolution: `Scenario ${scenario} completed` },
      },
    ]
  }

  if (appType === 'saas') {
    const workspaceId = (typeof input?.workspaceId === 'string' && input.workspaceId) || getLatestValue(recentEvents, 'workspaceId') || randomId('ws')
    const scenario = typeof input?.scenario === 'string' ? input.scenario : 'workspace_onboarding'
    const trigger = typeof input?.trigger === 'string' ? input.trigger : `runtime_${scenario}`
    const scenarioConfig: Record<string, { planId: string; output: string; status: string }> = {
      workspace_onboarding: { planId: 'pro', output: 'Workspace provisioned and first admin invited', status: 'active' },
      billing_recovery: { planId: 'starter', output: 'Billing recovered and subscription reactivated', status: 'active' },
      support_resolution: { planId: 'enterprise', output: 'Support escalation resolved within SLA', status: 'active' },
    }
    const selected = scenarioConfig[scenario] ?? scenarioConfig.workspace_onboarding

    return [
      {
        channelKey: 'workspace',
        eventKey: 'workspace.created',
        direction: 'emit',
        source: 'runtime',
        payload: { workspaceId, companyName: 'Workspace Runtime', status: selected.status, trigger },
      },
      {
        channelKey: 'users',
        eventKey: 'user.invited',
        direction: 'emit',
        source: 'runtime',
        payload: { workspaceId, userId: randomId('usr'), email: 'founder@runtime.co', role: 'owner' },
      },
      {
        channelKey: 'billing',
        eventKey: 'subscription.updated',
        direction: 'bi',
        source: 'runtime',
        payload: { workspaceId, planId: selected.planId, status: 'active', mrr: selected.planId === 'enterprise' ? 299 : selected.planId === 'pro' ? 49 : 19 },
      },
      {
        channelKey: 'support',
        eventKey: 'ticket.resolved',
        direction: 'emit',
        source: 'runtime',
        payload: { workspaceId, ticketId: randomId('tic'), status: 'resolved', output: selected.output },
      },
    ]
  }

  if (appType === 'ecommerce') {
    const cartId = (typeof input?.cartId === 'string' && input.cartId) || getLatestValue(recentEvents, 'cartId') || randomId('cart')
    const orderId = (typeof input?.orderId === 'string' && input.orderId) || getLatestValue(recentEvents, 'orderId') || randomId('ord')
    const scenario = typeof input?.scenario === 'string' ? input.scenario : 'order_checkout'

    return [
      {
        channelKey: 'catalog',
        eventKey: 'product.created',
        direction: 'emit',
        source: 'runtime',
        payload: { productId: randomId('prd'), title: `SKU ${scenario}`, price: 129, stock: 12 },
      },
      {
        channelKey: 'cart',
        eventKey: 'cart.updated',
        direction: 'bi',
        source: 'runtime',
        payload: { cartId, items: 2, subtotal: 258, scenario },
      },
      {
        channelKey: 'orders',
        eventKey: 'checkout.completed',
        direction: 'emit',
        source: 'runtime',
        payload: { cartId, orderId, paymentStatus: 'paid', total: 258, customerEmail: 'buyer@runtime.co' },
      },
      {
        channelKey: 'orders',
        eventKey: 'order.fulfilled',
        direction: 'bi',
        source: 'runtime',
        payload: { orderId, fulfillmentStatus: 'fulfilled', trackingCode: randomId('trk') },
      },
    ]
  }

  if (appType !== 'chatflow') return []

  const flowId = (typeof input?.flowId === 'string' && input.flowId) || getLatestValue(recentEvents, 'flowId') || randomId('flow')
  const executionId = randomId('exec')
  const version = getLatestNumber(recentEvents, 'version') ?? 1
  const scenario = typeof input?.scenario === 'string' ? input.scenario : 'lead_capture'
  const trigger = typeof input?.trigger === 'string' ? input.trigger : `runtime_${scenario}`
  const contact = typeof input?.contact === 'string' ? input.contact : 'demo@plury.co'
  const scenarioConfig: Record<string, { route: string; output: string; finalStatus: string; label: string; description: string }> = {
    lead_capture: {
      route: 'lead qualification path',
      output: 'Lead captured and tagged',
      finalStatus: 'success',
      label: 'Lead Capture',
      description: 'Captura un lead y lo clasifica para ventas.',
    },
    support_triage: {
      route: 'support triage path',
      output: 'Ticket classified and queued',
      finalStatus: 'success',
      label: 'Support Triage',
      description: 'Clasifica una solicitud de soporte y la encola.',
    },
    onboarding: {
      route: 'onboarding path',
      output: 'User onboarding sequence started',
      finalStatus: 'success',
      label: 'Onboarding',
      description: 'Inicia un flujo de onboarding para un usuario nuevo.',
    },
  }
  const selectedScenario = scenarioConfig[scenario] ?? scenarioConfig.lead_capture

  return [
    {
      channelKey: 'executions',
      eventKey: 'execution.started',
      direction: 'emit',
      source: 'runtime',
      payload: { executionId, flowId, trigger, scenario, inputSummary: `contact=${contact}` },
    },
    {
      channelKey: 'executions',
      eventKey: 'execution.log',
      direction: 'emit',
      source: 'runtime',
      payload: { executionId, nodeId: 'trigger_webhook', level: 'info', message: 'Webhook trigger accepted' },
    },
    {
      channelKey: 'executions',
      eventKey: 'execution.log',
      direction: 'emit',
      source: 'runtime',
      payload: { executionId, nodeId: 'node_router', level: 'info', message: `Route matched ${selectedScenario.route}` },
    },
    {
      channelKey: 'executions',
      eventKey: 'execution.completed',
      direction: 'emit',
      source: 'runtime',
      payload: { executionId, flowId, version, scenario, status: selectedScenario.finalStatus, output: selectedScenario.output },
    },
  ]
}

export function listProjectAppRuntimeScenarios(appType: ProjectAppType): ProjectAppRuntimeScenario[] {
  if (appType === 'generic') {
    return [
      { key: 'ops_review', label: 'Ops review', description: 'Crea, asigna y cierra un caso operativo.' },
      { key: 'backoffice_sync', label: 'Sync', description: 'Simula una corrida de backoffice con cierre de caso.' },
      { key: 'customer_followup', label: 'Follow-up', description: 'Abre un caso y lo resuelve desde operaciones.' },
    ]
  }

  if (appType === 'saas') {
    return [
      { key: 'workspace_onboarding', label: 'Onboarding', description: 'Provisiona un workspace nuevo con billing activo.' },
      { key: 'billing_recovery', label: 'Billing', description: 'Simula recuperacion de suscripcion y pago.' },
      { key: 'support_resolution', label: 'Support', description: 'Cierra un ticket de soporte con SLA controlado.' },
    ]
  }

  if (appType === 'ecommerce') {
    return [
      { key: 'order_checkout', label: 'Checkout', description: 'Recorre carrito a orden pagada.' },
      { key: 'cart_recovery', label: 'Cart', description: 'Simula recuperacion de carrito con compra final.' },
      { key: 'merchant_fulfillment', label: 'Fulfillment', description: 'Crea orden y la lleva a fulfilment.' },
    ]
  }

  if (appType !== 'chatflow') return []

  return [
    { key: 'lead_capture', label: 'Lead', description: 'Captura y califica un lead entrante.' },
    { key: 'support_triage', label: 'Soporte', description: 'Clasifica y enruta una solicitud de soporte.' },
    { key: 'onboarding', label: 'Onboarding', description: 'Dispara un onboarding inicial de usuario.' },
  ]
}
