/**
 * Portfolio template — Header, About, Gallery, Contact, Footer.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import Header from './components/Header'
import About from './components/About'
import Gallery from './components/Gallery'
import ContactForm from './components/ContactForm'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header />
      <About />
      <Gallery />
      <ContactForm />
      <footer className="py-8 bg-gray-900 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Mi Portfolio. Todos los derechos reservados.
      </footer>
    </div>
  )
}
`

const headerTsx = `export default function Header() {
  const links = [
    { label: 'Sobre mi', href: '#about' },
    { label: 'Proyectos', href: '#gallery' },
    { label: 'Contacto', href: '#contact' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">Juan Garcia</span>
        <nav className="hidden sm:flex items-center gap-6">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
`

const aboutTsx = `const skills = ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'PostgreSQL', 'Docker', 'AWS', 'Figma']

export default function About() {
  return (
    <section id="about" className="py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-64 h-64 mx-auto md:mx-0 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-6xl font-bold">
              JG
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Hola, soy Juan</h1>
            <p className="text-sm text-indigo-600 font-semibold mb-4">Desarrollador Full-Stack</p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Mas de 5 anos creando aplicaciones web modernas. Me apasiona el codigo limpio,
              las interfaces intuitivas y la arquitectura escalable. Trabajo con startups y
              empresas para convertir ideas en productos funcionales.
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
`

const galleryTsx = `import ProjectCard from './ProjectCard'
import { projects } from '../data/projects'

export default function Gallery() {
  return (
    <section id="gallery" className="py-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Proyectos</h2>
          <p className="text-gray-500">Una seleccion de mi trabajo reciente.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <ProjectCard key={p.id} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}
`

const projectCardTsx = `interface ProjectCardProps {
  title: string
  description: string
  tech: string[]
  color: string
}

export default function ProjectCard({ title, description, tech, color }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
      <div
        className="h-40 w-full"
        style={{ background: \`linear-gradient(135deg, \${color}, \${color}99)\` }}
      />
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>
        <div className="flex flex-wrap gap-1.5">
          {tech.map(t => (
            <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
`

const contactFormTsx = `import { useState } from 'react'
import { Send } from 'lucide-react'

export default function ContactForm() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="contact" className="py-20">
      <div className="max-w-xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Contacto</h2>
          <p className="text-gray-500">Tienes un proyecto en mente? Hablemos.</p>
        </div>

        {sent ? (
          <div className="text-center p-8 rounded-2xl bg-emerald-50 border border-emerald-200">
            <p className="text-emerald-700 font-semibold">Mensaje enviado! Te respondere pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm resize-none"
                placeholder="Cuentame sobre tu proyecto..."
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Send size={16} />
              Enviar mensaje
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
`

const projectsTs = `export const projects = [
  {
    id: 1,
    title: 'Dashboard Analytics',
    description: 'Panel de control con graficos en tiempo real y gestion de metricas de negocio.',
    tech: ['React', 'TypeScript', 'Recharts'],
    color: '#6366f1',
  },
  {
    id: 2,
    title: 'E-commerce App',
    description: 'Tienda online completa con carrito, pagos y gestion de inventario.',
    tech: ['Next.js', 'Stripe', 'PostgreSQL'],
    color: '#059669',
  },
  {
    id: 3,
    title: 'Social Platform',
    description: 'Red social con feed en tiempo real, mensajeria y notificaciones push.',
    tech: ['React', 'Node.js', 'Socket.io'],
    color: '#dc2626',
  },
  {
    id: 4,
    title: 'Task Manager',
    description: 'Herramienta de gestion de proyectos con tableros Kanban y automatizaciones.',
    tech: ['Vue.js', 'Express', 'MongoDB'],
    color: '#7c3aed',
  },
  {
    id: 5,
    title: 'API Gateway',
    description: 'Microservicio de gateway con rate limiting, auth y cache distribuido.',
    tech: ['Go', 'Redis', 'Docker'],
    color: '#0891b2',
  },
  {
    id: 6,
    title: 'Mobile Banking',
    description: 'App de banca movil con transferencias, inversiones y notificaciones.',
    tech: ['React Native', 'Node.js', 'AWS'],
    color: '#ea580c',
  },
]
`

export function getPortfolioFiles(): FileSystemTree {
  const sharedSrc = (sharedFiles.src as { directory: FileSystemTree }).directory
  return {
    ...sharedFiles,
    src: {
      directory: {
        ...sharedSrc,
        'App.tsx': { file: { contents: appTsx } },
        components: {
          directory: {
            ...sharedUIComponents,
            'Header.tsx': { file: { contents: headerTsx } },
            'About.tsx': { file: { contents: aboutTsx } },
            'Gallery.tsx': { file: { contents: galleryTsx } },
            'ProjectCard.tsx': { file: { contents: projectCardTsx } },
            'ContactForm.tsx': { file: { contents: contactFormTsx } },
          },
        },
        data: {
          directory: {
            'projects.ts': { file: { contents: projectsTs } },
          },
        },
      },
    },
  }
}
