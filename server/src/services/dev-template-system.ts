type TemplateKind =
  | 'landing-premium'
  | 'saas-editorial'
  | 'ecommerce-fashion'
  | 'delivery-marketplace'
  | 'learning-lms'
  | 'chatflow-workbench'
  | 'mobility-dispatch'
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
    id: 'delivery-marketplace',
    label: 'Delivery Marketplace',
    bestFor: ['delivery', 'domicilios', 'restaurante', 'restaurantes', 'repartidor', 'pedidos', 'rappi', 'uber eats'],
    visualDirection: 'Marketplace operativo con storefront claro, panel de pedidos, estados visibles y jerarquia entre cliente, restaurante y reparto.',
    layoutRules: [
      'La primera vista debe mostrar el flujo core: restaurantes o pedidos, no una pantalla vacia.',
      'Separa visualmente cliente/storefront de operacion interna con shells distintos o tabs fuertes.',
      'Los estados del pedido deben ser legibles y estar presentes en cards, tablas y detalle.',
      'Si hay tracking, empieza con timeline/ETA/mapa simulado antes de dependencias reales de mapas.',
    ],
    componentSet: ['CommerceShell', 'RestaurantRail', 'MenuGrid', 'CartDrawer', 'OrderTimeline', 'DispatchBoard', 'TrackingPanel'],
    motionRules: [
      'Usa motion para transiciones de carrito, cambios de estado y drawers operativos.',
      'No uses gsap ni efectos de marketing si el foco es la operacion del producto.',
    ],
    avoid: [
      'No mezcles todo como un ecommerce generico sin reparto.',
      'No escondas el estado del pedido o el rol del repartidor.',
    ],
  },
  {
    id: 'learning-lms',
    label: 'Learning LMS',
    bestFor: ['lms', 'academia', 'cursos', 'curso', 'learning', 'capacitacion', 'clases', 'lecciones', 'modulos', 'campus virtual', 'plataforma educativa', 'educacion'],
    visualDirection: 'Product UI for online learning with strong curriculum hierarchy, video-first lesson views, learning roadmap per module, freemium paywall after first module, interactive didactic content builder with drag-and-drop, instructor tools and student progress surfaces.',
    layoutRules: [
      'La primera experiencia despues del login debe abrir en dashboard o campus, nunca quedarse solo en el login.',
      'Separa claramente vistas de alumno, instructor o admin con tabs, sidebar o shells dedicados.',
      'El curso debe mostrar estructura real: cursos, modulos, lecciones, recursos, progreso y acciones.',
      'SIEMPRE incluye builder interno con reordenamiento drag-and-drop de modulos y lecciones, panel de metadatos, editor de contenido didactico interactivo (quizzes, flashcards, ejercicios, ordenar conceptos).',
      'Usa home de aprendizaje tipo escuela/ruta: categorias, rutas destacadas, continuar aprendiendo y progreso global.',
      'La vista interna del curso debe tener player principal + sidebar sticky de curriculum con modulos y lecciones.',
      'Cada modulo debe mostrar "Lo que vas a aprender" (learning objectives) como lista visible antes de empezar — el alumno debe ver la curva de aprendizaje completa del curso y de cada modulo.',
      'El primer modulo del curso es GRATIS (freemium). Despues del modulo 1 muestra paywall elegante con precio, beneficios y boton de compra/suscripcion. El contenido bloqueado se ve con overlay blur + icono candado.',
      'Incluye seed data realista: 3-5 cursos con 3-4 modulos cada uno, cada modulo con 4-6 lecciones con titulo, duracion, tipo (video/lectura/quiz/ejercicio) y estado de completado.',
      'Dashboard del alumno muestra: curva de progreso (grafico lineal), horas estudiadas, racha de dias, cursos activos, certificados obtenidos, recomendaciones personalizadas.',
    ],
    componentSet: ['LearningShell', 'LearningPathRail', 'ContinueLearningStrip', 'CourseCurriculumSidebar', 'LessonPlayer', 'LessonBuilderDnD', 'VideoLessonGrid', 'QuizComposer', 'StudentProgressPanel', 'CohortTable', 'LearningObjectivesList', 'PaywallOverlay', 'InteractiveExercise', 'ProgressChart', 'CertificateCard', 'ModuleRoadmap', 'DragDropContentEditor'],
    motionRules: [
      'Usa motion para drag affordances, reorder de modulos/lecciones, tabs de contenido, paneles laterales y transiciones de paywall.',
      'Usa motion para la animacion de progreso, desbloqueo de modulos y celebracion de logros (confetti sutil).',
      'No uses gsap; la prioridad es UX de producto, claridad y navegabilidad.',
    ],
    avoid: [
      'No entregues solo una landing de cursos sin area interna.',
      'No dejes cursos sin modulos o lecciones reales visibles.',
      'No dejes modulos sin lista de objetivos de aprendizaje ("Lo que vas a aprender").',
      'No permitas acceso a modulo 2+ sin paywall — el modelo es freemium.',
      'No uses datos vacios: cada curso debe tener contenido seed realista con titulos, duraciones y tipos de leccion reales.',
    ],
  },
  {
    id: 'chatflow-workbench',
    label: 'Chatflow Workbench',
    bestFor: ['chatflow', 'workflow', 'chatbot', 'builder', 'nodos', 'automatizacion', 'flujos'],
    visualDirection: 'Producto tipo workflow SaaS con canvas dominante, inspector lateral, panel de ejecuciones y bloques tecnicos limpios.',
    layoutRules: [
      'La vista principal debe ser el builder o una home claramente orientada a flujos, no un CRUD plano.',
      'Combina canvas, libreria de nodos, panel de propiedades y ejecuciones recientes.',
      'Versionado, publish y logs deben sentirse parte del producto desde la navegacion principal.',
      'Usa shells tipo workbench con sidebars y paneles anclados; evita layouts de marketing.',
    ],
    componentSet: ['WorkflowShell', 'NodePalette', 'FlowCanvas', 'InspectorPanel', 'ExecutionLogPanel', 'VersionRail', 'TriggerCards'],
    motionRules: [
      'Usa motion para drag affordances, cambios de panel, tabs y transiciones de nodos.',
      'No uses gsap; el foco es UX de producto, no escenas hero.',
    ],
    avoid: [
      'No conviertas chatflow en dashboard financiero genérico.',
      'No ocultes el canvas o las conexiones detrás de tablas como vista principal.',
    ],
  },
  {
    id: 'mobility-dispatch',
    label: 'Mobility Dispatch',
    bestFor: ['uber', 'ride', 'movilidad', 'conductor', 'conductores', 'pasajero', 'pasajeros', 'viajes', 'ride hailing', 'taxi app'],
    visualDirection: 'Centro operativo de movilidad con dispatch claro, estados del viaje, tracking simulado y paneles multirol para admin, conductor y pasajero.',
    layoutRules: [
      'La vista principal debe centrarse en viajes, dispatch o actividad operativa; evita dashboards decorativos sin flujo real.',
      'Combina panel admin con vistas o tabs para conductor y pasajero si el proyecto cubre varios roles.',
      'Los estados del viaje deben verse claramente: solicitado, asignado, en camino, en curso, completado, cancelado.',
      'El tracking debe empezar como simulacion estable: ETA, coordenadas mock, timeline y eventos del viaje.',
    ],
    componentSet: ['DispatchShell', 'RideQueueBoard', 'DriverAvailabilityPanel', 'RideLifecycleTimeline', 'TrackingMapMock', 'PricingPanel', 'ZoneCoverageCard'],
    motionRules: [
      'Usa motion para cambios de estado del viaje, drawers, tabs y paneles de dispatch.',
      'No uses gsap ni escenas de marketing en este template.',
    ],
    avoid: [
      'No dependas de mapas reales para que el MVP funcione.',
      'No escondas el lifecycle del viaje ni la asignacion de conductor.',
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
  if (/(delivery|domicilio|restaurante|restaurantes|pedido|repartidor|rappi|uber eats)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'delivery-marketplace')!
  }
  if (/(lms|academia|cursos|curso|learning|capacitacion|clases|lecciones|modulos|campus virtual|plataforma educativa|educacion)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'learning-lms')!
  }
  if (/(chatflow|workflow|chatbot|builder|nodos|automatizacion|flujos)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'chatflow-workbench')!
  }
  if (/(uber|ride|movilidad|conductor|conductores|pasajero|pasajeros|viajes|ride hailing|taxi app)/.test(lower)) {
    return DEV_TEMPLATE_LIBRARY.find(template => template.id === 'mobility-dispatch')!
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

function buildLmsDeepContext(): string {
  return `

--- REGLAS LMS / ACADEMIA (inyeccion condicional) ---

ARQUITECTURA DE ROLES:
- Alumno: Dashboard, Mis cursos, Ruta/escuela, Player de leccion, Progreso, Certificados
- Instructor/Admin: Cursos, Builder, Modulos, Lecciones, Estudiantes, Analitica basica

MODELO FREEMIUM OBLIGATORIO:
1. El primer modulo de cada curso es GRATIS y completamente accesible.
2. Al intentar acceder al modulo 2+, muestra paywall elegante:
   - Overlay blur sobre el contenido bloqueado con icono candado
   - Card central con: precio del curso, beneficios, testimonios cortos, boton "Desbloquear curso completo"
   - Opcion de suscripcion mensual o pago unico
3. El contenido bloqueado debe verse parcialmente (titulos de modulos/lecciones visibles pero no accesibles).
4. Badge "GRATIS" en el modulo 1, badge "PRO" con candado en modulos 2+.

CURVA DE APRENDIZAJE / ROADMAP:
1. Cada curso tiene una vista "Roadmap" o "Ruta de aprendizaje" que muestra todos los modulos en orden con conexiones visuales (timeline vertical o path con nodos).
2. Cada modulo muestra "Lo que vas a aprender" como lista de 3-5 objetivos concretos con icono check.
3. El alumno puede ver TODA la ruta antes de empezar — esto genera confianza y anticipacion.
4. Modulos completados: verde con check. Modulo actual: highlighted/pulsing. Modulos futuros: gris con candado si son PRO.
5. Dashboard del alumno incluye grafico de progreso (linea temporal con horas/dias) y estadisticas: racha de dias, horas totales, lecciones completadas, certificados.

CONTENIDO DIDACTICO INTERACTIVO:
1. Tipos de leccion obligatorios: video, lectura, quiz, ejercicio interactivo, flashcards.
2. Quiz: preguntas multiple choice con feedback inmediato (correcto/incorrecto + explicacion).
3. Ejercicios: drag-and-drop para ordenar conceptos, completar huecos, emparejar columnas.
4. Flashcards: voltear con animacion, modo estudio con repeticion espaciada simulada.
5. Cada leccion tiene indicador de tipo (icono), duracion estimada y estado (pendiente/en progreso/completado).

BUILDER DE CONTENIDO (INSTRUCTOR/ADMIN):
1. Panel drag-and-drop para reordenar modulos y lecciones dentro de cada modulo.
2. Al crear leccion: selector de tipo (video/lectura/quiz/ejercicio/flashcard).
3. Editor de quiz: agregar preguntas, opciones, marcar respuesta correcta, texto de explicacion.
4. Editor de ejercicio: definir elementos arrastrables, zonas de drop, respuesta correcta.
5. Preview en vivo del contenido mientras se edita.
6. Estado de publicacion por leccion: borrador/publicado/archivado.
7. Metadatos de modulo: titulo, descripcion, objetivos de aprendizaje, duracion estimada, orden.

SEED DATA REALISTA:
Genera 3-5 cursos con datos realistas del dominio que pida el usuario. Cada curso con:
- Portada (placeholder image o gradient), titulo, descripcion, nivel (principiante/intermedio/avanzado), duracion total, instructor
- 3-4 modulos con titulo, objetivos, 4-6 lecciones cada uno
- Lecciones con: titulo, tipo, duracion, contenido simulado
- Progreso parcial simulado para el alumno demo (40-60% en curso 1, 0% en otros)

PATRONES UX OBLIGATORIOS:
- Sidebar sticky de curriculum dentro del curso con modulos colapsables y lecciones con estado (check/candado/actual)
- Boton "Continuar" / "Siguiente leccion" prominente
- Cards de curso: portada, nivel badge, duracion, instructor avatar, % completado con barra de progreso
- Dashboard de alumno primero, marketplace/catalogo accesible desde nav
- Celebracion sutil al completar leccion/modulo (confetti leve o animacion de check)

--- FIN REGLAS LMS ---`
}

export function buildDevTemplateContext(task: string): string {
  const primary = pickTemplate(task)
  const secondary = DEV_TEMPLATE_LIBRARY.filter(template => template.id !== primary.id)
    .slice(0, 2)

  // Inyeccion condicional: solo agrega deep context si el template lo requiere
  const deepContext = primary.id === 'learning-lms' ? buildLmsDeepContext() : ''

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
${deepContext}
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
