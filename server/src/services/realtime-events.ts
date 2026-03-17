import type { ProjectAppType } from './project-apps.js'

export interface RealtimeEventField {
  name: string
  type: string
  required: boolean
}

export interface RealtimeEventDefinition {
  key: string
  label: string
  direction: 'emit' | 'listen' | 'bi'
  description: string
  fields: RealtimeEventField[]
}

export interface RealtimeChannelDefinition {
  key: string
  label: string
  description: string
  events: RealtimeEventDefinition[]
}

export interface RealtimeContract {
  runtime: 'project_backend' | 'workflow' | 'realtime'
  transport: 'sse+http' | 'workflow+http'
  channels: RealtimeChannelDefinition[]
}

const DELIVERY_CONTRACT: RealtimeContract = {
  runtime: 'realtime',
  transport: 'sse+http',
  channels: [
    {
      key: 'orders',
      label: 'Pedidos',
      description: 'Sincroniza el lifecycle del pedido entre cliente, restaurante y operaciones.',
      events: [
        {
          key: 'order.created',
          label: 'Pedido creado',
          direction: 'emit',
          description: 'Se emite cuando el cliente confirma un pedido.',
          fields: [
            { name: 'orderId', type: 'string', required: true },
            { name: 'customerId', type: 'string', required: true },
            { name: 'restaurantId', type: 'string', required: true },
            { name: 'total', type: 'number', required: true },
          ],
        },
        {
          key: 'order.status.changed',
          label: 'Cambio de estado',
          direction: 'bi',
          description: 'Actualiza estados como pendiente, preparando, en reparto o entregado.',
          fields: [
            { name: 'orderId', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'actorRole', type: 'string', required: true },
            { name: 'etaMinutes', type: 'number', required: false },
          ],
        },
      ],
    },
    {
      key: 'dispatch',
      label: 'Despacho',
      description: 'Canal de asignacion de repartidores y tracking simulado.',
      events: [
        {
          key: 'dispatch.assigned',
          label: 'Repartidor asignado',
          direction: 'emit',
          description: 'Asigna un repartidor a un pedido.',
          fields: [
            { name: 'orderId', type: 'string', required: true },
            { name: 'driverId', type: 'string', required: true },
            { name: 'driverName', type: 'string', required: true },
          ],
        },
        {
          key: 'tracking.updated',
          label: 'Tracking actualizado',
          direction: 'emit',
          description: 'Publica ubicacion simulada, ETA y hito del recorrido.',
          fields: [
            { name: 'orderId', type: 'string', required: true },
            { name: 'lat', type: 'number', required: true },
            { name: 'lng', type: 'number', required: true },
            { name: 'etaMinutes', type: 'number', required: true },
          ],
        },
      ],
    },
  ],
}

const CHATFLOW_CONTRACT: RealtimeContract = {
  runtime: 'workflow',
  transport: 'workflow+http',
  channels: [
    {
      key: 'builder',
      label: 'Builder',
      description: 'Coordina cambios del canvas, nodos y conexiones.',
      events: [
        {
          key: 'flow.saved',
          label: 'Flow guardado',
          direction: 'emit',
          description: 'Persiste el estado del builder.',
          fields: [
            { name: 'flowId', type: 'string', required: true },
            { name: 'version', type: 'number', required: true },
            { name: 'nodeCount', type: 'number', required: true },
          ],
        },
        {
          key: 'node.updated',
          label: 'Nodo actualizado',
          direction: 'bi',
          description: 'Sincroniza cambios sobre props o conexiones de un nodo.',
          fields: [
            { name: 'flowId', type: 'string', required: true },
            { name: 'nodeId', type: 'string', required: true },
            { name: 'nodeType', type: 'string', required: true },
          ],
        },
      ],
    },
    {
      key: 'executions',
      label: 'Ejecuciones',
      description: 'Maneja runtime, logs y publish de los flows.',
      events: [
        {
          key: 'execution.started',
          label: 'Ejecucion iniciada',
          direction: 'emit',
          description: 'Abre una corrida del flow.',
          fields: [
            { name: 'executionId', type: 'string', required: true },
            { name: 'flowId', type: 'string', required: true },
            { name: 'trigger', type: 'string', required: true },
          ],
        },
        {
          key: 'execution.log',
          label: 'Log de ejecucion',
          direction: 'emit',
          description: 'Envía logs por nodo y resultado.',
          fields: [
            { name: 'executionId', type: 'string', required: true },
            { name: 'nodeId', type: 'string', required: false },
            { name: 'level', type: 'string', required: true },
            { name: 'message', type: 'string', required: true },
          ],
        },
        {
          key: 'execution.completed',
          label: 'Ejecucion completada',
          direction: 'emit',
          description: 'Cierra una corrida con estado final y salida resumida.',
          fields: [
            { name: 'executionId', type: 'string', required: true },
            { name: 'flowId', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'output', type: 'string', required: false },
          ],
        },
        {
          key: 'flow.published',
          label: 'Flow publicado',
          direction: 'emit',
          description: 'Marca una version como activa.',
          fields: [
            { name: 'flowId', type: 'string', required: true },
            { name: 'version', type: 'number', required: true },
            { name: 'channel', type: 'string', required: true },
          ],
        },
      ],
    },
  ],
}

