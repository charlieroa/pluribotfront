/**
 * Blog/Magazine template — Header, FeaturedPost, PostGrid with category filters, Sidebar, Footer.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import { useState } from 'react'
import Header from './components/Header'
import FeaturedPost from './components/FeaturedPost'
import PostGrid from './components/PostGrid'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import { posts } from './data/posts'

export default function App() {
  const [category, setCategory] = useState('Todos')
  const categories = ['Todos', ...Array.from(new Set(posts.map(p => p.category)))]
  const filtered = category === 'Todos' ? posts : posts.filter(p => p.category === category)
  const featured = posts[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <FeaturedPost post={featured} />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <PostGrid
              posts={filtered.slice(1)}
              categories={categories}
              activeCategory={category}
              onCategoryChange={setCategory}
            />
          </div>
          <Sidebar posts={posts} categories={categories} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
`

const headerTsx = `import { useState } from 'react'
import { Search, Menu, X } from 'lucide-react'

const links = [
  { label: 'Inicio', href: '#' },
  { label: 'Categorias', href: '#categorias' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="text-xl font-bold text-indigo-600">MiBlog</a>

        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar articulos..."
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-56"
            />
          </div>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-indigo-600">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
`

const featuredPostTsx = `import { Clock, User } from 'lucide-react'

interface Post {
  id: number
  title: string
  excerpt: string
  category: string
  date: string
  author: string
  readTime: string
}

export default function FeaturedPost({ post }: { post: Post }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 md:p-12 text-white">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="relative max-w-2xl">
        <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full mb-4">
          {post.category}
        </span>
        <h2 className="text-2xl md:text-4xl font-extrabold mb-4 leading-tight">{post.title}</h2>
        <p className="text-indigo-200 text-sm md:text-base leading-relaxed mb-6">{post.excerpt}</p>
        <div className="flex items-center gap-4 text-indigo-200 text-sm">
          <span className="flex items-center gap-1.5"><User size={14} /> {post.author}</span>
          <span className="flex items-center gap-1.5"><Clock size={14} /> {post.readTime}</span>
          <span>{post.date}</span>
        </div>
      </div>
    </div>
  )
}
`

const postCardTsx = `import { Clock } from 'lucide-react'

interface Post {
  id: number
  title: string
  excerpt: string
  category: string
  date: string
  author: string
  readTime: string
}

const categoryColors: Record<string, string> = {
  Tecnologia: 'bg-blue-100 text-blue-700',
  Negocios: 'bg-emerald-100 text-emerald-700',
  Diseno: 'bg-purple-100 text-purple-700',
  Marketing: 'bg-amber-100 text-amber-700',
  Productividad: 'bg-rose-100 text-rose-700',
}

export default function PostCard({ post }: { post: Post }) {
  const colorClass = categoryColors[post.category] || 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
      <div className="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <span className="text-4xl font-bold text-indigo-300/50">{post.title[0]}</span>
      </div>
      <div className="p-5">
        <span className={\`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full mb-3 \${colorClass}\`}>
          {post.category}
        </span>
        <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{post.date}</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
        </div>
      </div>
    </div>
  )
}
`

const postGridTsx = `import PostCard from './PostCard'

interface Post {
  id: number
  title: string
  excerpt: string
  category: string
  date: string
  author: string
  readTime: string
}

interface PostGridProps {
  posts: Post[]
  categories: string[]
  activeCategory: string
  onCategoryChange: (cat: string) => void
}

export default function PostGrid({ posts, categories, activeCategory, onCategoryChange }: PostGridProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={\`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors \${
              activeCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }\`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {posts.length === 0 && (
        <p className="text-center text-gray-400 py-12">No hay articulos en esta categoria.</p>
      )}
    </div>
  )
}
`

const sidebarTsx = `import { Mail } from 'lucide-react'

interface Post {
  id: number
  title: string
  excerpt: string
  category: string
  date: string
  author: string
  readTime: string
}

export default function Sidebar({ posts, categories }: { posts: Post[]; categories: string[] }) {
  return (
    <aside className="space-y-6">
      {/* Categorias */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Categorias</h3>
        <ul className="space-y-2">
          {categories.filter(c => c !== 'Todos').map(cat => (
            <li key={cat} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{cat}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {posts.filter(p => p.category === cat).length}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Posts recientes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Recientes</h3>
        <ul className="space-y-3">
          {posts.slice(0, 4).map(p => (
            <li key={p.id} className="cursor-pointer group">
              <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors line-clamp-2">{p.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.date}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Newsletter */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={18} />
          <h3 className="text-sm font-bold">Newsletter</h3>
        </div>
        <p className="text-xs text-indigo-200 mb-4">Recibe los mejores articulos en tu correo cada semana.</p>
        <input
          type="email"
          placeholder="tu@email.com"
          className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg placeholder-indigo-300 text-white focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
        />
        <button className="w-full py-2 bg-white text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
          Suscribirme
        </button>
      </div>
    </aside>
  )
}
`

const footerTsx = `export default function Footer() {
  const columns = [
    { title: 'Contenido', links: ['Articulos', 'Tutoriales', 'Recursos', 'Podcast'] },
    { title: 'Empresa', links: ['Sobre nosotros', 'Equipo', 'Contacto', 'Prensa'] },
    { title: 'Legal', links: ['Privacidad', 'Terminos', 'Cookies'] },
  ]

  return (
    <footer className="bg-gray-900 text-gray-400 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <span className="text-xl font-bold text-white">MiBlog</span>
            <p className="text-sm mt-3 leading-relaxed">Ideas y conocimiento para profesionales.</p>
          </div>
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-xs">
          &copy; {new Date().getFullYear()} MiBlog. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
`

const postsData = `export const posts = [
  {
    id: 1,
    title: 'Guia completa de inteligencia artificial para negocios en 2025',
    excerpt: 'Descubre como la IA esta transformando las empresas y como puedes aprovecharla para escalar tu negocio de forma inteligente.',
    category: 'Tecnologia',
    date: '15 Feb 2025',
    author: 'Ana Martinez',
    readTime: '8 min',
  },
  {
    id: 2,
    title: 'Estrategias de marketing digital que realmente funcionan',
    excerpt: 'Aprende las tacticas probadas que las marcas exitosas usan para crecer en redes sociales y buscadores.',
    category: 'Marketing',
    date: '12 Feb 2025',
    author: 'Carlos Lopez',
    readTime: '6 min',
  },
  {
    id: 3,
    title: 'Principios de diseno UI/UX para productos digitales',
    excerpt: 'Claves para crear interfaces que los usuarios amen y que conviertan visitantes en clientes.',
    category: 'Diseno',
    date: '10 Feb 2025',
    author: 'Sofia Ramirez',
    readTime: '5 min',
  },
  {
    id: 4,
    title: 'Como construir un negocio SaaS desde cero',
    excerpt: 'Paso a paso para crear, lanzar y escalar un producto de software como servicio.',
    category: 'Negocios',
    date: '8 Feb 2025',
    author: 'Diego Torres',
    readTime: '10 min',
  },
  {
    id: 5,
    title: '10 habitos de productividad para equipos remotos',
    excerpt: 'Tecnicas y herramientas para mantener a tu equipo productivo trabajando desde cualquier lugar.',
    category: 'Productividad',
    date: '5 Feb 2025',
    author: 'Maria Gonzalez',
    readTime: '4 min',
  },
  {
    id: 6,
    title: 'El futuro del desarrollo web: tendencias 2025',
    excerpt: 'React Server Components, IA generativa, edge computing y otras tendencias que definen el desarrollo moderno.',
    category: 'Tecnologia',
    date: '3 Feb 2025',
    author: 'Juan Hernandez',
    readTime: '7 min',
  },
  {
    id: 7,
    title: 'Branding para startups: crea una marca memorable',
    excerpt: 'Como definir tu identidad visual, tono de voz y posicionamiento desde el dia uno.',
    category: 'Diseno',
    date: '1 Feb 2025',
    author: 'Laura Vargas',
    readTime: '6 min',
  },
  {
    id: 8,
    title: 'SEO en 2025: lo que realmente importa para rankear',
    excerpt: 'Guia actualizada con las mejores practicas de SEO despues de las actualizaciones de Google.',
    category: 'Marketing',
    date: '28 Ene 2025',
    author: 'Roberto Silva',
    readTime: '9 min',
  },
]
`

export function getBlogFiles(): FileSystemTree {
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
            'FeaturedPost.tsx': { file: { contents: featuredPostTsx } },
            'PostCard.tsx': { file: { contents: postCardTsx } },
            'PostGrid.tsx': { file: { contents: postGridTsx } },
            'Sidebar.tsx': { file: { contents: sidebarTsx } },
            'Footer.tsx': { file: { contents: footerTsx } },
          },
        },
        data: {
          directory: {
            'posts.ts': { file: { contents: postsData } },
          },
        },
      },
    },
  }
}
