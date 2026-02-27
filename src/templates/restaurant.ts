/**
 * Restaurant/Menu template — Hero, MenuSection with category tabs, ReservationForm, About, Footer.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import Hero from './components/Hero'
import MenuSection from './components/MenuSection'
import ReservationForm from './components/ReservationForm'
import About from './components/About'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <MenuSection />
      <ReservationForm />
      <About />
      <Footer />
    </div>
  )
}
`

const heroTsx = `import { Clock, MapPin, Phone } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 text-white">
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
        <span className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 text-amber-200 text-xs font-semibold rounded-full mb-6">
          Cocina artesanal desde 2010
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          La Casa del Sabor
        </h1>
        <p className="text-lg text-amber-100/80 max-w-xl mx-auto mb-8">
          Ingredientes frescos, recetas tradicionales y un ambiente inolvidable. Ven a disfrutar la mejor cocina de la ciudad.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-amber-200 mb-10">
          <span className="flex items-center gap-2"><Clock size={16} /> Lun-Sab: 12:00 - 23:00</span>
          <span className="flex items-center gap-2"><MapPin size={16} /> Calle Principal 123</span>
          <span className="flex items-center gap-2"><Phone size={16} /> +1 234 567 890</span>
        </div>
        <a href="#reservar" className="inline-block px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/30">
          Reservar mesa
        </a>
      </div>
    </section>
  )
}
`

const menuItemTsx = `interface MenuItemProps {
  name: string
  description: string
  price: number
  popular?: boolean
  isNew?: boolean
}

export default function MenuItem({ name, description, price, popular, isNew }: MenuItemProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900">{name}</h3>
            {popular && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">Popular</span>
            )}
            {isNew && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Nuevo</span>
            )}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </div>
        <span className="text-lg font-bold text-amber-600 whitespace-nowrap">\${price.toFixed(2)}</span>
      </div>
    </div>
  )
}
`

const menuSectionTsx = `import { useState } from 'react'
import MenuItem from './MenuItem'
import { menuItems } from '../data/menu'

const categories = ['Entradas', 'Principales', 'Postres', 'Bebidas']

export default function MenuSection() {
  const [active, setActive] = useState('Entradas')
  const filtered = menuItems.filter(item => item.category === active)

  return (
    <section id="menu" className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Nuestro Menu</h2>
          <p className="text-gray-500">Platos preparados con los mejores ingredientes de la region</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={\`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors \${
                active === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <MenuItem key={item.id} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
`

const reservationFormTsx = `import { useState } from 'react'
import { Calendar, Clock, Users, Check } from 'lucide-react'

export default function ReservationForm() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ date: '', time: '', guests: '2', name: '', phone: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id="reservar" className="py-16 bg-white">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Reserva confirmada</h3>
          <p className="text-gray-500 text-sm">Te esperamos, {form.name}! Confirmaremos tu reserva por telefono.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="reservar" className="py-16 bg-white">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reserva tu mesa</h2>
          <p className="text-gray-500">Asegura tu lugar para una experiencia inolvidable</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Calendar size={14} /> Fecha
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Clock size={14} /> Hora
              </label>
              <select
                required
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              >
                <option value="">Seleccionar</option>
                {['12:00','13:00','14:00','15:00','19:00','20:00','21:00','22:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Users size={14} /> Personas
              </label>
              <select
                value={form.guests}
                onChange={e => setForm({ ...form, guests: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              >
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              required
              placeholder="Tu nombre"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
            <input
              type="tel"
              required
              placeholder="Tu telefono"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors">
            Confirmar reserva
          </button>
        </form>
      </div>
    </section>
  )
}
`

const aboutTsx = `import { Clock, MapPin, Phone, Mail } from 'lucide-react'

const schedule = [
  { day: 'Lunes - Viernes', hours: '12:00 - 23:00' },
  { day: 'Sabado', hours: '11:00 - 00:00' },
  { day: 'Domingo', hours: '11:00 - 22:00' },
]

export default function About() {
  return (
    <section id="sobre" className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestra historia</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Desde 2010, La Casa del Sabor ha sido un referente gastronomico en la ciudad. Nuestro chef y su equipo combinan tecnicas tradicionales con ingredientes locales de primera calidad para crear experiencias culinarias unicas.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Cada plato es una obra de arte que celebra la riqueza de nuestra cocina. Te invitamos a descubrir sabores autenticos en un ambiente calido y acogedor.
            </p>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-amber-600" /> Horarios
              </h3>
              <div className="space-y-2">
                {schedule.map(s => (
                  <div key={s.day} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{s.day}</span>
                    <span className="text-gray-900 font-medium">{s.hours}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Contacto</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><MapPin size={14} className="text-amber-600" /> Calle Principal 123, Centro</p>
                <p className="flex items-center gap-2"><Phone size={14} className="text-amber-600" /> +1 234 567 890</p>
                <p className="flex items-center gap-2"><Mail size={14} className="text-amber-600" /> reservas@lacasadelsabor.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
`

const footerTsx = `export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <span className="text-xl font-bold text-white">La Casa del Sabor</span>
        <p className="text-sm mt-2">Calle Principal 123, Centro | +1 234 567 890</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          {['Instagram', 'Facebook', 'TikTok'].map(s => (
            <a key={s} href="#" className="text-sm hover:text-white transition-colors">{s}</a>
          ))}
        </div>
        <p className="text-xs mt-6 text-gray-600">&copy; {new Date().getFullYear()} La Casa del Sabor. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
`

const menuData = `export const menuItems = [
  { id: 1, name: 'Bruschetta clasica', description: 'Pan tostado con tomate, albahaca fresca, ajo y aceite de oliva extra virgen', price: 8.50, category: 'Entradas', popular: true },
  { id: 2, name: 'Ceviche de pescado', description: 'Pescado fresco marinado en limon con cebolla morada, cilantro y aji', price: 12.00, category: 'Entradas' },
  { id: 3, name: 'Tabla de quesos artesanales', description: 'Seleccion de 5 quesos con frutos secos, miel y crackers', price: 15.00, category: 'Entradas' },
  { id: 4, name: 'Sopa de tomate asado', description: 'Tomates asados al horno con albahaca, crema y croutons', price: 9.00, category: 'Entradas', isNew: true },
  { id: 5, name: 'Filete de res al grill', description: 'Corte premium 300g con pure trufado, espárragos y salsa de vino tinto', price: 28.00, category: 'Principales', popular: true },
  { id: 6, name: 'Salmon al horno', description: 'Filete de salmon con costra de hierbas, risotto de limon y vegetales grillados', price: 24.00, category: 'Principales' },
  { id: 7, name: 'Pasta al pesto', description: 'Fettuccine con pesto de albahaca, piñones tostados y parmesano', price: 18.00, category: 'Principales' },
  { id: 8, name: 'Pollo relleno', description: 'Pechuga rellena de espinaca y queso de cabra con salsa de champinones', price: 20.00, category: 'Principales', isNew: true },
  { id: 9, name: 'Risotto de hongos', description: 'Arroz arborio cremoso con hongos silvestres y trufa negra', price: 22.00, category: 'Principales' },
  { id: 10, name: 'Tiramisu', description: 'Receta tradicional italiana con mascarpone, cafe espresso y cacao', price: 10.00, category: 'Postres', popular: true },
  { id: 11, name: 'Crème brûlée', description: 'Crema de vainilla con costra de azucar caramelizada', price: 9.00, category: 'Postres' },
  { id: 12, name: 'Brownie con helado', description: 'Brownie de chocolate negro tibio con helado de vainilla y salsa de caramelo', price: 11.00, category: 'Postres' },
  { id: 13, name: 'Limonada de la casa', description: 'Limonada natural con menta fresca y jengibre', price: 5.00, category: 'Bebidas' },
  { id: 14, name: 'Vino tinto reserva', description: 'Copa de Malbec reserva, Valle de Uco, Argentina', price: 8.00, category: 'Bebidas', popular: true },
  { id: 15, name: 'Mojito clasico', description: 'Ron blanco, limon, menta, azucar de cana y soda', price: 10.00, category: 'Bebidas' },
  { id: 16, name: 'Cafe espresso doble', description: 'Espresso doble de granos tostados artesanalmente', price: 4.00, category: 'Bebidas' },
]
`

export function getRestaurantFiles(): FileSystemTree {
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
            'Hero.tsx': { file: { contents: heroTsx } },
            'MenuItem.tsx': { file: { contents: menuItemTsx } },
            'MenuSection.tsx': { file: { contents: menuSectionTsx } },
            'ReservationForm.tsx': { file: { contents: reservationFormTsx } },
            'About.tsx': { file: { contents: aboutTsx } },
            'Footer.tsx': { file: { contents: footerTsx } },
          },
        },
        data: {
          directory: {
            'menu.ts': { file: { contents: menuData } },
          },
        },
      },
    },
  }
}