const MOBILITY_CONTRACT: RealtimeContract = {
  runtime: 'realtime',
  transport: 'sse+http',
  channels: [
    {
      key: 'rides',
      label: 'Viajes',
      description: 'Gestiona lifecycle del viaje para pasajero, conductor y admin.',
      events: [
        {
          key: 'ride.requested',
          label: 'Viaje solicitado',
          direction: 'emit',
          description: 'Se crea una solicitud de viaje.',
          fields: [
            { name: 'rideId', type: 'string', required: true },
            { name: 'passengerId', type: 'string', required: true },
            { name: 'pickupLabel', type: 'string', required: true },
            { name: 'dropoffLabel', type: 'string', required: true },
          ],
        },
        {
          key: 'ride.status.changed',
          label: 'Cambio de estado del viaje',
          direction: 'bi',
          description: 'Actualiza el estado operativo del viaje.',
          fields: [
            { name: 'rideId', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'driverId', type: 'string', required: false },
            { name: 'etaMinutes', type: 'number', required: false },
          ],
        },
      ],
    },
    {
      key: 'dispatch',
      label: 'Dispatch y tracking',
      description: 'Coordina asignacion, ubicacion simulada y pricing dinamico basico.',
      events: [
        {
          key: 'driver.assigned',
          label: 'Conductor asignado',
          direction: 'emit',
          description: 'Vincula un conductor a la solicitud.',
          fields: [
            { name: 'rideId', type: 'string', required: true },
            { name: 'driverId', type: 'string', required: true },
            { name: 'vehicleId', type: 'string', required: true },
          ],
        },
        {
          key: 'driver.location.updated',
          label: 'Ubicacion actualizada',
          direction: 'emit',
          description: 'Propaga coordenadas mock y ETA del conductor.',
          fields: [
            { name: 'rideId', type: 'string', required: true },
            { name: 'lat', type: 'number', required: true },
            { name: 'lng', type: 'number', required: true },
            { name: 'heading', type: 'number', required: false },
            { name: 'etaMinutes', type: 'number', required: true },
          ],
        },
        {
          key: 'pricing.updated',
          label: 'Tarifa actualizada',
          direction: 'emit',
          description: 'Publica tarifa estimada o cambios de surge pricing.',
          fields: [
            { name: 'rideId', type: 'string', required: true },
            { name: 'baseFare', type: 'number', required: true },
            { name: 'surgeMultiplier', type: 'number', required: false },
            { name: 'estimatedTotal', type: 'number', required: true },
          ],
        },
      ],
    },
  ],
}

const DEFAULT_CONTRACT: RealtimeContract = {
  runtime: 'project_backend',
  transport: 'sse+http',
  channels: [
    {
      key: 'updates',
      label: 'Actualizaciones',
      description: 'Canal generico de cambios de estado y actividad.',
      events: [
        {
          key: 'entity.updated',
          label: 'Entidad actualizada',
          direction: 'emit',
          description: 'Publica cambios sobre una entidad del sistema.',
          fields: [
            { name: 'entity', type: 'string', required: true },
            { name: 'entityId', type: 'string', required: true },
            { name: 'status', type: 'string', required: false },
          ],
        },
      ],
    },
  ],
}

export function buildRealtimeContract(appType: ProjectAppType): RealtimeContract {
  if (appType === 'delivery') return DELIVERY_CONTRACT
  if (appType === 'chatflow') return CHATFLOW_CONTRACT
  if (appType === 'mobility') return MOBILITY_CONTRACT
  return DEFAULT_CONTRACT
}
