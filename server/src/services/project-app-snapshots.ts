import type { ProjectAppType } from './project-apps.js'
import type { ProjectAppEventRecord } from './project-app-events.js'

interface DeliveryOrderSnapshot {
  orderId: string
  status: string
  etaMinutes?: number
  driverName?: string
  total?: number
}

interface MobilityRideSnapshot {
  rideId: string
  status: string
  etaMinutes?: number
  estimatedTotal?: number
  driverId?: string
}

interface ChatflowFlowSnapshot {
  flowId: string
  version?: number
  nodeCount?: number
  publishedChannel?: string
}

interface ChatflowExecutionSnapshot {
  executionId: string
  flowId?: string
  trigger?: string
  logCount: number
  status?: string
  scenario?: string
  output?: string
  lastLevel?: string
  lastMessage?: string
}

export type ProjectAppSnapshot =
  | {
      kind: 'saas'
      metrics: {
        totalWorkspaces: number
        invitedUsers: number
        activeSubscriptions: number
        resolvedTickets: number
      }
      items: {
        workspaceId: string
        companyName?: string
        planId?: string
        mrr?: number
        status?: string
      }[]
    }
  | {
      kind: 'ecommerce'
      metrics: {
        totalProducts: number
        activeCarts: number
        paidOrders: number
        fulfilledOrders: number
      }
      items: {
        orderId: string
        paymentStatus?: string
        fulfillmentStatus?: string
        total?: number
        customerEmail?: string
      }[]
    }
  | {
      kind: 'delivery'
      metrics: {
        totalOrders: number
        assignedOrders: number
        trackingOrders: number
        deliveredOrders: number
      }
      items: DeliveryOrderSnapshot[]
    }
  | {
      kind: 'mobility'
      metrics: {
        totalRides: number
        activeRides: number
        pricedRides: number
        completedRides: number
      }
      items: MobilityRideSnapshot[]
    }
  | {
      kind: 'chatflow'
      metrics: {
        totalFlows: number
        publishedFlows: number
        activeExecutions: number
        executionLogs: number
      }
      flowItems: ChatflowFlowSnapshot[]
      executionItems: ChatflowExecutionSnapshot[]
    }
  | {
      kind: 'generic'
      metrics: {
        totalEvents: number
        totalRecords?: number
        assignedRecords?: number
        completedRecords?: number
      }
      items?: {
        recordId: string
        status?: string
        ownerName?: string
      }[]
    }

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function buildDeliverySnapshot(events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  const orders = new Map<string, DeliveryOrderSnapshot>()
  const orderedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const event of orderedEvents) {
    const payload = parsePayload(event.payloadJson)
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : null
    if (!orderId) continue

    const current = orders.get(orderId) ?? { orderId, status: 'created' }
    if (event.eventKey === 'order.created') {
      current.total = typeof payload.total === 'number' ? payload.total : current.total
      current.status = 'created'
    }
    if (event.eventKey === 'dispatch.assigned') {
      current.driverName = typeof payload.driverName === 'string' ? payload.driverName : current.driverName
      current.status = 'assigned'
    }
    if (event.eventKey === 'tracking.updated') {
      current.etaMinutes = typeof payload.etaMinutes === 'number' ? payload.etaMinutes : current.etaMinutes
      current.status = 'tracking'
    }
    if (event.eventKey === 'order.status.changed' && typeof payload.status === 'string') {
      current.status = payload.status
      current.etaMinutes = typeof payload.etaMinutes === 'number' ? payload.etaMinutes : current.etaMinutes
    }
    orders.set(orderId, current)
  }

  const items = [...orders.values()]
  return {
    kind: 'delivery',
    metrics: {
      totalOrders: items.length,
      assignedOrders: items.filter(item => item.driverName).length,
      trackingOrders: items.filter(item => item.status === 'tracking').length,
      deliveredOrders: items.filter(item => item.status === 'delivered').length,
    },
    items: items.slice(0, 4),
  }
}

