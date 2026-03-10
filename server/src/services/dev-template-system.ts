type TemplateKind =
  | 'landing-premium'
  | 'saas-editorial'
  | 'ecommerce-fashion'
  | 'ops-dashboard'
  | 'crm-analytical'
  | 'management-system'

interface DevTemplateDefinition {
  id: TemplateKind
  label: string
  bestFor: string[]
  visualDirection: string
  layoutRules: string[]
  componentSet: string[]
  motionRules: string[]
  avoid: string[]
}

const DEV_TEMPLATE_LIBRARY: DevTemplateDefinition[] = [
  {
    id: 'landing-premium',
    label: 'Landing Premium',
    bestFor: ['landing', 'sitio web', 'pagina web', 'marketing', 'saas landing', 'web corporativa'],
    visualDirection: 'Editorial dark/light contrast, typography oversized, asymmetrical grids, premium section breaks, strong CTA rhythm.',
    layoutRules: [
      'Hero brutal con una propuesta de valor dominante y una pieza visual de soporte.',
      'Usa 5-7 secciones maximo: hero, social proof, features, showcase, pricing/offer, CTA.',
      'Alterna bloques amplios con bento grids. Evita stacks infinitos de cards iguales.',
      'La primera pantalla debe tener una jerarquia visual clara y un CTA primario fuerte.',
    ],
    componentSet: ['HeroEditorial', 'LogoCloud', 'FeatureGridBento', 'ShowcasePanel', 'PricingWall', 'CTASection'],
    motionRules: [
      'Si usas motion, prioriza reveal suave, parallax leve y stagger util. No abuses de animaciones.',
      'Para marketing puedes usar gsap en hero y secciones showcase, pero solo si realmente mejora la experiencia.',
    ],
    avoid: [
      'No hagas una landing blanca y plana con gradiente generico morado.',
      'No uses 12 secciones repetidas de cards iguales.',
    ],
  },
  {
    id: 'saas-editorial',
    label: 'SaaS Editorial',
    bestFor: ['saas', 'producto digital', 'startup', 'plataforma', 'software'],
    visualDirection: 'Modern SaaS with sharp contrast, product-first storytelling, glossy panels, restrained gradients.',
    layoutRules: [
      'Hero split con copy + mockup.',
      'Features en grid asimetrico y una seccion de producto con pantallas o paneles.',
      'Pricing claro y CTA con una sola accion dominante.',
    ],
    componentSet: ['HeroSplitProduct', 'FeatureGridAsymmetric', 'MetricStrip', 'ProductShowcase', 'PricingCards'],
    motionRules: [
      'Usa motion para tabs, panel transitions y card hover.',
      'No conviertas toda la pagina en scroll-jacking.',
    ],
    avoid: ['No generes dashboard fake lleno de numeritos irrelevantes solo para decorar.'],
  },
  {
    id: 'ecommerce-fashion',
    label: 'Ecommerce Fashion',
    bestFor: ['ecommerce', 'tienda', 'catalogo', 'zapatos', 'moda', 'ropa', 'sneakers'],
    visualDirection: 'Editorial commerce, strong product photography, bold headings, polished cards, premium checkout summaries.',
    layoutRules: [
      'Usa hero de catalogo o coleccion destacada, no un dashboard tecnico como pantalla principal.',
      'Grid de productos con cards limpias y estados claros: precio, stock, talla, color, badge.',
      'Carrito y checkout deben verse premium y legibles.',
      'Si hay panel admin, separalo visualmente del storefront.',
    ],
    componentSet: ['CommerceShell', 'HeroSplitProduct', 'ProductCardPremium', 'FilterRail', 'CartDrawer', 'CheckoutSummary', 'InventoryPanel'],
    motionRules: [
      'Usa motion en hover de producto, drawer del carrito y transiciones de filtros.',
      'Usa gsap solo si la home storefront tiene una escena hero potente.',
    ],
    avoid: [
      'No hagas un ecommerce con apariencia de dashboard empresarial.',
      'No mezcles storefront y panel admin sin separacion clara.',
    ],
  },
  {
    id: 'ops-dashboard',
    label: 'Ops Dashboard',
    bestFor: ['dashboard', 'panel', 'analytics', 'metricas', 'operaciones'],
    visualDirection: 'Dense but clean operational UI, high legibility, KPI cards, data tables, restrained color coding.',
    layoutRules: [
      'Shell con sidebar/topbar clara.',
      'Fila inicial con KPIs fuertes y luego charts/tablas con jerarquia.',
      'Usa tarjetas de 2-3 tamaños, no 10 variaciones diferentes.',
    ],
    componentSet: ['DashboardShell', 'KpiCard', 'ChartPanel', 'ActivityFeed', 'DataTable'],
    motionRules: [
      'Usa motion para tab changes, modals, drawers y list transitions.',
      'No uses gsap en dashboards salvo una entrada de hero muy puntual.',
    ],
    avoid: ['No metas charts si no hay datos que contar.', 'No sobrecargues con gradientes fuertes en todas las cards.'],
  },
  {
    id: 'crm-analytical',
    label: 'CRM Analytical',
    bestFor: ['crm', 'ventas', 'pipeline', 'clientes', 'seguimiento comercial'],
    visualDirection: 'Professional analytical workspace, modular cards, kanban + table mix, neutral palette with one strong accent.',
    layoutRules: [
      'Debe haber pipeline o board, lista de clientes y resumen operativo.',
      'La home debe abrir en dashboard o pipeline, no en login vacio.',
      'Combina board, KPI cards y tabla de actividades.',
    ],
    componentSet: ['DashboardShell', 'PipelineBoard', 'KpiCard', 'CustomerTable', 'ActivityTimeline'],
    motionRules: [
      'Usa motion para board columns, drawers y paneles.',
    ],
    avoid: ['No conviertas un CRM en un simple CRUD sin contexto visual de negocio.'],
  },
  {
    id: 'management-system',
    label: 'Management System',
    bestFor: ['sistema', 'inventario', 'reservas', 'gestion', 'hospital', 'barberia', 'escuela'],
    visualDirection: 'Operational product UI with strong navigation, cards, tables, forms and clear module segmentation.',
    layoutRules: [
      'Siempre incluye dashboard + 3 modulos funcionales minimo.',
      'El login no puede ser la unica vista relevante.',
      'Cada modulo debe tener contenido real: cards, tabla, formulario o calendario segun aplique.',
    ],
    componentSet: ['DashboardShell', 'KpiCard', 'DataTable', 'FormPanel', 'ModuleTabs', 'CalendarPanel'],
    motionRules: [
      'Usa motion para panel transitions, modals y route-like tab switches.',
    ],
    avoid: ['No dejes contenedores vacios despues del login.'],
  },
]

