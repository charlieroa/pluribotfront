// Component catalog and template registry for the Dev agent
// This gets injected into the system prompt and cached by Anthropic (~2K tokens)

export const DEV_COMPONENT_CATALOG = `
CATALOGO DE COMPONENTES window.__UI:

LAYOUT: Card(+Header,Title,Description,Content,Footer), Separator, ScrollArea
FORM: Button(variant,size), Input(type,placeholder), Label, Select(+Trigger,Value,Content,Item), Switch, Textarea
DATA: Table(+Header,Body,Row,Head,Cell), Badge(variant), Progress(value), Avatar(+Image,Fallback)
NAV: Tabs(+List,Trigger,Content), DropdownMenu(+Trigger,Content,Item,Separator)
OVERLAY: Dialog(+Trigger,Content,Header,Title,Description,Footer), Tooltip(+Provider,Trigger,Content)
ICONS: lucideReact.{Search,Plus,Trash2,Edit,Save,X,ChevronDown,Menu,Settings,User,Home,Bell,Mail,Calendar,Clock,Filter,Download,Upload,ExternalLink,MoreHorizontal,Check,AlertCircle,Info,Star,Heart,ShoppingCart,Package,Truck,CreditCard,BarChart3,PieChart,TrendingUp,Users,FileText,Folder,Image,Video,Music,Phone,MapPin,Globe,Lock,Unlock,Eye,EyeOff,Copy,Clipboard,RefreshCw,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,LogOut,LogIn,Zap,Award,Target,Briefcase,Building2,Utensils,Wrench,Car,Scissors,Stethoscope,GraduationCap,Dumbbell,Camera,Palette,Code2,Headphones,Wifi,Shield,Receipt,Tags,Percent,Gift,BookOpen,FileSpreadsheet,Printer,QrCode,Share2,MessageCircle,ThumbsUp,Send,Archive,Layers,Grid3X3,List,LayoutGrid,SlidersHorizontal,Minus}
CHARTS: Recharts.{LineChart,Line,BarChart,Bar,PieChart,Pie,Cell,AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer}
`

