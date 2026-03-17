export type ProjectAppType = 'generic' | 'saas' | 'ecommerce' | 'delivery' | 'chatflow' | 'mobility'

export type ProjectAppRuntime = 'project_backend' | 'workflow' | 'realtime'

export interface ProjectAppModule {
  id: string
  label: string
  description: string
  capabilities: string[]
  phase: number
}

export interface ProjectAppPhase {
  index: number
  title: string
  goal: string
}

export interface ProjectAppCatalogItem {
  type: ProjectAppType
  label: string
  summary: string
  runtime: ProjectAppRuntime
  targetUsers: string[]
  readinessScore: number
  defaultCapabilities: string[]
  recommendedPayments: string[]
  phases: ProjectAppPhase[]
  modules: ProjectAppModule[]
}

export interface ProjectAppBootstrap {
  type: ProjectAppType
  runtime: ProjectAppRuntime
  modules: ProjectAppModule[]
  phases: ProjectAppPhase[]
  suggestedCapabilities: string[]
  recommendedPayments: string[]
  config: Record<string, unknown>
}

export interface ProjectAppExecutionBrief {
  title: string
  prompt: string
  phaseIndex: number
  phaseTitle: string
  runtime: ProjectAppRuntime
}

export const PROJECT_APP_CATALOG: ProjectAppCatalogItem[] = [
  {
    type: 'generic',
    label: 'App Generica',
    summary: 'Base para sistemas operativos con auth, CRUD, dashboard y administracion.',
    runtime: 'project_backend',
    targetUsers: ['operaciones', 'equipo interno'],
    readinessScore: 85,
    defaultCapabilities: ['auth', 'crud', 'dashboard'],
    recommendedPayments: ['none'],
    phases: [
      { index: 1, title: 'Base operativa', goal: 'Auth, layout, dashboard y CRUD principal.' },
      { index: 2, title: 'Operacion', goal: 'Reportes, permisos y automatizaciones simples.' },
    ],
    modules: [
      { id: 'auth', label: 'Auth y roles', description: 'Registro, login y permisos basicos.', capabilities: ['auth', 'roles'], phase: 1 },
      { id: 'entities', label: 'CRUD principal', description: 'Gestion de las entidades del negocio.', capabilities: ['crud'], phase: 1 },
      { id: 'dashboard', label: 'Dashboard', description: 'KPIs y actividad reciente.', capabilities: ['dashboard'], phase: 1 },
      { id: 'reports', label: 'Reportes', description: 'Filtros, exportacion y agregaciones.', capabilities: ['reports'], phase: 2 },
    ],
  },
  {
    type: 'saas',
    label: 'SaaS / Backoffice',
    summary: 'Aplicacion multirol con billing, admin, panel y capas internas de producto.',
    runtime: 'project_backend',
    targetUsers: ['admin', 'operaciones', 'clientes'],
    readinessScore: 82,
    defaultCapabilities: ['auth', 'roles', 'billing', 'dashboard', 'admin'],
    recommendedPayments: ['stripe_subscriptions', 'stripe_checkout'],
    phases: [
      { index: 1, title: 'Core SaaS', goal: 'Landing, auth, dashboard y panel basico.' },
      { index: 2, title: 'Billing y operaciones', goal: 'Planes, creditos, admin y soporte.' },
      { index: 3, title: 'Expansion', goal: 'Analitica, automatizaciones e integraciones.' },
    ],
    modules: [
      { id: 'landing', label: 'Landing publica', description: 'Marketing, planes y CTA de registro.', capabilities: ['landing'], phase: 1 },
      { id: 'workspace', label: 'Workspace', description: 'Dashboard, sidebar y vistas core.', capabilities: ['dashboard', 'roles'], phase: 1 },
      { id: 'billing', label: 'Billing', description: 'Planes, creditos y checkout.', capabilities: ['billing'], phase: 2 },
      { id: 'admin', label: 'Admin', description: 'Usuarios, auditoria y soporte.', capabilities: ['admin'], phase: 2 },
      { id: 'analytics', label: 'Analitica', description: 'KPIs avanzados y reportes.', capabilities: ['analytics'], phase: 3 },
    ],
  },
  {
    type: 'ecommerce',
    label: 'E-commerce',
    summary: 'Catalogo, carrito, checkout y gestion de pedidos para comercio online.',
    runtime: 'project_backend',
    targetUsers: ['clientes', 'admin', 'ventas'],
    readinessScore: 78,
    defaultCapabilities: ['catalog', 'cart', 'checkout', 'orders'],
    recommendedPayments: ['stripe_checkout', 'dlocal_checkout'],
    phases: [
      { index: 1, title: 'Storefront', goal: 'Catalogo, categorias y carrito.' },
      { index: 2, title: 'Operacion', goal: 'Checkout, pedidos e inventario.' },
      { index: 3, title: 'Optimizacion', goal: 'Promos, analitica y retencion.' },
    ],
    modules: [
      { id: 'catalog', label: 'Catalogo', description: 'Productos, categorias y buscador.', capabilities: ['catalog'], phase: 1 },
      { id: 'cart', label: 'Carrito', description: 'Resumen de compra y cantidades.', capabilities: ['cart'], phase: 1 },
      { id: 'checkout', label: 'Checkout', description: 'Pago, direccion y confirmacion.', capabilities: ['checkout'], phase: 2 },
      { id: 'orders', label: 'Pedidos', description: 'Estados, historial y fulfillment.', capabilities: ['orders'], phase: 2 },
      { id: 'promotions', label: 'Promociones', description: 'Cupones, bundles y campañas.', capabilities: ['promotions'], phase: 3 },
    ],
  },
  {
    type: 'delivery',
    label: 'Delivery',
    summary: 'Restaurantes, menu, pedidos, despacho y tracking para delivery multi-actor.',
    runtime: 'realtime',
    targetUsers: ['cliente', 'restaurante', 'repartidor', 'admin'],
    readinessScore: 64,
    defaultCapabilities: ['catalog', 'cart', 'orders', 'dispatch', 'tracking'],
    recommendedPayments: ['stripe_connect', 'dlocal_payouts'],
    phases: [
      { index: 1, title: 'Marketplace base', goal: 'Restaurantes, menu, carrito y pedidos.' },
      { index: 2, title: 'Operacion en vivo', goal: 'Despacho, repartidores y tracking.' },
      { index: 3, title: 'Plataforma', goal: 'Pagos split, comisiones y soporte.' },
    ],
    modules: [
      { id: 'restaurants', label: 'Restaurantes', description: 'Onboarding, horarios y cobertura.', capabilities: ['catalog', 'multi_store'], phase: 1 },
      { id: 'menu', label: 'Menu y carrito', description: 'Productos, extras y carrito persistente.', capabilities: ['catalog', 'cart'], phase: 1 },
      { id: 'orders', label: 'Pedidos', description: 'Creacion, estados y detalle del pedido.', capabilities: ['orders'], phase: 1 },
      { id: 'dispatch', label: 'Despacho', description: 'Asignacion de repartidor y SLA.', capabilities: ['dispatch'], phase: 2 },
      { id: 'tracking', label: 'Tracking', description: 'Estado en vivo y ubicacion simulada/real.', capabilities: ['tracking', 'realtime'], phase: 2 },
      { id: 'settlements', label: 'Comisiones y pagos', description: 'Split, payout y conciliacion.', capabilities: ['billing', 'payouts'], phase: 3 },
    ],
  },
  {
    type: 'chatflow',
    label: 'Chatflow',
    summary: 'Builder de nodos, ejecuciones y publicacion de flows conversacionales.',
    runtime: 'workflow',
    targetUsers: ['operaciones', 'soporte', 'marketing'],
    readinessScore: 58,
    defaultCapabilities: ['builder', 'nodes', 'executions', 'logs', 'publish'],
    recommendedPayments: ['stripe_subscriptions'],
    phases: [
      { index: 1, title: 'Builder', goal: 'Canvas, nodos y ramas basicas.' },
      { index: 2, title: 'Runtime', goal: 'Ejecuciones, logs y versionado.' },
      { index: 3, title: 'Publicacion', goal: 'Triggers, canales e integraciones.' },
    ],
    modules: [
      { id: 'builder', label: 'Canvas builder', description: 'Editor visual de nodos y conexiones.', capabilities: ['builder', 'nodes'], phase: 1 },
      { id: 'templates', label: 'Templates', description: 'Flows base reutilizables por caso.', capabilities: ['templates'], phase: 1 },
      { id: 'executions', label: 'Ejecuciones', description: 'Runner, historial y estados.', capabilities: ['executions', 'logs'], phase: 2 },
      { id: 'versions', label: 'Versionado', description: 'Borradores, publicar y rollback.', capabilities: ['publish', 'versioning'], phase: 2 },
      { id: 'channels', label: 'Canales', description: 'Webhook, chat web y disparadores.', capabilities: ['triggers', 'integrations'], phase: 3 },
    ],
  },
  {
    type: 'mobility',
    label: 'Movilidad / Uber simple',
    summary: 'Pasajeros, conductores, viajes y tracking para una app tipo ride-hailing.',
    runtime: 'realtime',
    targetUsers: ['pasajero', 'conductor', 'admin'],
    readinessScore: 42,
    defaultCapabilities: ['passengers', 'drivers', 'rides', 'dispatch', 'tracking', 'pricing'],
    recommendedPayments: ['stripe_connect', 'dlocal_payouts'],
    phases: [
      { index: 1, title: 'Base de movilidad', goal: 'Pasajeros, conductores, vehiculos y viajes.' },
      { index: 2, title: 'Tracking', goal: 'Asignacion, mapa simulado y pricing.' },
      { index: 3, title: 'Operacion', goal: 'Pagos, ratings, soporte y zonas.' },
    ],
    modules: [
      { id: 'passengers', label: 'Pasajeros', description: 'Perfiles, historial y medios de pago.', capabilities: ['passengers'], phase: 1 },
      { id: 'drivers', label: 'Conductores', description: 'Onboarding, documentos y estado.', capabilities: ['drivers'], phase: 1 },
      { id: 'rides', label: 'Viajes', description: 'Solicitud, asignacion y lifecycle del viaje.', capabilities: ['rides', 'dispatch'], phase: 1 },
      { id: 'fleet', label: 'Vehiculos y zonas', description: 'Vehiculos, cobertura y disponibilidad.', capabilities: ['fleet', 'zones'], phase: 2 },
      { id: 'tracking', label: 'Tracking y tarifas', description: 'Ubicacion, ETA y pricing dinamico basico.', capabilities: ['tracking', 'pricing', 'realtime'], phase: 2 },
      { id: 'payments', label: 'Pagos y ratings', description: 'Cobros, balance conductor y calificaciones.', capabilities: ['billing', 'payouts', 'ratings'], phase: 3 },
    ],
  },
]