function buildMobilitySnapshot(events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  const rides = new Map<string, MobilityRideSnapshot>()
  const orderedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const event of orderedEvents) {
    const payload = parsePayload(event.payloadJson)
    const rideId = typeof payload.rideId === 'string' ? payload.rideId : null
    if (!rideId) continue

    const current = rides.get(rideId) ?? { rideId, status: 'requested' }
    if (event.eventKey === 'ride.requested') current.status = 'requested'
    if (event.eventKey === 'driver.assigned') {
      current.status = 'assigned'
      current.driverId = typeof payload.driverId === 'string' ? payload.driverId : current.driverId
    }
    if (event.eventKey === 'driver.location.updated') {
      current.status = 'en_route'
      current.etaMinutes = typeof payload.etaMinutes === 'number' ? payload.etaMinutes : current.etaMinutes
    }
    if (event.eventKey === 'pricing.updated') {
      current.estimatedTotal = typeof payload.estimatedTotal === 'number' ? payload.estimatedTotal : current.estimatedTotal
    }
    if (event.eventKey === 'ride.status.changed' && typeof payload.status === 'string') {
      current.status = payload.status
      current.etaMinutes = typeof payload.etaMinutes === 'number' ? payload.etaMinutes : current.etaMinutes
    }
    rides.set(rideId, current)
  }

  const items = [...rides.values()]
  return {
    kind: 'mobility',
    metrics: {
      totalRides: items.length,
      activeRides: items.filter(item => ['assigned', 'en_route', 'in_progress'].includes(item.status)).length,
      pricedRides: items.filter(item => typeof item.estimatedTotal === 'number').length,
      completedRides: items.filter(item => item.status === 'completed').length,
    },
    items: items.slice(0, 4),
  }
}

function buildChatflowSnapshot(events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  const flows = new Map<string, ChatflowFlowSnapshot>()
  const executions = new Map<string, ChatflowExecutionSnapshot>()
  const orderedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const event of orderedEvents) {
    const payload = parsePayload(event.payloadJson)

    if (event.eventKey === 'flow.saved') {
      const flowId = typeof payload.flowId === 'string' ? payload.flowId : null
      if (!flowId) continue
      const current = flows.get(flowId) ?? { flowId }
      current.version = typeof payload.version === 'number' ? payload.version : current.version
      current.nodeCount = typeof payload.nodeCount === 'number' ? payload.nodeCount : current.nodeCount
      flows.set(flowId, current)
    }

    if (event.eventKey === 'flow.published') {
      const flowId = typeof payload.flowId === 'string' ? payload.flowId : null
      if (!flowId) continue
      const current = flows.get(flowId) ?? { flowId }
      current.version = typeof payload.version === 'number' ? payload.version : current.version
      current.publishedChannel = typeof payload.channel === 'string' ? payload.channel : current.publishedChannel
      flows.set(flowId, current)
    }

    if (event.eventKey === 'execution.started') {
      const executionId = typeof payload.executionId === 'string' ? payload.executionId : null
      if (!executionId) continue
      const current = executions.get(executionId) ?? { executionId, logCount: 0 }
      current.flowId = typeof payload.flowId === 'string' ? payload.flowId : current.flowId
      current.trigger = typeof payload.trigger === 'string' ? payload.trigger : current.trigger
      executions.set(executionId, current)
    }

    if (event.eventKey === 'execution.log') {
      const executionId = typeof payload.executionId === 'string' ? payload.executionId : null
      if (!executionId) continue
      const current = executions.get(executionId) ?? { executionId, logCount: 0 }
      current.logCount += 1
      current.lastLevel = typeof payload.level === 'string' ? payload.level : current.lastLevel
      current.lastMessage = typeof payload.message === 'string' ? payload.message : current.lastMessage
      executions.set(executionId, current)
    }

    if (event.eventKey === 'execution.completed') {
      const executionId = typeof payload.executionId === 'string' ? payload.executionId : null
      if (!executionId) continue
      const current = executions.get(executionId) ?? { executionId, logCount: 0 }
      current.flowId = typeof payload.flowId === 'string' ? payload.flowId : current.flowId
      current.status = typeof payload.status === 'string' ? payload.status : current.status
      current.scenario = typeof payload.scenario === 'string' ? payload.scenario : current.scenario
      current.output = typeof payload.output === 'string' ? payload.output : current.output
      executions.set(executionId, current)
    }
  }

  const flowItems = [...flows.values()]
  const executionItems = [...executions.values()]

  return {
    kind: 'chatflow',
    metrics: {
      totalFlows: flowItems.length,
      publishedFlows: flowItems.filter(item => item.publishedChannel).length,
      activeExecutions: executionItems.length,
      executionLogs: executionItems.reduce((total, item) => total + item.logCount, 0),
    },
    flowItems: flowItems.slice(0, 4),
    executionItems: executionItems.slice(0, 4),
  }
}

function buildGenericSnapshot(events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  const records = new Map<string, { recordId: string; status?: string; ownerName?: string }>()
  const orderedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const event of orderedEvents) {
    const payload = parsePayload(event.payloadJson)
    const recordId = typeof payload.recordId === 'string' ? payload.recordId : null
    if (!recordId) continue

    const current = records.get(recordId) ?? { recordId }
    if (event.eventKey === 'record.created') current.status = typeof payload.status === 'string' ? payload.status : 'open'
    if (event.eventKey === 'record.assigned') {
      current.status = typeof payload.status === 'string' ? payload.status : 'assigned'
      current.ownerName = typeof payload.ownerName === 'string' ? payload.ownerName : current.ownerName
    }
    if (event.eventKey === 'record.completed') current.status = typeof payload.status === 'string' ? payload.status : 'completed'
    records.set(recordId, current)
  }

  const items = [...records.values()]
  return {
    kind: 'generic',
    metrics: {
      totalEvents: events.length,
      totalRecords: items.length,
      assignedRecords: items.filter(item => item.status === 'assigned').length,
      completedRecords: items.filter(item => item.status === 'completed').length,
    },
    items: items.slice(0, 4),
  }
}

function buildSaasSnapshot(events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  const workspaces = new Map<string, { workspaceId: string; companyName?: string; planId?: string; mrr?: number; status?: string }>()
  const invitedUsers = new Set<string>()
  let resolvedTickets = 0
  const orderedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const event of orderedEvents) {
    const payload = parsePayload(event.payloadJson)
    const workspaceId = typeof payload.workspaceId === 'string' ? payload.workspaceId : null

    if (event.eventKey === 'workspace.created' && workspaceId) {
      const current = workspaces.get(workspaceId) ?? { workspaceId }
      current.companyName = typeof payload.companyName === 'string' ? payload.companyName : current.companyName
      current.status = typeof payload.status === 'string' ? payload.status : current.status
      workspaces.set(workspaceId, current)
    }

    if (event.eventKey === 'user.invited' && typeof payload.userId === 'string') {
      invitedUsers.add(payload.userId)
    }

    if (event.eventKey === 'subscription.updated' && workspaceId) {
      const current = workspaces.get(workspaceId) ?? { workspaceId }
      current.planId = typeof payload.planId === 'string' ? payload.planId : current.planId
      current.status = typeof payload.status === 'string' ? payload.status : current.status
      current.mrr = typeof payload.mrr === 'number' ? payload.mrr : current.mrr
      workspaces.set(workspaceId, current)
    }

    if (event.eventKey === 'ticket.resolved') {
      resolvedTickets += 1
    }
  }

  const items = [...workspaces.values()]
  return {
    kind: 'saas',
    metrics: {
      totalWorkspaces: items.length,
      invitedUsers: invitedUsers.size,
      activeSubscriptions: items.filter(item => item.status === 'active').length,
      resolvedTickets,
    },
    items: items.slice(0, 4),
  }
}

function buildEcommerceSnapshot(events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  const products = new Set<string>()
  const carts = new Set<string>()
  const orders = new Map<string, { orderId: string; paymentStatus?: string; fulfillmentStatus?: string; total?: number; customerEmail?: string }>()
  const orderedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const event of orderedEvents) {
    const payload = parsePayload(event.payloadJson)
    if (event.eventKey === 'product.created' && typeof payload.productId === 'string') {
      products.add(payload.productId)
    }
    if (event.eventKey === 'cart.updated' && typeof payload.cartId === 'string') {
      carts.add(payload.cartId)
    }
    if (event.eventKey === 'checkout.completed' && typeof payload.orderId === 'string') {
      const current = orders.get(payload.orderId) ?? { orderId: payload.orderId }
      current.paymentStatus = typeof payload.paymentStatus === 'string' ? payload.paymentStatus : current.paymentStatus
      current.total = typeof payload.total === 'number' ? payload.total : current.total
      current.customerEmail = typeof payload.customerEmail === 'string' ? payload.customerEmail : current.customerEmail
      orders.set(payload.orderId, current)
    }
    if (event.eventKey === 'order.fulfilled' && typeof payload.orderId === 'string') {
      const current = orders.get(payload.orderId) ?? { orderId: payload.orderId }
      current.fulfillmentStatus = typeof payload.fulfillmentStatus === 'string' ? payload.fulfillmentStatus : current.fulfillmentStatus
      orders.set(payload.orderId, current)
    }
  }

  const items = [...orders.values()]
  return {
    kind: 'ecommerce',
    metrics: {
      totalProducts: products.size,
      activeCarts: carts.size,
      paidOrders: items.filter(item => item.paymentStatus === 'paid').length,
      fulfilledOrders: items.filter(item => item.fulfillmentStatus === 'fulfilled').length,
    },
    items: items.slice(0, 4),
  }
}

export function buildProjectAppSnapshot(appType: ProjectAppType, events: ProjectAppEventRecord[]): ProjectAppSnapshot {
  if (appType === 'saas') return buildSaasSnapshot(events)
  if (appType === 'ecommerce') return buildEcommerceSnapshot(events)
  if (appType === 'delivery') return buildDeliverySnapshot(events)
  if (appType === 'mobility') return buildMobilitySnapshot(events)
  if (appType === 'chatflow') return buildChatflowSnapshot(events)
  return buildGenericSnapshot(events)
}