function pickTemplate(task: string): DevTemplateDefinition {
  const lower = task.toLowerCase()

  if (/(ecommerce|tienda|catalogo|checkout|carrito|zapatos|ropa|moda|sneakers)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'ecommerce-fashion')!
  }
  if (/(landing|sitio web|pagina web|marketing|saas)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'landing-premium')!
  }
  if (/(crm|pipeline|clientes|leads|ventas)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'crm-analytical')!
  }
  if (/(dashboard|metricas|analytics|reportes|kpi|panel)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'ops-dashboard')!
  }
  if (/(sistema|inventario|reservas|gestion|hospital|barberia|escuela|admin)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'management-system')!
  }

  const matches = DEV_TEMPLATE_LIBRARY.map(template => ({
    template,
    score: template.bestFor.reduce((total, token) => total + (lower.includes(token) ? 1 : 0), 0),
  }))
    .sort((a, b) => b.score - a.score)

  const best = matches[0]
  return best && best.score > 0
    ? best.template
    : DEV_TEMPLATE_LIBRARY.find(template => template.id === 'saas-editorial')!
}

export function buildDevTemplateContext(task: string): string {
  const primary = pickTemplate(task)
  const secondary = DEV_TEMPLATE_LIBRARY.filter(template => template.id !== primary.id)
    .slice(0, 2)

  return `

--- PLURY UI TEMPLATE SUITE ---
Template principal seleccionado: ${primary.label} (${primary.id})
Aplica este template como base visual y estructural para el proyecto.

Direccion visual:
${primary.visualDirection}

Reglas de layout:
${primary.layoutRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

Componentes/patrones que debes construir o reutilizar dentro del proyecto:
${primary.componentSet.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Reglas de motion:
${primary.motionRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

Cosas que debes evitar:
${primary.avoid.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

Suite general disponible para elegir segun el caso:
${DEV_TEMPLATE_LIBRARY.map(template => `- ${template.id}: ${template.label}`).join('\n')}

Si el proyecto necesita una mezcla de storefront + admin, usa el template principal para la vista dominante y toma patrones de:
${secondary.map(template => `- ${template.label}`).join('\n')}

Reglas absolutas de la suite:
1. No improvises una UI genérica si el template ya sugiere una direccion clara.
2. Crea componentes base reutilizables en src/components/ui y src/components/patterns cuando el proyecto tenga varias vistas.
3. Usa Tailwind como base. Usa motion para producto si aporta valor y gsap solo para escenas de marketing o hero.
4. Las cards, botones, inputs y shells deben verse parte del mismo sistema visual.
5. Prioriza calidad visual, consistencia y legibilidad por encima de meter mas modulos.
--- FIN PLURY UI TEMPLATE SUITE ---`
}