export function getProjectAppCatalogItem(type: string): ProjectAppCatalogItem | undefined {
  return PROJECT_APP_CATALOG.find(item => item.type === type)
}

export function buildProjectAppBootstrap(type: ProjectAppType): ProjectAppBootstrap {
  const catalog = getProjectAppCatalogItem(type)
  if (!catalog) {
    throw new Error(`Unknown project app type: ${type}`)
  }

  return {
    type: catalog.type,
    runtime: catalog.runtime,
    modules: catalog.modules,
    phases: catalog.phases,
    suggestedCapabilities: [...catalog.defaultCapabilities],
    recommendedPayments: [...catalog.recommendedPayments],
    config: {
      readinessScore: catalog.readinessScore,
      targetUsers: catalog.targetUsers,
      runtime: catalog.runtime,
      roadmap: catalog.phases.map(phase => ({
        phaseIndex: phase.index,
        title: phase.title,
        goal: phase.goal,
        modules: catalog.modules.filter(module => module.phase === phase.index).map(module => module.id),
      })),
    },
  }
}

export function buildProjectAppExecutionBrief(type: ProjectAppType, projectName: string, phaseIndex = 1): ProjectAppExecutionBrief {
  const catalog = getProjectAppCatalogItem(type)
  if (!catalog) {
    throw new Error(`Unknown project app type: ${type}`)
  }

  const phase = catalog.phases.find(item => item.index === phaseIndex) ?? catalog.phases[0]
  const phaseModules = catalog.modules.filter(module => module.phase === phase.index)
  const modulesText = phaseModules.map(module => `${module.label} (${module.description})`).join(', ')

  const promptByType: Record<ProjectAppType, string> = {
    generic: `Crear sistema operativo para ${projectName} con login, dashboard, CRUD principal y reportes basicos. Incluir modulos de ${modulesText}. Todo persistente con seed realista.`,
    saas: `Crear app SaaS para ${projectName}. Fase ${phase.index}/${catalog.phases.length}: ${phase.title}. Incluir landing publica si aplica, login multirol, dashboard, sidebar y modulos de ${modulesText}. Usar billing solo como capa preparada si la fase lo requiere.`,
    ecommerce: `Crear e-commerce para ${projectName}. Fase ${phase.index}/${catalog.phases.length}: ${phase.title}. Incluir modulos de ${modulesText}, experiencia storefront clara, admin operativo y datos realistas.`,
    delivery: `Crear app de delivery para ${projectName}. Fase ${phase.index}/${catalog.phases.length}: ${phase.title}. Roles: admin, restaurante, repartidor, cliente. Incluir modulos de ${modulesText}. Priorizar operacion estable, pedidos con estados claros, despacho y tracking simulado antes que mapas reales.`,
    chatflow: `Crear plataforma de chatflow para ${projectName}. Fase ${phase.index}/${catalog.phases.length}: ${phase.title}. Incluir modulos de ${modulesText}. El builder debe tener canvas, libreria de nodos, inspector lateral, templates y experiencia de producto tipo workflow SaaS. Incluir ejecuciones recientes, versionado o publish si la fase lo requiere.`,
    mobility: `Crear plataforma tipo Uber simple para ${projectName}. Fase ${phase.index}/${catalog.phases.length}: ${phase.title}. Roles: admin, conductor, pasajero. Incluir modulos de ${modulesText}. Priorizar viajes, dispatch, cola de asignacion y tracking simulado con ETA, coordenadas mock y lifecycle del viaje antes que integraciones reales de mapas o payouts.`,
  }

  return {
    title: `${catalog.label} · ${phase.title}`,
    prompt: promptByType[type],
    phaseIndex: phase.index,
    phaseTitle: phase.title,
    runtime: catalog.runtime,
  }
}

export function slugifyProjectAppName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'app'
}

export function inferProjectAppType(input: string): ProjectAppType {
  const lower = input.toLowerCase()
  if (/(delivery|domicilio|restaurante|pedido|repartidor)/.test(lower)) return 'delivery'
  if (/(chatflow|workflow|chatbot|nodos|builder)/.test(lower)) return 'chatflow'
  if (/(uber|ride|movilidad|conductor|viaje)/.test(lower)) return 'mobility'
  if (/(tienda|ecommerce|catalogo|checkout|carrito)/.test(lower)) return 'ecommerce'
  if (/(saas|crm|erp|dashboard|backoffice|panel|sistema)/.test(lower)) return 'saas'
  return 'generic'
}
