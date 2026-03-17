const companies = [
  'Startups', 'Agencias', 'E-commerce', 'SaaS', 'Freelancers',
  'Consultoras', 'Restaurantes', 'Clinicas', 'Inmobiliarias', 'Coaches',
]

const CompaniesBar = () => {
  return (
    <section className="py-8 border-y border-white/[0.04]">
      <div className="max-w-[1100px] mx-auto px-6">
        <p className="text-[11px] text-zinc-600 uppercase tracking-[0.15em] font-medium mb-6 text-center">
          Una sola plataforma para lanzar proyectos digitales en <span className="text-[#43f1f2]">muchos tipos de negocio</span>
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3">
          {companies.map(name => (
            <span key={name} className="text-[14px] font-semibold text-white/25 tracking-wide">{name}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CompaniesBar