export const DEV_TEMPLATES: Record<string, { name: string; description: string }> = {
  // ─── LAYOUTS & DASHBOARDS ───
  DASHBOARD_LAYOUT: {
    name: 'Dashboard Layout',
    description: 'Sidebar + header + main area con cards de metricas y graficos',
  },
  ADMIN_PANEL: {
    name: 'Admin Panel',
    description: 'Panel admin completo: sidebar nav, breadcrumbs, tablas CRUD, filtros avanzados, roles',
  },
  KANBAN_BOARD: {
    name: 'Kanban Board',
    description: 'Tablero drag-and-drop con columnas To Do, In Progress, Done',
  },

  // ─── TABLAS & DATOS ───
  INVENTORY_TABLE: {
    name: 'Inventory Table',
    description: 'Tabla con busqueda, filtros, paginacion, CRUD modal, export',
  },
  DATA_TABLE_ADVANCED: {
    name: 'Data Table Advanced',
    description: 'Tabla avanzada: sort por columna, filtros multiples, seleccion masiva, acciones bulk, export CSV',
  },

  // ─── LANDING PAGES ───
  LANDING_HERO: {
    name: 'Landing Hero',
    description: 'Hero section con CTA, features grid, testimonios, footer',
  },
  LANDING_BUSINESS: {
    name: 'Landing Negocio',
    description: 'Web completa para negocio: hero, servicios, galeria, testimonios, equipo, contacto, mapa, footer',
  },
  LANDING_SAAS: {
    name: 'Landing SaaS',
    description: 'Landing para producto digital: hero con demo, features, pricing, FAQ, integraciones, CTA final',
  },

  // ─── E-COMMERCE ───
  ECOMMERCE_STORE: {
    name: 'E-commerce Tienda Completa',
    description: 'Tienda completa: catalogo con filtros/categorias/sort, detalle producto, carrito, checkout multi-step, resumen de orden',
  },
  ECOMMERCE_GRID: {
    name: 'E-commerce Grid',
    description: 'Grid de productos con filtros laterales, carrito sidebar, busqueda',
  },
  PRODUCT_DETAIL: {
    name: 'Product Detail',
    description: 'Pagina de detalle: galeria de imagenes, variantes, tallas, resenas, productos relacionados, add to cart',
  },

  // ─── SISTEMAS DE GESTION ───
  CRM_SYSTEM: {
    name: 'CRM System',
    description: 'Sistema CRM: contactos, pipeline de ventas, actividades, notas, seguimiento',
  },
  BOOKING_SYSTEM: {
    name: 'Booking System',
    description: 'Sistema de reservas/citas: calendario, seleccion de servicio, horarios disponibles, confirmacion',
  },
  DOCUMENT_MANAGER: {
    name: 'Document Manager',
    description: 'Gestor de documentos: carpetas, subida de archivos, preview, busqueda, compartir, permisos',
  },
  LMS_PLATFORM: {
    name: 'LMS / Academia Online',
    description: 'Plataforma LMS: login, dashboard, cursos con roadmap de aprendizaje, modulos internos con objetivos ("lo que vas a aprender"), curriculum sidebar sticky, builder drag-and-drop de lecciones y contenido didactico (quizzes, ejercicios, flashcards), grilla de videos, paywall freemium post modulo 1, progreso del estudiante con curva de aprendizaje, certificados y panel instructor/admin',
  },
  PROJECT_MANAGER: {
    name: 'Project Manager',
    description: 'Gestor de proyectos: lista de proyectos, tareas, timeline, miembros, progreso, comentarios',
  },
  INVOICE_SYSTEM: {
    name: 'Invoice System',
    description: 'Sistema de facturas: crear/editar facturas, clientes, productos, totales automaticos, PDF preview, historial',
  },

  // ─── CONTENIDO & SOCIAL ───
  BLOG_PLATFORM: {
    name: 'Blog Platform',
    description: 'Blog: lista de articulos, detalle con markdown, categorias, autor, busqueda, sidebar',
  },
  PORTFOLIO_GALLERY: {
    name: 'Portfolio Gallery',
    description: 'Portfolio: galeria masonry, filtros por categoria, lightbox, about, contacto',
  },

  // ─── AUTH & USERS ───
  AUTH_FORM: {
    name: 'Auth Form',
    description: 'Login/registro con validacion, social login buttons, forgot password',
  },
  USER_PROFILE: {
    name: 'User Profile',
    description: 'Perfil de usuario con avatar, stats, tabs de actividad',
  },

  // ─── UTILIDADES ───
  PRICING_PAGE: {
    name: 'Pricing Page',
    description: 'Pagina de precios con 3 tiers, toggle mensual/anual, feature comparison',
  },
  CHART_DASHBOARD: {
    name: 'Chart Dashboard',
    description: 'Dashboard de analytics con graficos de linea, barra, pie y KPIs',
  },
  SETTINGS_PANEL: {
    name: 'Settings Panel',
    description: 'Panel de configuracion con secciones, toggles, formularios',
  },
  TODO_LIST: {
    name: 'Todo List',
    description: 'Lista de tareas con categorias, prioridades, fechas, filtros',
  },
  CARD_LIST: {
    name: 'Card List',
    description: 'Lista de cards con busqueda, filtros, vista grid/list toggle',
  },
  CALCULATOR_FORM: {
    name: 'Calculator / Multi-step Form',
    description: 'Formulario multi-paso con validacion, progreso, resumen final, calculadora de precios',
  },
}

// Template names for prompt injection
export const TEMPLATE_LIST = Object.entries(DEV_TEMPLATES)
  .map(([key, t]) => `- ${key}: ${t.description}`)
  .join('\n')
