/**
 * Landing page template — Navbar, Hero, Features, Pricing, Testimonials, CTA, Footer.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900 scroll-smooth">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
`

const navbarTsx = `import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Caracteristicas', href: '#features' },
  { label: 'Precios', href: '#pricing' },
  { label: 'Testimonios', href: '#testimonials' },
  { label: 'Contacto', href: '#cta' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#hero" className="text-xl font-bold text-indigo-600">MiMarca</a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              {l.label}
            </a>
          ))}
          <a href="#cta" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            Empezar
          </a>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-indigo-600">
              {l.label}
            </a>
          ))}
          <a href="#cta" onClick={() => setOpen(false)} className="block px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg text-center">
            Empezar
          </a>
        </div>
      )}
    </nav>
  )
}
`

const heroTsx = `import { ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
      <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-6">
          Nuevo: Version 2.0 disponible
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
          La solucion que tu<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            negocio necesita
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Automatiza procesos, aumenta ventas y gestiona todo desde un solo lugar. Simple, rapido y poderoso.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#cta" className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25">
            Comenzar gratis <ArrowRight size={16} />
          </a>
          <a href="#features" className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            Ver caracteristicas
          </a>
        </div>
      </div>
    </section>
  )
}
`

const featuresTsx = `import { Zap, Shield, BarChart3, Globe, Clock, Users } from 'lucide-react'

const features = [
  { icon: Zap, title: 'Ultra rapido', desc: 'Rendimiento optimizado para que todo funcione al instante.' },
  { icon: Shield, title: 'Seguro', desc: 'Encriptacion de datos y proteccion avanzada incluida.' },
  { icon: BarChart3, title: 'Analiticas', desc: 'Dashboards en tiempo real con metricas que importan.' },
  { icon: Globe, title: 'Global', desc: 'Disponible en multiples idiomas y regiones.' },
  { icon: Clock, title: '24/7', desc: 'Soporte disponible las 24 horas, los 7 dias.' },
  { icon: Users, title: 'Colaborativo', desc: 'Trabaja con tu equipo en tiempo real sin fricciones.' },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Todo lo que necesitas</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Herramientas potentes para hacer crecer tu negocio sin complicaciones.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(f => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                <f.icon size={22} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`

const pricingTsx = `import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Basico',
    price: '$9',
    period: '/mes',
    desc: 'Para emprendedores que inician.',
    features: ['1 usuario', '5 proyectos', 'Soporte email', 'Analiticas basicas'],
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mes',
    desc: 'Para negocios en crecimiento.',
    features: ['10 usuarios', 'Proyectos ilimitados', 'Soporte prioritario', 'Analiticas avanzadas', 'Integraciones'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/mes',
    desc: 'Para empresas con grandes necesidades.',
    features: ['Usuarios ilimitados', 'Todo del plan Pro', 'SLA garantizado', 'Gerente de cuenta dedicado', 'API personalizada', 'Onboarding'],
    popular: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Precios simples</h2>
          <p className="text-gray-500">Sin sorpresas. Cancela cuando quieras.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {plans.map(p => (
            <div
              key={p.name}
              className={\`rounded-2xl p-7 \${p.popular ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20 scale-105' : 'bg-white border border-gray-200'}\`}
            >
              {p.popular && (
                <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full mb-4">
                  Mas popular
                </span>
              )}
              <h3 className={\`text-lg font-bold \${p.popular ? 'text-white' : 'text-gray-900'}\`}>{p.name}</h3>
              <p className={\`text-sm mt-1 \${p.popular ? 'text-indigo-200' : 'text-gray-500'}\`}>{p.desc}</p>
              <div className="mt-5 mb-6">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className={\`text-sm \${p.popular ? 'text-indigo-200' : 'text-gray-400'}\`}>{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={16} className={p.popular ? 'text-indigo-200' : 'text-indigo-600'} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={\`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors \${
                p.popular
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }\`}>
                Elegir plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`

const testimonialsTsx = `const testimonials = [
  { name: 'Maria Lopez', role: 'CEO, TechStart', quote: 'Increible plataforma. Nos ayudo a triplicar nuestras ventas en 3 meses.' },
  { name: 'Carlos Garcia', role: 'Fundador, CreativeHub', quote: 'La facilidad de uso es impresionante. Todo mi equipo lo adopto de inmediato.' },
  { name: 'Ana Torres', role: 'CMO, GrowthCo', quote: 'Las analiticas son exactamente lo que necesitabamos para tomar mejores decisiones.' },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Lo que dicen nuestros clientes</h2>
          <p className="text-gray-500">Miles de negocios confian en nosotros.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map(t => (
            <div key={t.name} className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-600 leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`

const ctaTsx = `import { ArrowRight } from 'lucide-react'

export default function CTA() {
  return (
    <section id="cta" className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-10 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Listo para empezar?</h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
            Unete a miles de negocios que ya estan creciendo con nuestra plataforma.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors">
              Crear cuenta gratis <ArrowRight size={16} />
            </button>
            <button className="px-6 py-3 text-white font-semibold border border-white/30 rounded-lg hover:bg-white/10 transition-colors">
              Contactar ventas
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
`

const footerTsx = `export default function Footer() {
  const columns = [
    { title: 'Producto', links: ['Caracteristicas', 'Precios', 'Integraciones', 'Changelog'] },
    { title: 'Empresa', links: ['Sobre nosotros', 'Blog', 'Carreras', 'Prensa'] },
    { title: 'Soporte', links: ['Centro de ayuda', 'Documentacion', 'Contacto', 'Estado'] },
    { title: 'Legal', links: ['Privacidad', 'Terminos', 'Cookies', 'Licencias'] },
  ]

  return (
    <footer className="bg-gray-900 text-gray-400 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-bold text-white">MiMarca</span>
            <p className="text-sm mt-3 leading-relaxed">La solucion que tu negocio necesita para crecer.</p>
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
        <div className="border-t border-gray-800 pt-8 text-center text-xs">
          &copy; {new Date().getFullYear()} MiMarca. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
`

export function getLandingFiles(): FileSystemTree {
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
            'Navbar.tsx': { file: { contents: navbarTsx } },
            'Hero.tsx': { file: { contents: heroTsx } },
            'Features.tsx': { file: { contents: featuresTsx } },
            'Pricing.tsx': { file: { contents: pricingTsx } },
            'Testimonials.tsx': { file: { contents: testimonialsTsx } },
            'CTA.tsx': { file: { contents: ctaTsx } },
            'Footer.tsx': { file: { contents: footerTsx } },
          },
        },
      },
    },
  }
}
