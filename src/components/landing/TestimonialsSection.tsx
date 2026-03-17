import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const testimonials = [
  {
    quote: 'Reemplazamos varias herramientas con Plury. En una semana teniamos marca, landing y campana listas.',
    name: 'Sofia Ramirez',
    role: 'CEO, Studio Digital',
    avatar: 'S',
    color: 'from-[#a78bfa] to-[#a78bfa]',
    metric: '3x mas rapido',
  },
  {
    quote: 'Antes resolvia branding por un lado y producto por otro. Aqui pude bajar la idea completa en una sola plataforma.',
    name: 'Carlos Mendez',
    role: 'Founder, TechStartup MX',
    avatar: 'C',
    color: 'from-blue-400 to-cyan-500',
    metric: '$8K ahorrados/mes',
  },
  {
    quote: 'La marca blanca nos ordeno la operacion. Ahora presentamos proyectos mas completos sin multiplicar el equipo.',
    name: 'Ana Torres',
    role: 'Directora, Agencia Bloom',
    avatar: 'A',
    color: 'from-emerald-400 to-green-500',
    metric: '40+ proyectos entregados',
  },
  {
    quote: 'Pedi una idea de negocio y Plury me devolvio mensajes, web y estructura inicial para salir a probar.',
    name: 'Miguel Herrera',
    role: 'E-commerce Manager',
    avatar: 'M',
    color: 'from-amber-400 to-orange-500',
    metric: '15 min a primera version',
  },
  {
    quote: 'Lo mejor no es solo la velocidad. Es que todo tiene continuidad entre branding, contenido y ejecucion.',
    name: 'Laura Diaz',
    role: 'Marketing Lead, SaaSCo',
    avatar: 'L',
    color: 'from-pink-400 to-rose-500',
    metric: '+180% trafico organico',
  },
  {
    quote: 'Cuando un proyecto se puso tecnico, pedimos senior y se resolvio sin perder el hilo de lo que ya estaba construido.',
    name: 'Diego Navarro',
    role: 'Growth, FinApp',
    avatar: 'D',
    color: 'from-[#a78bfa] to-[#a78bfa]',
    metric: '5x velocidad de entrega',
  },
]

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.test-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%', scroller: '#landing-scroll' },
    })

    return () => { anim.kill() }
  }, [])

  return (
    <section ref={sectionRef} className="py-20 sm:py-28 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="test-anim text-center mb-14">
          <p className="text-[12px] text-[#a78bfa] uppercase tracking-[0.15em] font-semibold mb-3">Resultados</p>
          <h2 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.03em] text-white mb-4">
            Lo que cambia
            <br />
            cuando usas Plury
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.name} className="test-anim bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
              <div className="inline-flex px-2.5 py-1 text-[11px] font-bold text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/15 rounded-full mb-4">
                {t.metric}
              </div>

              <p className="text-[14px] text-zinc-300 leading-[1.7] mb-5">"{t.quote}"</p>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-[11px] font-bold text-white`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{t.name}</p>
                  <p className="text-[11px] text-zinc-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection
