import type { FileSystemTree } from '@webcontainer/api'
import { getDashboardFiles } from './dashboard'
import { getLandingFiles } from './landing'
import { getEcommerceFiles } from './ecommerce'
import { getPortfolioFiles } from './portfolio'
import { getBlogFiles } from './blog'
import { getRestaurantFiles } from './restaurant'
import { getSaasFiles } from './saas'
import { getCrmFiles } from './crm'
import { getBookingFiles } from './booking'
import { getKanbanFiles } from './kanban'
import { sharedFiles } from './shared'

export interface TemplateManifest {
  id: string
  name: string
  description: string
  icon: string // lucide-react icon name
  category: 'app' | 'site' | 'tool'
  entryFile: string // file to open by default in editor
  files: FileSystemTree
}

function getBlankFiles(): FileSystemTree {
  const sharedSrc = (sharedFiles.src as { directory: FileSystemTree }).directory
  return {
    ...sharedFiles,
    src: {
      directory: {
        ...sharedSrc,
        'App.tsx': {
          file: {
            contents: `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800">Nuevo Proyecto</h1>
    </div>
  )
}
`,
          },
        },
      },
    },
  }
}

const templates: TemplateManifest[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Panel de control con sidebar, graficos, tabla y cards de metricas',
    icon: 'LayoutDashboard',
    category: 'app',
    entryFile: 'src/App.tsx',
    files: getDashboardFiles(),
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Pagina de aterrizaje con hero, features, precios y testimonios',
    icon: 'Globe',
    category: 'site',
    entryFile: 'src/App.tsx',
    files: getLandingFiles(),
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Tienda online con catalogo, filtros por categoria y carrito de compras',
    icon: 'ShoppingBag',
    category: 'app',
    entryFile: 'src/App.tsx',
    files: getEcommerceFiles(),
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Portfolio profesional con galeria de proyectos y formulario de contacto',
    icon: 'Briefcase',
    category: 'site',
    entryFile: 'src/App.tsx',
    files: getPortfolioFiles(),
  },
  {
    id: 'blog',
    name: 'Blog',
    description: 'Blog con posts, categorias, sidebar y newsletter',
    icon: 'FileText',
    category: 'site',
    entryFile: 'src/App.tsx',
    files: getBlogFiles(),
  },
  {
    id: 'restaurant',
    name: 'Restaurante',
    description: 'Menu interactivo con categorias, reservaciones y horarios',
    icon: 'UtensilsCrossed',
    category: 'site',
    entryFile: 'src/App.tsx',
    files: getRestaurantFiles(),
  },
  {
    id: 'saas',
    name: 'SaaS',
    description: 'Landing para producto digital con pricing y FAQ',
    icon: 'Rocket',
    category: 'site',
    entryFile: 'src/App.tsx',
    files: getSaasFiles(),
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Gestion de clientes con pipeline kanban, tabla y metricas',
    icon: 'Users',
    category: 'app',
    entryFile: 'src/App.tsx',
    files: getCrmFiles(),
  },
  {
    id: 'booking',
    name: 'Reservas',
    description: 'Sistema de citas con calendario, horarios y confirmacion',
    icon: 'CalendarCheck',
    category: 'app',
    entryFile: 'src/App.tsx',
    files: getBookingFiles(),
  },
  {
    id: 'kanban',
    name: 'Kanban',
    description: 'Board de tareas con columnas, filtros y prioridades',
    icon: 'KanbanSquare',
    category: 'app',
    entryFile: 'src/App.tsx',
    files: getKanbanFiles(),
  },
  {
    id: 'blank',
    name: 'En blanco',
    description: 'Proyecto vacio con React + Tailwind listo para personalizar',
    icon: 'File',
    category: 'tool',
    entryFile: 'src/App.tsx',
    files: getBlankFiles(),
  },
]

export function getTemplate(id: string): TemplateManifest | undefined {
  return templates.find((t) => t.id === id)
}

export { templates }
