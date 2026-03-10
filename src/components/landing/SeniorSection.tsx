import { useEffect, useRef } from 'react'
import { Bot, Users, CheckCircle, ArrowRight, Clock, Shield, Check, Code2, Image } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface SeniorSectionProps {
  onRegister: () => void
}

const SeniorSection = ({ onRegister }: SeniorSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('.senior-anim')
    const anim = gsap.fromTo(items, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 75%', scroller: '#landing-scroll' },
    })

    // Floating cards — staggered entrance + continuous float
    const floats = el.querySelectorAll('.float-card')
    const floatEntrance = gsap.fromTo(floats,
      { opacity: 0, y: 30, scale: 0.85 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7, stagger: 0.3, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: mockupRef.current, start: 'top 65%', scroller: '#landing-scroll' },
        onComplete: () => {
          // After entrance, start floating animation on each card
          floats.forEach((card, i) => {
            gsap.to(card, {
              y: 'random(-14, 14)',
              x: 'random(-8, 8)',
              rotation: 'random(-2, 2)',
              duration: 'random(3, 5)',
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              delay: i * 0.4,
            })
          })
        },
      }
    )

    return () => {
      anim.kill()
      floatEntrance.kill()
      gsap.killTweensOf(floats)
    }
  }, [])

  return (
    <section ref={sectionRef} id="seniors" className="py-20 sm:py-28 px-4">
      <div className="max-w-[1100px] mx-auto">
        {/* Section title - centered above the card */}
        <div className="senior-anim text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full uppercase tracking-wider mb-4">
            Exclusivo de Plury
          </span>
          <h2 className="text-[32px] sm:text-[44px] md:text-[52px] font-bold tracking-[-0.04em] text-white mb-4 leading-[1.05]">
            Cuando la IA se estanca,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              un humano toma el control.
            </span>
          </h2>
          <p className="text-[16px] sm:text-[18px] text-zinc-400 max-w-xl mx-auto leading-[1.7]">
            Seniors reales — developers, disenadores y estrategas — revisan, ajustan y entregan lo que la IA no pudo. Sin perder contexto. En 24-48 horas.
          </p>
        </div>

        {/* Main content card */}
        <div className="senior-anim relative bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 md:p-12 overflow-hidden">
          {/* Background accents */}
          <div className="absolute left-0 top-0 w-1/3 h-full bg-gradient-to-r from-blue-900/10 to-transparent pointer-events-none" />
          <div className="absolute right-0 bottom-0 w-1/3 h-full bg-gradient-to-l from-purple-900/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start gap-10 lg:gap-12">
            {/* Right — conversation mockup */}
            <div ref={mockupRef} className="w-full lg:w-[55%] senior-anim order-2 lg:order-2">
              <div className="relative">
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <span className="ml-2 text-[11px] text-zinc-600 font-medium">E-commerce — Tienda de ropa</span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {/* User message */}
                    <div className="flex items-start gap-2 justify-end">
                      <div className="bg-[#a78bfa]/20 border border-[#a78bfa]/20 rounded-2xl rounded-tr-sm px-3 py-2 text-[11.5px] text-zinc-200 leading-[1.55] max-w-[82%]">
                        E-commerce con carrito, Stripe y login Google
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#a78bfa] flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">T</div>
                    </div>

                    {/* Bot — completed tasks */}
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Bot size={12} className="text-white" />
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-3 py-2 text-[11.5px] text-zinc-400 leading-[1.55] max-w-[82%]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400"><Check size={10} /> Catalogo con filtros</div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400"><Check size={10} /> Carrito + checkout</div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400"><Check size={10} /> Login Google OAuth</div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400"><Check size={10} /> Deploy en tu-tienda.plury.co</div>
                        </div>
                      </div>
                    </div>

                    {/* Bot — flag */}
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Bot size={12} className="text-white" />
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-3 py-2 text-[11.5px] text-zinc-300 leading-[1.55] max-w-[82%]">
                        <div className="flex items-center gap-1.5 text-amber-400 text-[10.5px] font-semibold mb-1">
                          <Shield size={11} /> Requiere intervencion
                        </div>
                        Stripe necesita webhooks y 3D Secure. Recomiendo senior.
                      </div>
                    </div>

                    {/* CTA button */}
                    <div className="pl-8">
                      <div className="bg-white text-black font-semibold rounded-xl text-[11.5px] py-2 px-3.5 flex justify-between items-center">
                        Solicitar intervencion humana
                        <Users size={13} />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-zinc-800" />
                      <span className="text-[9.5px] text-blue-400/70 font-medium">Senior asignado</span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>

                    {/* Senior delivers */}
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">JD</div>
                      <div className="bg-blue-500/10 border border-blue-500/15 rounded-2xl rounded-tl-sm px-3 py-2 text-[11.5px] text-zinc-300 leading-[1.55] max-w-[82%]">
                        <div className="text-blue-400 text-[10.5px] font-semibold mb-1">Juan D. · Senior Dev</div>
                        Stripe listo:
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400"><Check size={10} /> Webhooks + 3D Secure</div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400"><Check size={10} /> Reembolsos y confirmaciones</div>
                        </div>
                      </div>
                    </div>

                    {/* Completed */}
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center flex-shrink-0">
                        <Check size={11} className="text-white" />
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl rounded-tl-sm px-3 py-2 text-[11.5px] text-emerald-300 leading-[1.55] max-w-[82%]">
                        <span className="font-semibold">Completada</span> — Entregado en 14h. Pagos funcionales.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating team cards — animated entrance + continuous floating */}
                <div
                  className="float-card absolute -bottom-5 -right-2 sm:-right-6 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 p-3 rounded-2xl shadow-2xl shadow-black/60 flex items-center gap-3 z-20"
                  style={{ opacity: 0 }}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Code2 size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white flex items-center gap-1.5">
                      Juan D.
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </p>
                    <p className="text-[10px] text-zinc-400">Senior Dev · Stripe, APIs, Node</p>
                  </div>
                </div>

                <div
                  className="float-card absolute -top-5 -right-2 sm:-right-5 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 p-3 rounded-2xl shadow-2xl shadow-black/60 flex items-center gap-3 z-20"
                  style={{ opacity: 0 }}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                    <Image size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white flex items-center gap-1.5">
                      Maria C.
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </p>
                    <p className="text-[10px] text-zinc-400">Senior Designer · UI/UX, Figma</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Left — copy + tiers */}
            <div className="w-full lg:w-[45%] order-1 lg:order-1">
              {/* Features list */}
              <div className="senior-anim space-y-5 border-l-2 border-zinc-800 pl-5 mb-10">
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-1 text-[14.5px]">
                    <CheckCircle size={16} className="text-emerald-400" /> Revision Senior (24-48h)
                  </h4>
                  <p className="text-[13px] text-zinc-500 leading-[1.6]">Un desarrollador, disenador o marketer humano toma el contexto de tu prompt y lo ajusta a mano.</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-1 text-[14.5px]">
                    <CheckCircle size={16} className="text-emerald-400" /> Sin perdida de contexto
                  </h4>
                  <p className="text-[13px] text-zinc-500 leading-[1.6]">El humano ve exactamente lo que la IA intento hacer. No tienes que volver a explicar nada.</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-1 text-[14.5px]">
                    <CheckCircle size={16} className="text-emerald-400" /> Especialistas reales
                  </h4>
                  <p className="text-[13px] text-zinc-500 leading-[1.6]">Developers, disenadores, estrategas SEO, ads y branding. Cada tarea va al experto correcto.</p>
                </div>
              </div>

              {/* Senior Tiers */}
              <div className="senior-anim grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { name: 'Basico', price: '$149', sla: '48h', tasks: '1 tarea' },
                  { name: 'Pro', price: '$349', sla: '24h', tasks: '2 tareas', popular: true },
                  { name: 'Dedicado', price: '$799', sla: '24h', tasks: '5 tareas' },
                ].map((tier, i) => (
                  <div key={i} className={`relative rounded-xl p-3.5 text-center ${tier.popular ? 'bg-[#a78bfa]/[0.08] border border-[#a78bfa]/20' : 'bg-white/[0.03] border border-white/[0.06]'}`}>
                    {tier.popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#a78bfa] bg-[#a78bfa]/20 px-2 py-0.5 rounded-full uppercase">Popular</span>}
                    <p className="text-[12px] font-semibold text-white">{tier.name}</p>
                    <p className="text-[20px] font-bold text-white tracking-[-0.02em]">{tier.price}<span className="text-[10px] text-zinc-500 font-normal">/mes</span></p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Clock size={10} className="text-zinc-500" />
                      <span className="text-[10px] text-zinc-500">SLA {tier.sla} · {tier.tasks}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={onRegister}
                className="senior-anim inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-white bg-[#8b5cf6] rounded-full hover:bg-[#7c3aed] transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Activar Senior <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SeniorSection
