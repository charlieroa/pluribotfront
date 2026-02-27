/**
 * SaaS/Startup Landing template — Navbar, Hero, Features, HowItWorks, Pricing toggle, FAQ accordion, CTA, Footer.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  )
}
`

const navbarTsx = `import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

const links = [
  { label: 'Caracteristicas', href: '#features' },
  { label: 'Como funciona', href: '#how' },
  { label: 'Precios', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          SaaSPro
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Iniciar sesion
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Comenzar gratis
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600">
              {l.label}
            </a>
          ))}
          <button className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg">
            Comenzar gratis
          </button>
        </div>
      )}
    </nav>
  )
}
`

const heroTsx = `import { ArrowRight, Play } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
      <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-6">
            Nuevo: Integraciones con IA disponibles
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Gestiona tu negocio{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              sin complicaciones
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            Automatiza procesos, colabora en tiempo real y escala tu equipo con la plataforma todo-en-uno que las startups aman.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25">
              Comenzar gratis <ArrowRight size={16} />
            </button>
            <button className="flex items-center gap-2 px-6 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors">
              <Play size={16} className="text-blue-600" /> Ver demo
            </button>
          </div>
        </div>

        {/* App mockup */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-2 shadow-2xl shadow-blue-500/10">
            <div className="rounded-xl bg-gray-900 p-1">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="rounded-lg bg-gradient-to-br from-blue-600/20 to-cyan-600/10 h-64 md:h-80 flex items-center justify-center">
                <span className="text-gray-500 text-sm">Vista previa de la plataforma</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
`

const featuresTsx = `import { BarChart3, Shield, Zap, Globe, Users, Layers } from 'lucide-react'

const features = [
  { icon: Zap, title: 'Ultra rapido', desc: 'Rendimiento optimizado con respuestas en milisegundos para tu equipo.' },
  { icon: Shield, title: 'Seguridad avanzada', desc: 'Encriptacion de extremo a extremo y cumplimiento SOC 2 Type II.' },
  { icon: BarChart3, title: 'Analiticas en tiempo real', desc: 'Dashboards personalizables con metricas que realmente importan.' },
  { icon: Globe, title: 'Multi-idioma', desc: 'Disponible en 12 idiomas con soporte para equipos globales.' },
  { icon: Users, title: 'Colaboracion', desc: 'Trabaja con tu equipo en tiempo real sin fricciones ni conflictos.' },
  { icon: Layers, title: 'Integraciones', desc: 'Conecta con Slack, Notion, GitHub, Figma y 50+ herramientas mas.' },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Todo lo que tu equipo necesita</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Herramientas potentes en una sola plataforma.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <f.icon size={22} className="text-blue-600" />
              </div>
              <h3 className="text-base font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`

const howItWorksTsx = `import { UserPlus, Settings, Rocket } from 'lucide-react'

const steps = [
  { icon: UserPlus, num: '01', title: 'Crea tu cuenta', desc: 'Registrate gratis en 30 segundos. Sin tarjeta de credito.' },
  { icon: Settings, num: '02', title: 'Configura tu equipo', desc: 'Invita a tu equipo y personaliza el espacio de trabajo.' },
  { icon: Rocket, num: '03', title: 'Lanza y escala', desc: 'Empieza a gestionar proyectos y escala sin limites.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Como funciona</h2>
          <p className="text-gray-500">Tres pasos simples para transformar tu productividad.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-blue-300 to-transparent" />
              )}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border-2 border-blue-100 mb-5 shadow-sm">
                <s.icon size={28} className="text-blue-600" />
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {s.num}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`

const pricingTsx = `import { useState } from 'react'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    monthlyPrice: 9,
    yearlyPrice: 7,
    desc: 'Para emprendedores y freelancers.',
    features: ['3 usuarios', '10 proyectos', 'Soporte email', 'Analiticas basicas', '1 GB almacenamiento'],
    popular: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 24,
    desc: 'Para equipos en crecimiento.',
    features: ['15 usuarios', 'Proyectos ilimitados', 'Soporte prioritario', 'Analiticas avanzadas', '25 GB almacenamiento', 'Integraciones'],
    popular: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 79,
    yearlyPrice: 66,
    desc: 'Para empresas que necesitan escala.',
    features: ['Usuarios ilimitados', 'Todo del plan Pro', 'SLA 99.9%', 'Gerente dedicado', 'API personalizada', 'Onboarding', 'SSO / SAML'],
    popular: false,
  },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Precios transparentes</h2>
          <p className="text-gray-500 mb-6">Sin sorpresas. Cancela cuando quieras.</p>
          <div className="inline-flex items-center gap-3 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setAnnual(false)}
              className={\`px-4 py-2 text-sm font-medium rounded-md transition-colors \${!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}\`}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={\`px-4 py-2 text-sm font-medium rounded-md transition-colors \${annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}\`}
            >
              Anual <span className="text-blue-600 text-xs font-bold ml-1">-17%</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map(p => (
            <div
              key={p.name}
              className={\`rounded-2xl p-7 transition-all \${
                p.popular
                  ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 scale-105'
                  : 'bg-white border border-gray-200'
              }\`}
            >
              {p.popular && (
                <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full mb-4">
                  Mas popular
                </span>
              )}
              <h3 className={\`text-lg font-bold \${p.popular ? '' : 'text-gray-900'}\`}>{p.name}</h3>
              <p className={\`text-sm mt-1 \${p.popular ? 'text-blue-200' : 'text-gray-500'}\`}>{p.desc}</p>
              <div className="mt-5 mb-6">
                <span className="text-4xl font-extrabold">\${annual ? p.yearlyPrice : p.monthlyPrice}</span>
                <span className={\`text-sm \${p.popular ? 'text-blue-200' : 'text-gray-400'}\`}>/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={16} className={p.popular ? 'text-blue-200' : 'text-blue-600'} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={\`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors \${
                p.popular
                  ? 'bg-white text-blue-600 hover:bg-blue-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
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

const faqTsx = `import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  { q: 'Puedo probar gratis antes de pagar?', a: 'Si, ofrecemos 14 dias de prueba gratuita en todos los planes. No necesitas tarjeta de credito para empezar.' },
  { q: 'Como funciona la facturacion anual?', a: 'Al elegir el plan anual obtienes un 17% de descuento. Se cobra un solo pago al inicio del periodo.' },
  { q: 'Puedo cambiar de plan en cualquier momento?', a: 'Absolutamente. Puedes subir o bajar de plan cuando quieras. El cambio se aplica de inmediato y se prorratea.' },
  { q: 'Mis datos estan seguros?', a: 'Usamos encriptacion AES-256 en reposo y TLS 1.3 en transito. Cumplimos con SOC 2 Type II y GDPR.' },
  { q: 'Ofrecen soporte en espanol?', a: 'Si, todo nuestro equipo de soporte habla espanol. Respondemos en menos de 2 horas en dias habiles.' },
  { q: 'Que integraciones soportan?', a: 'Nos integramos con Slack, Notion, GitHub, Figma, Google Workspace, Jira, Linear y 50+ herramientas mas.' },
]

export default function FAQ() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Preguntas frecuentes</h2>
          <p className="text-gray-500">Todo lo que necesitas saber sobre SaaSPro.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setActive(active === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={\`text-gray-400 transition-transform \${active === i ? 'rotate-180' : ''}\`}
                />
              </button>
              {active === i && (
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`

const footerTsx = `import { Zap } from 'lucide-react'

export default function Footer() {
  const columns = [
    { title: 'Producto', links: ['Caracteristicas', 'Precios', 'Integraciones', 'Changelog', 'API'] },
    { title: 'Empresa', links: ['Sobre nosotros', 'Blog', 'Carreras', 'Prensa'] },
    { title: 'Legal', links: ['Privacidad', 'Terminos', 'Cookies', 'SLA'] },
  ]

  return (
    <footer className="bg-gray-900 text-gray-400 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* CTA banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 md:p-12 text-center text-white mb-14">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Listo para empezar?</h2>
          <p className="text-blue-100 mb-6">Unete a 10,000+ equipos que ya confian en SaaSPro.</p>
          <button className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors">
            Crear cuenta gratis
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">SaaSPro</span>
            </div>
            <p className="text-sm leading-relaxed">La plataforma todo-en-uno para equipos modernos.</p>
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
          &copy; {new Date().getFullYear()} SaaSPro. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
`

export function getSaasFiles(): FileSystemTree {
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
            'HowItWorks.tsx': { file: { contents: howItWorksTsx } },
            'Pricing.tsx': { file: { contents: pricingTsx } },
            'FAQ.tsx': { file: { contents: faqTsx } },
            'Footer.tsx': { file: { contents: footerTsx } },
          },
        },
      },
    },
  }
}
