function buttonExample() {
    return `// src/components/ui/Button.jsx
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-zinc-950 text-white hover:bg-zinc-800',
        secondary: 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200',
        outline: 'border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50',
        ghost: 'text-zinc-700 hover:bg-zinc-100',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-5',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export default function Button({ className = '', variant, size, ...props }) {
  return <button className={twMerge(buttonVariants({ variant, size }), className)} {...props} />
}`;
}
function cardExample() {
    return `// src/components/ui/Card.jsx
import { twMerge } from 'tailwind-merge'

export function Card({ className = '', children }) {
  return (
    <div className={twMerge('rounded-[28px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.06)]', className)}>
      {children}
    </div>
  )
}

export function CardContent({ className = '', children }) {
  return <div className={twMerge('p-6', className)}>{children}</div>
}`;
}
function sectionTitleExample() {
    return `// src/components/ui/SectionTitle.jsx
export default function SectionTitle({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">{eyebrow}</p> : null}
      <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-zinc-950 sm:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-8 text-zinc-600 sm:text-lg">{description}</p> : null}
    </div>
  )
}`;
}
function dashboardShellExample() {
    return `// src/components/patterns/DashboardShell.jsx
export default function DashboardShell({ sidebar, header, children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-white/[0.03] p-5">{sidebar}</aside>
        <main className="min-w-0">
          <div className="border-b border-white/10 px-6 py-4">{header}</div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}`;
}
function heroEditorialExample() {
    return `// src/components/patterns/HeroEditorial.jsx
import { motion } from 'motion/react'

export default function HeroEditorial({ eyebrow, title, description, primaryCta, secondaryCta, panel }) {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-zinc-950 px-6 py-10 text-white sm:px-8 lg:px-10 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.2),transparent_26%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
            {eyebrow}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-5 text-5xl font-black tracking-[-0.07em] sm:text-6xl lg:text-7xl">
            {title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
            {description}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-8 flex flex-wrap gap-3">
            {primaryCta}
            {secondaryCta}
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.18 }} className="rounded-[30px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
          {panel}
        </motion.div>
      </div>
    </section>
  )
}`;
}
function commerceShellExample() {
    return `// src/components/patterns/CommerceShell.jsx
export default function CommerceShell({ announcement, header, filters, products, sidebar }) {
  return (
    <div className="min-h-screen bg-[#f6f1e8] text-zinc-950">
      <div className="border-b border-black/10 bg-zinc-950 px-4 py-2 text-center text-xs font-medium text-white/70">{announcement}</div>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">{header}</div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">{filters}</aside>
        <section className="space-y-6">
          {sidebar}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products}</div>
        </section>
      </main>
    </div>
  )
}`;
}
function kpiCardExample() {
    return `// src/components/ui/KpiCard.jsx
import { Card, CardContent } from './Card'

export default function KpiCard({ label, value, change, icon: Icon }) {
  return (
    <Card className="bg-white/90">
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-zinc-950">{value}</p>
            <p className="mt-2 text-sm text-emerald-600">{change}</p>
          </div>
          {Icon ? (
            <div className="rounded-2xl bg-zinc-950 p-3 text-white">
              <Icon size={18} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}`;
}
function productCardExample() {
    return `// src/components/patterns/ProductCardPremium.jsx
import Button from '../ui/Button'
import { Card, CardContent } from '../ui/Card'

export default function ProductCardPremium({ product, onAddToCart }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border-black/8 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(0,0,0,0.08)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        {product.badge ? (
          <span className="absolute left-4 top-4 rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-semibold text-white">{product.badge}</span>
        ) : null}
      </div>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{product.category}</p>
          <h3 className="text-lg font-bold tracking-[-0.03em] text-zinc-950">{product.name}</h3>
          <p className="text-sm text-zinc-600">{product.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-black tracking-[-0.05em] text-zinc-950">${'${product.price}'}</p>
            <p className="text-xs text-zinc-500">Stock: ${'${product.stock}'}</p>
          </div>
          <Button onClick={() => onAddToCart(product)}>Agregar</Button>
        </div>
      </CardContent>
    </Card>
  )
}`;
}
function cartDrawerExample() {
    return `// src/components/patterns/CartDrawer.jsx
import { AnimatePresence, motion } from 'motion/react'
import Button from '../ui/Button'

export default function CartDrawer({ open, items, total, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0.12, duration: 0.55 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-black/10 bg-white"
          >
            <div className="border-b border-black/10 px-6 py-5">
              <h3 className="text-xl font-bold tracking-[-0.04em] text-zinc-950">Tu carrito</h3>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-2xl border border-black/8 p-3">
                  <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-950">{item.name}</p>
                    <p className="text-sm text-zinc-500">Cantidad: {item.quantity}</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-950">${'${item.price}'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-black/10 px-6 py-5">
              <div className="mb-4 flex items-center justify-between text-sm text-zinc-600">
                <span>Total</span>
                <span className="text-lg font-black tracking-[-0.04em] text-zinc-950">${'${total}'}</span>
              </div>
              <Button className="w-full">Ir al checkout</Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}`;
}
function featureGridExample() {
    return `// src/components/patterns/FeatureGridBento.jsx
import { Card, CardContent } from '../ui/Card'

export default function FeatureGridBento({ items }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <Card
          key={item.title}
          className={index % 3 === 0 ? 'md:col-span-2' : ''}
        >
          <CardContent className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex rounded-2xl bg-zinc-950 p-3 text-white">{item.icon}</div>
              <h3 className="text-2xl font-bold tracking-[-0.04em] text-zinc-950">{item.title}</h3>
              <p className="text-sm leading-7 text-zinc-600">{item.description}</p>
            </div>
            {item.footer ? <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.footer}</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}`;
}
function pricingWallExample() {
    return `// src/components/patterns/PricingWall.jsx
import Button from '../ui/Button'
import { Card, CardContent } from '../ui/Card'

export default function PricingWall({ plans }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.name} className={plan.highlight ? 'relative border-zinc-950 bg-zinc-950 text-white' : ''}>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-60">{plan.name}</p>
              <p className="mt-4 text-5xl font-black tracking-[-0.06em]">{plan.price}</p>
              <p className="mt-3 text-sm leading-7 opacity-70">{plan.description}</p>
            </div>
            <ul className="space-y-3 text-sm opacity-80">
              {plan.features.map((feature) => <li key={feature}>• {feature}</li>)}
            </ul>
            <Button variant={plan.highlight ? 'secondary' : 'primary'} className="w-full">
              {plan.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}`;
}
function dataTableExample() {
    return `// src/components/ui/DataTable.jsx
export default function DataTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="border-b border-black/8 bg-zinc-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id ?? rowIndex} className="border-b border-black/6 last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 text-sm text-zinc-700">
                    {typeof column.render === 'function' ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
}
function activityTimelineExample() {
    return `// src/components/patterns/ActivityTimeline.jsx
export default function ActivityTimeline({ items }) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
      <div className="space-y-5">
        {items.map((item, index) => (
          <div key={item.id ?? index} className="grid grid-cols-[20px_1fr] gap-4">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full bg-zinc-950" />
              {index < items.length - 1 ? <span className="mt-2 h-full w-px bg-zinc-200" /> : null}
            </div>
            <div className="pb-5">
              <p className="text-sm font-semibold text-zinc-950">{item.title}</p>
              <p className="mt-1 text-sm leading-7 text-zinc-600">{item.description}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}`;
}
export function buildDevCanonicalExamplesContext() {
    return `

--- PLURY CANONICAL EXAMPLES ---
Usa estos ejemplos como referencia de estilo y estructura. NO copies literalmente todo si el proyecto requiere adaptacion, pero si debes mantener el nivel de calidad, separacion de responsabilidades y consistencia.

EJEMPLO CANONICO 1 — Button con variantes:
${buttonExample()}

EJEMPLO CANONICO 2 — Card base:
${cardExample()}

EJEMPLO CANONICO 3 — SectionTitle:
${sectionTitleExample()}

EJEMPLO CANONICO 4 — DashboardShell:
${dashboardShellExample()}

EJEMPLO CANONICO 5 — HeroEditorial:
${heroEditorialExample()}

EJEMPLO CANONICO 6 — CommerceShell:
${commerceShellExample()}

EJEMPLO CANONICO 7 — KpiCard:
${kpiCardExample()}

EJEMPLO CANONICO 8 — ProductCardPremium:
${productCardExample()}

EJEMPLO CANONICO 9 — CartDrawer:
${cartDrawerExample()}

EJEMPLO CANONICO 10 — FeatureGridBento:
${featureGridExample()}

EJEMPLO CANONICO 11 — PricingWall:
${pricingWallExample()}

EJEMPLO CANONICO 12 — DataTable:
${dataTableExample()}

EJEMPLO CANONICO 13 — ActivityTimeline:
${activityTimelineExample()}

Reglas al usar estos ejemplos:
1. Mantén la separacion entre primitives ui/ y patterns/.
2. Reusa estos patrones en lugar de duplicar JSX parecido.
3. Si el proyecto es premium, crea una capa de components/patterns aunque el usuario no la pida explicitamente.
4. Los ejemplos muestran la calidad minima esperada, no el maximo.
--- FIN PLURY CANONICAL EXAMPLES ---`;
}
//# sourceMappingURL=dev-canonical-examples.js.map