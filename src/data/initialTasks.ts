import type { KanbanTask } from '../types'

// Helper to generate realistic dates relative to now
const now = new Date()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()
const daysAgo = (d: number, hour = 14, min = 30) => {
  const date = new Date(now)
  date.setDate(date.getDate() - d)
  date.setHours(hour, min, 0, 0)
  return date.toISOString()
}

export const initialTasks: KanbanTask[] = [
  {
    id: 'task-1',
    title: 'Analisis de Palabras Clave',
    agent: 'Lupa',
    status: 'done',
    botType: 'seo',
    createdAt: daysAgo(2, 10, 15),
    deliverable: {
      id: 'd-1',
      title: 'Analisis de Palabras Clave',
      type: 'report',
      agent: 'Lupa',
      botType: 'seo',
      content: `## Analisis de Palabras Clave

### Keywords Principales (Alta Intencion)
- "software agendamiento salon belleza" — Vol: 1.2K/mes — Dificultad: 38
- "app citas peluqueria" — Vol: 880/mes — Dificultad: 42
- "sistema reservas salon" — Vol: 720/mes — Dificultad: 35

### Keywords Long Tail
- "mejor app para agendar citas en salon" — Vol: 320/mes — Dificultad: 18
- "software gratis para salones de belleza" — Vol: 540/mes — Dificultad: 24
- "como gestionar citas en mi peluqueria" — Vol: 210/mes — Dificultad: 12

### Competidores Analizados
1. **Reservio** — DA 58 — Keyword gap: 34 terminos
2. **Booksy** — DA 62 — Keyword gap: 28 terminos
3. **SimplyBook** — DA 45 — Keyword gap: 41 terminos

### Recomendaciones
1. Priorizar "software agendamiento salon belleza" como keyword principal
2. Crear cluster de contenido alrededor de "citas" y "reservas"
3. Landing page optimizada para "app citas peluqueria"
4. Blog posts atacando long tail de baja dificultad

**Score general: 87/100** — Buen potencial de posicionamiento`,
    },
  },
  {
    id: 'task-2',
    title: 'Landing Page Salon de Belleza',
    agent: 'Pixel',
    status: 'doing',
    botType: 'web',
    createdAt: daysAgo(1, 9, 45),
    deliverable: {
      id: 'd-2',
      title: 'Wireframes Landing Page',
      type: 'design',
      agent: 'Pixel',
      botType: 'web',
      content: `## Wireframes Landing Page

### Estructura de Secciones
1. **Hero Section** — Headline + CTA principal + Mockup de la app
2. **Social Proof** — Logos de clientes + cifra de salones activos
3. **Features** — 3 columnas con beneficios clave
4. **Como Funciona** — 3 pasos ilustrados
5. **Testimonios** — Carousel de resenas verificadas
6. **Pricing** — 2 planes (Free / Pro)
7. **FAQ** — Preguntas frecuentes colapsables
8. **Footer** — Links + Newsletter + Redes sociales

### Paleta de Colores
- Primario: #7C3AED (violeta)
- Secundario: #F59E0B (amber)
- Fondo: #FAFAFA
- Texto: #1E293B

### Progreso
- [x] Estructura de secciones definida
- [x] Hero section disenada
- [x] Social proof maquetada
- [ ] Seccion de features
- [ ] Testimonios y carousel
- [ ] Responsive mobile
- [ ] Revision final

**Avance: 45%**`,
    },
  },
  {
    id: 'task-3',
    title: 'Configurar Google Ads',
    agent: 'Metric',
    status: 'todo',
    botType: 'ads',
    createdAt: hoursAgo(5),
  },
  {
    id: 'task-4',
    title: 'Integracion API Pagos',
    agent: 'Logic',
    status: 'todo',
    botType: 'dev',
    createdAt: hoursAgo(3),
  },
  {
    id: 'task-5',
    title: 'Auditoria de Backlinks',
    agent: 'Lupa',
    status: 'doing',
    botType: 'seo',
    createdAt: daysAgo(1, 14, 0),
    deliverable: {
      id: 'd-5',
      title: 'Auditoria de Backlinks',
      type: 'report',
      agent: 'Lupa',
      botType: 'seo',
      content: `## Auditoria de Backlinks

### Perfil Actual
- Total backlinks: 234
- Dominios unicos: 67
- DA promedio: 28
- Ratio DoFollow/NoFollow: 72% / 28%

### Top Backlinks
| Dominio | DA | Tipo |
|---|---|---|
| beauty-tips.com | 45 | DoFollow |
| salon-guide.blog | 38 | DoFollow |
| directorio-spa.com | 32 | NoFollow |
| belleza-pro.net | 29 | DoFollow |

### Backlinks Toxicos (Pendiente Limpieza)
- spam-links.xyz — DA 2 — Disavow pendiente
- cheap-seo.net — DA 5 — Disavow pendiente
- link-farm-42.com — DA 1 — Disavow pendiente

### Oportunidades de Link Building
1. Guest post en beautybiz.com (DA 52)
2. Mencion en guia de herramientas SaaS (DA 48)
3. Directorio de software para salones (DA 35)
4. Colaboracion con influencer de belleza (DA 41)

**Avance: 60%**`,
    },
  },
  {
    id: 'task-6',
    title: 'Copys para Meta Ads',
    agent: 'Metric',
    status: 'done',
    botType: 'ads',
    createdAt: daysAgo(3, 16, 20),
    deliverable: {
      id: 'd-6',
      title: 'Copys para Meta Ads',
      type: 'copy',
      agent: 'Metric',
      botType: 'ads',
      content: `## Copys para Meta Ads

### Variante A — Beneficio Directo
**Headline:** Llena tu agenda sin levantar el telefono
**Body:** Tu salon merece clientes que llegan solos. Con nuestra app, tus clientes agendan 24/7 desde su celular. Prueba gratis 14 dias.
**CTA:** Empieza Gratis

### Variante B — Pain Point
**Headline:** Cansada de las cancelaciones de ultimo momento?
**Body:** Reduce un 60% las inasistencias con recordatorios automaticos por WhatsApp. Mas de 500 salones ya lo usan.
**CTA:** Quiero Probarlo

### Variante C — Social Proof
**Headline:** 500+ salones ya gestionan sus citas con nosotros
**Body:** Unete a la comunidad de profesionales de belleza que ahorra 10+ horas semanales en gestion de agenda.
**CTA:** Ver Demo

### Segmentacion Recomendada
- **Audiencia:** Mujeres 28-55, duenas de salones de belleza
- **Ubicacion:** Colombia, Mexico, Argentina
- **Intereses:** Administracion de negocios, Belleza, Emprendimiento
- **Presupuesto sugerido:** $15-25 USD/dia por variante

**Recomendacion:** Testear A y B en split test 50/50 durante 7 dias antes de escalar`,
    },
  },
  {
    id: 'task-7',
    title: 'Setup Analytics & Tag Manager',
    agent: 'Logic',
    status: 'done',
    botType: 'dev',
    createdAt: hoursAgo(1),
    deliverable: {
      id: 'd-7',
      title: 'Setup Analytics & Tag Manager',
      type: 'code',
      agent: 'Logic',
      botType: 'dev',
      content: `## Setup Analytics & Tag Manager

### Google Analytics 4 — Configurado
- Propiedad migrada de UA a GA4
- Stream de datos web activo
- Eventos personalizados configurados:
  - booking_started
  - booking_completed
  - page_view (enhanced measurement)
  - scroll_depth
  - click_whatsapp

### Google Tag Manager — Activo
- Container: GTM-XXXXXXX
- Tags activos: 8
- Triggers configurados: 12
- Variables custom: 6

### Conversiones Configuradas
1. **Reserva completada** -> Meta Pixel + GA4 + Google Ads
2. **Click en WhatsApp** -> GA4 evento personalizado
3. **Formulario de contacto** -> GA4 + Google Ads
4. **Scroll 75%** -> GA4 engagement

### Snippet de Verificacion
- [x] GTM instalado en head
- [x] GA4 recibiendo datos
- [x] Meta Pixel disparando eventos
- [x] Google Ads tag verificado
- [x] Conversiones de prueba validadas

**Estado: Produccion** — Datos fluyendo correctamente desde hace 48h`,
    },
  },
]
