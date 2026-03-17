import type { ProjectAppType } from './project-apps.js'
import type { ProjectAppEventRecord } from './project-app-events.js'

export interface ProjectAppActionDefinition {
  key: string
  label: string
  description: string
}

export interface ProjectAppActionEventInput {
  channelKey: string
  eventKey: string
  direction: 'emit' | 'listen' | 'bi'
  payload: Record<string, unknown>
  source: 'action'
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

const ACTIONS: Record<ProjectAppType, ProjectAppActionDefinition[]> = {
  generic: [
    { key: 'create-record', label: 'Crear registro', description: 'Crea un nuevo registro operativo en la app.' },
    { key: 'assign-record', label: 'Asignar caso', description: 'Asigna el ultimo registro a un owner interno.' },
    { key: 'complete-record', label: 'Cerrar caso', description: 'Marca el ultimo registro como completado.' },
  ],
  saas: [
    { key: 'create-workspace', label: 'Crear workspace', description: 'Provisiona un nuevo workspace de cliente.' },
    { key: 'invite-user', label: 'Invitar usuario', description: 'Invita un usuario nuevo al workspace activo.' },
    { key: 'upgrade-subscription', label: 'Upgrade plan', description: 'Actualiza la suscripcion del workspace actual.' },
    { key: 'resolve-ticket', label: 'Resolver ticket', description: 'Cierra un ticket de soporte reciente.' },
  ],
  ecommerce: [
    { key: 'create-product', label: 'Crear producto', description: 'Agrega un producto nuevo al catalogo.' },
    { key: 'create-cart', label: 'Crear carrito', description: 'Simula un carrito nuevo de cliente.' },
    { key: 'checkout-order', label: 'Checkout', description: 'Convierte el carrito actual en una orden pagada.' },
    { key: 'fulfill-order', label: 'Fulfill order', description: 'Marca la ultima orden como despachada/entregada.' },
  ],
  delivery: [
    { key: 'create-order', label: 'Crear pedido', description: 'Emite un pedido nuevo para el restaurante.' },
    { key: 'accept-order', label: 'Aceptar pedido', description: 'Mueve el pedido a preparacion en restaurante.' },
    { key: 'assign-driver', label: 'Asignar repartidor', description: 'Asigna un repartidor al ultimo pedido activo.' },
    { key: 'pickup-order', label: 'Marcar recogido', description: 'Marca el pedido como recogido por el repartidor.' },
    { key: 'update-tracking', label: 'Actualizar tracking', description: 'Publica coordenadas y ETA del pedido.' },
    { key: 'complete-order', label: 'Completar pedido', description: 'Marca el pedido actual como entregado.' },
  ],
  chatflow: [
    { key: 'save-flow', label: 'Guardar flow', description: 'Guarda una nueva version del flow actual.' },
    { key: 'run-execution', label: 'Ejecutar flow', description: 'Lanza una ejecucion con logs basicos.' },
    { key: 'publish-flow', label: 'Publicar flow', description: 'Marca la ultima version como publicada.' },
  ],
  mobility: [
    { key: 'request-ride', label: 'Solicitar viaje', description: 'Crea una nueva solicitud de viaje.' },
    { key: 'assign-driver', label: 'Asignar conductor', description: 'Asigna conductor y cambia el estado del viaje.' },
    { key: 'driver-arrived', label: 'Conductor llego', description: 'Marca llegada al punto de recogida.' },
    { key: 'update-pricing', label: 'Actualizar tarifa', description: 'Publica precio estimado y surge basico.' },
    { key: 'start-ride', label: 'Iniciar viaje', description: 'Mueve el viaje a en progreso con tracking.' },
    { key: 'complete-ride', label: 'Completar viaje', description: 'Cierra el viaje actual como finalizado.' },
  ],
}

export function listProjectAppActions(appType: ProjectAppType): ProjectAppActionDefinition[] {
  return ACTIONS[appType] ?? []
}

export function buildProjectAppActionEvents(appType: ProjectAppType, actionKey: string, recentEvents: ProjectAppEventRecord[]): ProjectAppActionEventInput[] {
  if (appType === 'generic') {
    const recordId = getLatestValue(recentEvents, 'recordId') || randomId('rec')

    if (actionKey === 'create-record') {
      return [{
        channelKey: 'records',
        eventKey: 'record.created',
        direction: 'emit',
        source: 'action',
        payload: { recordId: randomId('rec'), entity: 'lead', status: 'open', priority: 'medium' },
      }]
    }

    if (actionKey === 'assign-record') {
      return [{
        channelKey: 'workflow',
        eventKey: 'record.assigned',
        direction: 'bi',
        source: 'action',
        payload: { recordId, ownerId: randomId('usr'), ownerName: 'Operador Demo', status: 'assigned' },
      }]
    }

    if (actionKey === 'complete-record') {
      return [{
        channelKey: 'workflow',
        eventKey: 'record.completed',
        direction: 'bi',
        source: 'action',
        payload: { recordId, status: 'completed', resolution: 'Case closed from operations panel' },
      }]
    }
  }

  if (appType === 'saas') {
    const workspaceId = getLatestValue(recentEvents, 'workspaceId') || randomId('ws')
    const planId = getLatestValue(recentEvents, 'planId') || 'starter'

    if (actionKey === 'create-workspace') {
      return [{
        channelKey: 'workspace',
        eventKey: 'workspace.created',
        direction: 'emit',
        source: 'action',
        payload: { workspaceId: randomId('ws'), companyName: 'Workspace Demo', status: 'active', planId },
      }]
    }

    if (actionKey === 'invite-user') {
      return [{
        channelKey: 'users',
        eventKey: 'user.invited',
        direction: 'emit',
        source: 'action',
        payload: { workspaceId, userId: randomId('usr'), email: 'ops@demo.co', role: 'admin' },
      }]
    }

    if (actionKey === 'upgrade-subscription') {
      return [{
        channelKey: 'billing',
        eventKey: 'subscription.updated',
        direction: 'bi',
        source: 'action',
        payload: { workspaceId, planId: planId === 'starter' ? 'pro' : 'enterprise', status: 'active', mrr: planId === 'starter' ? 49 : 299 },
      }]
    }

    if (actionKey === 'resolve-ticket') {
      return [{
        channelKey: 'support',
        eventKey: 'ticket.resolved',
        direction: 'emit',
        source: 'action',
        payload: { workspaceId, ticketId: randomId('tic'), status: 'resolved', slaHours: 2 },
      }]
    }
  }

  if (appType === 'ecommerce') {
    const productId = getLatestValue(recentEvents, 'productId') || randomId('prd')
    const cartId = getLatestValue(recentEvents, 'cartId') || randomId('cart')
    const orderId = getLatestValue(recentEvents, 'orderId') || randomId('ord')

    if (actionKey === 'create-product') {
      return [{
        channelKey: 'catalog',
        eventKey: 'product.created',
        direction: 'emit',
        source: 'action',
        payload: { productId: randomId('prd'), title: 'Producto Demo', price: 89, stock: 18 },
      }]
    }

    if (actionKey === 'create-cart') {
      return [{
        channelKey: 'cart',
        eventKey: 'cart.updated',
        direction: 'bi',
        source: 'action',
        payload: { cartId: randomId('cart'), productId, items: 1, subtotal: 89 },
      }]
    }

    if (actionKey === 'checkout-order') {
      return [{
        channelKey: 'orders',
        eventKey: 'checkout.completed',
        direction: 'emit',
        source: 'action',
        payload: { cartId, orderId: randomId('ord'), paymentStatus: 'paid', total: 89, customerEmail: 'buyer@demo.co' },
      }]
    }

    if (actionKey === 'fulfill-order') {
      return [{
        channelKey: 'orders',
        eventKey: 'order.fulfilled',
        direction: 'bi',
        source: 'action',
        payload: { orderId, fulfillmentStatus: 'fulfilled', trackingCode: randomId('trk') },
      }]
    }
  }

  if (appType === 'delivery') {
    const orderId = getLatestValue(recentEvents, 'orderId') || randomId('ord')

    if (actionKey === 'create-order') {
      return [{
        channelKey: 'orders',
        eventKey: 'order.created',
        direction: 'emit',
        source: 'action',
        payload: {
          orderId: randomId('ord'),
          customerId: randomId('cus'),
          restaurantId: randomId('rst'),
          total: 38.9,
        },
      }]
    }

    if (actionKey === 'assign-driver') {
      return [
        {
          channelKey: 'dispatch',
          eventKey: 'dispatch.assigned',
          direction: 'emit',
          source: 'action',
          payload: { orderId, driverId: randomId('drv'), driverName: 'Driver Operativo' },
        },
        {
          channelKey: 'orders',
          eventKey: 'order.status.changed',
          direction: 'bi',
          source: 'action',
          payload: { orderId, status: 'assigned', actorRole: 'dispatch', etaMinutes: 16 },
        },
      ]
    }

    if (actionKey === 'accept-order') {
      return [{
        channelKey: 'orders',
        eventKey: 'order.status.changed',
        direction: 'bi',
        source: 'action',
        payload: { orderId, status: 'preparing', actorRole: 'restaurant', etaMinutes: 18 },
      }]
    }

    if (actionKey === 'pickup-order') {
      return [{
        channelKey: 'orders',
        eventKey: 'order.status.changed',
        direction: 'bi',
        source: 'action',
        payload: { orderId, status: 'picked_up', actorRole: 'driver', etaMinutes: 10 },
      }]
    }

    if (actionKey === 'update-tracking') {
      const eta = Math.max((getLatestNumber(recentEvents, 'etaMinutes') ?? 14) - 2, 4)
      return [
        {
          channelKey: 'dispatch',
          eventKey: 'tracking.updated',
          direction: 'emit',
          source: 'action',
          payload: { orderId, lat: 4.711 + Math.random() * 0.01, lng: -74.0721 + Math.random() * 0.01, etaMinutes: eta },
        },
        {
          channelKey: 'orders',
          eventKey: 'order.status.changed',
          direction: 'bi',
          source: 'action',
          payload: { orderId, status: 'tracking', actorRole: 'dispatch', etaMinutes: eta },
        },
      ]
    }

    if (actionKey === 'complete-order') {
      return [{
        channelKey: 'orders',
        eventKey: 'order.status.changed',
        direction: 'bi',
        source: 'action',
        payload: { orderId, status: 'delivered', actorRole: 'driver', etaMinutes: 0 },
      }]
    }
  }

  if (appType === 'chatflow') {
    const flowId = getLatestValue(recentEvents, 'flowId') || randomId('flow')
    const version = (getLatestNumber(recentEvents, 'version') ?? 2) + 1
    const executionId = randomId('exec')

    if (actionKey === 'save-flow') {
      return [{
        channelKey: 'builder',
        eventKey: 'flow.saved',
        direction: 'emit',
        source: 'action',
        payload: { flowId, version, nodeCount: 9 },
      }]
    }

    if (actionKey === 'run-execution') {
      return [
        {
          channelKey: 'executions',
          eventKey: 'execution.started',
          direction: 'emit',
          source: 'action',
          payload: { executionId, flowId, trigger: 'operator_run' },
        },
        {
          channelKey: 'executions',
          eventKey: 'execution.log',
          direction: 'emit',
          source: 'action',
          payload: { executionId, nodeId: randomId('node'), level: 'info', message: 'Execution completed from operations panel' },
        },
      ]
    }

    if (actionKey === 'publish-flow') {
      return [{
        channelKey: 'executions',
        eventKey: 'flow.published',
        direction: 'emit',
        source: 'action',
        payload: { flowId, version, channel: 'web-widget' },
      }]
    }
  }

  if (appType === 'mobility') {
    const rideId = getLatestValue(recentEvents, 'rideId') || randomId('ride')

    if (actionKey === 'request-ride') {
      return [{
        channelKey: 'rides',
        eventKey: 'ride.requested',
        direction: 'emit',
        source: 'action',
        payload: { rideId: randomId('ride'), passengerId: randomId('psg'), pickupLabel: 'Chapinero', dropoffLabel: 'Parque 93' },
      }]
    }

    if (actionKey === 'assign-driver') {
      return [
        {
          channelKey: 'dispatch',
          eventKey: 'driver.assigned',
          direction: 'emit',
          source: 'action',
          payload: { rideId, driverId: randomId('drv'), vehicleId: randomId('veh') },
        },
        {
          channelKey: 'rides',
          eventKey: 'ride.status.changed',
          direction: 'bi',
          source: 'action',
          payload: { rideId, status: 'assigned', driverId: randomId('drv'), etaMinutes: 5 },
        },
      ]
    }

    if (actionKey === 'update-pricing') {
      return [{
        channelKey: 'dispatch',
        eventKey: 'pricing.updated',
        direction: 'emit',
        source: 'action',
        payload: { rideId, baseFare: 4.8, surgeMultiplier: 1.2, estimatedTotal: 10.4 },
      }]
    }

    if (actionKey === 'driver-arrived') {
      return [{
        channelKey: 'rides',
        eventKey: 'ride.status.changed',
        direction: 'bi',
        source: 'action',
        payload: { rideId, status: 'driver_arrived', etaMinutes: 0 },
      }]
    }

    if (actionKey === 'start-ride') {
      return [
        {
          channelKey: 'rides',
          eventKey: 'ride.status.changed',
          direction: 'bi',
          source: 'action',
          payload: { rideId, status: 'in_progress', etaMinutes: 9 },
        },
        {
          channelKey: 'dispatch',
          eventKey: 'driver.location.updated',
          direction: 'emit',
          source: 'action',
          payload: { rideId, lat: 4.715 + Math.random() * 0.01, lng: -74.068 + Math.random() * 0.01, heading: 90, etaMinutes: 9 },
        },
      ]
    }

    if (actionKey === 'complete-ride') {
      return [{
        channelKey: 'rides',
        eventKey: 'ride.status.changed',
        direction: 'bi',
        source: 'action',
        payload: { rideId, status: 'completed', etaMinutes: 0 },
      }]
    }
  }

  return []
}
