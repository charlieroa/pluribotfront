const columns = [
  {
    title: 'Producto',
    links: ['Soluciones', 'Precios', 'Plantillas', 'Changelog', 'Status'],
  },
  {
    title: 'Recursos',
    links: ['Blog', 'Documentacion', 'Guias', 'API'],
  },
  {
    title: 'Empresa',
    links: ['Acerca de', 'Agencias', 'Enterprise', 'Contacto'],
  },
  {
    title: 'Legal',
    links: ['Privacidad', 'Terminos', 'Cookies'],
  },
  {
    title: 'Comunidad',
    links: ['Discord', 'X / Twitter', 'LinkedIn', 'YouTube'],
  },
]

const LandingFooter = () => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#09090b]">
      <div className="max-w-[1100px] mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-14">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo-light.png" alt="Plury" className="h-14" />
            </div>
            <p className="text-[12.5px] text-zinc-600 leading-[1.6] max-w-[200px]">
              Tu equipo creativo con IA. De la idea al producto en minutos.
            </p>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.1em] mb-3.5">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link}>
                    <span className="text-[12.5px] text-zinc-600 hover:text-white transition-colors cursor-pointer">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.06]">
          <p className="text-[11px] text-zinc-700">&copy; {new Date().getFullYear()} Plury. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-zinc-700 hover:text-zinc-400 cursor-pointer transition-colors">Privacidad</span>
            <span className="text-[11px] text-zinc-700 hover:text-zinc-400 cursor-pointer transition-colors">Terminos</span>
            <span className="text-[11px] text-zinc-700 hover:text-zinc-400 cursor-pointer transition-colors">Status</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
