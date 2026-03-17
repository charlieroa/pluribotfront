import type { ProjectAppType } from './project-apps.js'
import { buildRealtimeContract } from './realtime-events.js'

export interface SimulatedAppEvent {
  channelKey: string
  eventKey: string
  direction: 'emit' | 'listen' | 'bi'
  payload: Record<string, unknown>
  source: 'simulation'
}

function makeEvent(event: SimulatedAppEvent): SimulatedAppEvent {
  return event
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function randomLat(base: number): number {
  return Number((base + (Math.random() - 0.5) * 0.03).toFixed(6))
}

function randomLng(base: number): number {
  return Number((base + (Math.random() - 0.5) * 0.03).toFixed(6))
}

export function buildSimulatedEvents(appType: ProjectAppType, count = 3): SimulatedAppEvent[] {
  const contract = buildRealtimeContract(appType)
  const limit = Math.max(1, Math.min(count, 10))

  if (appType === 'generic') {
    const recordId = randomId('rec')
    return [
      makeEvent({
        channelKey: 'records',
        eventKey: 'record.created',
        direction: 'emit',
        source: 'simulation',
        payload: { recordId, entity: 'lead', status: 'open', priority: 'medium' },
      }),
      makeEvent({
        channelKey: 'workflow',
        eventKey: 'record.assigned',
        direction: 'bi',
        source: 'simulation',
        payload: { recordId, ownerName: 'Ana Ops', status: 'assigned' },
      }),
      makeEvent({
        channelKey: 'workflow',
        eventKey: 'record.completed',
        direction: 'bi',
        source: 'simulation',
        payload: { recordId, status: 'completed', resolution: 'Simulation completed' },
      }),
    ].slice(0, limit)
  }

  if (appType === 'saas') {
    const workspaceId = randomId('ws')
    return [
      makeEvent({
        channelKey: 'workspace',
        eventKey: 'workspace.created',
        direction: 'emit',
        source: 'simulation',
        payload: { workspaceId, companyName: 'Acme Demo', status: 'active', planId: 'pro' },
      }),
      makeEvent({
        channelKey: 'users',
        eventKey: 'user.invited',
        direction: 'emit',
        source: 'simulation',
        payload: { workspaceId, userId: randomId('usr'), email: 'owner@acme.co', role: 'owner' },
      }),
      makeEvent({
        channelKey: 'billing',
        eventKey: 'subscription.updated',
        direction: 'bi',
        source: 'simulation',
        payload: { workspaceId, planId: 'pro', status: 'active', mrr: 49 },
      }),
      makeEvent({
        channelKey: 'support',
        eventKey: 'ticket.resolved',
        direction: 'emit',
        source: 'simulation',
        payload: { workspaceId, ticketId: randomId('tic'), status: 'resolved', slaHours: 3 },
      }),
    ].slice(0, limit)
  }

  if (appType === 'ecommerce') {
    const productId = randomId('prd')
    const cartId = randomId('cart')
    const orderId = randomId('ord')
    return [
      makeEvent({
        channelKey: 'catalog',
        eventKey: 'product.created',
        direction: 'emit',
        source: 'simulation',
        payload: { productId, title: 'Producto Simulado', price: 129, stock: 9 },
      }),
      makeEvent({
        channelKey: 'cart',
        eventKey: 'cart.updated',
        direction: 'bi',
        source: 'simulation',
        payload: { cartId, productId, items: 2, subtotal: 258 },
      }),
      makeEvent({
        channelKey: 'orders',
        eventKey: 'checkout.completed',
        direction: 'emit',
        source: 'simulation',
        payload: { cartId, orderId, paymentStatus: 'paid', total: 258, customerEmail: 'buyer@demo.co' },
      }),
      makeEvent({
        channelKey: 'orders',
        eventKey: 'order.fulfilled',
        direction: 'bi',
        source: 'simulation',
        payload: { orderId, fulfillmentStatus: 'fulfilled', trackingCode: randomId('trk') },
      }),
    ].slice(0, limit)
  }

  if (appType === 'delivery') {
    const orderId = randomId('ord')
    return [
      makeEvent({
        channelKey: 'orders',
        eventKey: 'order.created',
        direction: 'emit',
        source: 'simulation',
        payload: { orderId, customerId: randomId('cus'), restaurantId: randomId('rst'), total: 42.5 },
      }),
      makeEvent({
        channelKey: 'dispatch',
        eventKey: 'dispatch.assigned',
        direction: 'emit',
        source: 'simulation',
        payload: { orderId, driverId: randomId('drv'), driverName: 'Repartidor Demo' },
      }),
      makeEvent({
        channelKey: 'dispatch',
        eventKey: 'tracking.updated',
        direction: 'emit',
        source: 'simulation',
        payload: { orderId, lat: randomLat(4.711), lng: randomLng(-74.0721), etaMinutes: 12 },
      }),
    ].slice(0, limit)
  }

  if (appType === 'chatflow') {
    const flowId = randomId('flow')
    const executionId = randomId('exec')
    return [
      makeEvent({
        channelKey: 'builder',
        eventKey: 'flow.saved',
        direction: 'emit',
        source: 'simulation',
        payload: { flowId, version: 3, nodeCount: 8 },
      }),
      makeEvent({
        channelKey: 'executions',
        eventKey: 'execution.started',
        direction: 'emit',
        source: 'simulation',
        payload: { executionId, flowId, trigger: 'manual_test' },
      }),
      makeEvent({
        channelKey: 'executions',
        eventKey: 'execution.log',
        direction: 'emit',
        source: 'simulation',
        payload: { executionId, nodeId: randomId('node'), level: 'info', message: 'Flow ejecutado correctamente' },
      }),
      makeEvent({
        channelKey: 'executions',
        eventKey: 'execution.completed',
        direction: 'emit',
        source: 'simulation',
        payload: { executionId, flowId, status: 'success', output: 'Simulation completed' },
      }),
      makeEvent({
        channelKey: 'executions',
        eventKey: 'flow.published',
        direction: 'emit',
        source: 'simulation',
        payload: { flowId, version: 3, channel: 'web-widget' },
      }),
    ].slice(0, limit)
  }

  if (appType === 'mobility') {
    const rideId = randomId('ride')
    return [
      makeEvent({
        channelKey: 'rides',
        eventKey: 'ride.requested',
        direction: 'emit',
        source: 'simulation',
        payload: { rideId, passengerId: randomId('psg'), pickupLabel: 'Zona T', dropoffLabel: 'Aeropuerto' },
      }),
      makeEvent({
        channelKey: 'dispatch',
        eventKey: 'driver.assigned',
        direction: 'emit',
        source: 'simulation',
        payload: { rideId, driverId: randomId('drv'), vehicleId: randomId('veh') },
      }),
      makeEvent({
        channelKey: 'dispatch',
        eventKey: 'driver.location.updated',
        direction: 'emit',
        source: 'simulation',
        payload: { rideId, lat: randomLat(4.711), lng: randomLng(-74.0721), heading: 180, etaMinutes: 4 },
      }),
      makeEvent({
        channelKey: 'dispatch',
        eventKey: 'pricing.updated',
        direction: 'emit',
        source: 'simulation',
        payload: { rideId, baseFare: 4.2, surgeMultiplier: 1.3, estimatedTotal: 9.8 },
      }),
    ].slice(0, limit)
  }

  const fallback = contract.channels.flatMap(channel => channel.events.slice(0, 1).map(event => makeEvent({
    channelKey: channel.key,
    eventKey: event.key,
    direction: event.direction,
    source: 'simulation' as const,
    payload: Object.fromEntries(event.fields.map(field => [field.name, field.type === 'number' ? 1 : `${field.name}_demo`])),
  })))

  return fallback.slice(0, limit)
}
