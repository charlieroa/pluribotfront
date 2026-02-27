/**
 * Mini shadcn/ui Component Library for Pluribots.
 * 23 React+Tailwind components that use the design system tokens.
 * Each component becomes a file in src/components/ui/ via the FileSystemTree.
 */
import type { FileSystemTree } from '@webcontainer/api'

// ═══════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════

const buttonTsx = `import { type ReactNode, type ButtonHTMLAttributes } from 'react'

const variants: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
  secondary: 'border border-border bg-card text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  outline: 'border border-border text-foreground hover:bg-muted',
}

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string
  size?: string
  children: ReactNode
}

export default function Button({ variant = 'default', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={\`inline-flex items-center justify-center font-semibold rounded-lg transition-colors \${variants[variant] || variants.default} \${sizes[size] || sizes.md} \${className}\`}
      {...props}
    >
      {children}
    </button>
  )
}
`

const cardTsx = `import { type ReactNode } from 'react'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={\`rounded-xl border border-border bg-card shadow-card \${className}\`}>{children}</div>
}

export function CardHeader({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={\`p-5 border-b border-border \${className}\`}>{children}</div>
}

export function CardContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={\`p-5 \${className}\`}>{children}</div>
}

export function CardFooter({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={\`p-5 border-t border-border \${className}\`}>{children}</div>
}
`

const badgeTsx = `import { type ReactNode } from 'react'

const variants: Record<string, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border border-border text-foreground',
}

interface BadgeProps {
  variant?: string
  className?: string
  children: ReactNode
}

export default function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span className={\`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold \${variants[variant] || variants.default} \${className}\`}>
      {children}
    </span>
  )
}
`

const avatarTsx = `const sizeMap: Record<string, string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
}

const gradients = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-blue-500 to-cyan-600',
  'from-fuchsia-500 to-purple-600',
]

interface AvatarProps {
  name: string
  size?: string
  className?: string
}

export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const gradient = gradients[name.length % gradients.length]
  return (
    <div className={\`rounded-full bg-gradient-to-br \${gradient} flex items-center justify-center text-white font-bold ring-2 ring-background \${sizeMap[size] || sizeMap.md} \${className}\`}>
      {initials}
    </div>
  )
}
`

const inputTsx = `import { type InputHTMLAttributes, type ElementType } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ElementType
}

export default function Input({ label, error, icon: Icon, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        <input
          className={\`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors \${Icon ? 'pl-9' : ''} \${error ? 'border-destructive' : ''} \${className}\`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
`

const textareaTsx = `import { type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export default function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>}
      <textarea
        className={\`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-none \${className}\`}
        {...props}
      />
    </div>
  )
}
`

const selectTsx = `interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

export default function Select({ label, value, onChange, options, className = '' }: SelectProps) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={\`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors \${className}\`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
`

const checkboxTsx = `interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export default function Checkbox({ label, checked, onChange, className = '' }: CheckboxProps) {
  return (
    <div onClick={() => onChange(!checked)} className={\`flex items-center gap-2.5 cursor-pointer \${className}\`}>
      <div className={\`w-4 h-4 rounded border flex items-center justify-center transition-colors \${checked ? 'bg-primary border-primary' : 'border-input hover:border-ring'}\`}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  )
}
`

const dividerTsx = `export default function Divider({ className = '' }: { className?: string }) {
  return <div className={\`border-t border-border \${className}\`} />
}
`

// ═══════════════════════════════════════════
// INTERACTIVE
// ═══════════════════════════════════════════

const modalTsx = `import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export default function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className={\`bg-popover text-popover-foreground border border-border rounded-2xl shadow-float w-full max-w-md mx-4 animate-scale-in \${className}\`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
`

const dropdownMenuTsx = `import { useState, useRef, useEffect, type ReactNode } from 'react'

interface DropdownItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  destructive?: boolean
}

interface DropdownMenuProps {
  trigger: ReactNode
  items: DropdownItem[]
}

export default function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-float z-50 py-1 animate-scale-in">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false) }}
              className={\`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors \${
                item.destructive
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-muted'
              }\`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
`

const tabsTsx = `import { useState, type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export default function Tabs({ tabs, defaultTab, className = '' }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-border mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={\`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px \${
              active === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }\`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.find(t => t.id === active)?.content}
    </div>
  )
}
`

const toastTsx = `import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const listeners: Set<(toast: ToastItem) => void> = new Set()
let nextId = 0

export function toast(message: string, type: ToastType = 'info') {
  const item: ToastItem = { id: nextId++, message, type }
  listeners.forEach(fn => fn(item))
}

const icons: Record<string, any> = { success: CheckCircle2, error: AlertTriangle, info: Info }
const colors: Record<string, string> = {
  success: 'bg-success text-success-foreground',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-primary text-primary-foreground',
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000)
    }
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div key={t.id} className={\`flex items-center gap-2 px-4 py-3 rounded-xl shadow-float text-sm font-medium animate-slide-up \${colors[t.type]}\`}>
            <Icon size={16} />
            {t.message}
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-2 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
`

const confirmDialogTsx = `import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmLabel?: string
  variant?: string
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar accion',
  message = 'Estas seguro de que deseas continuar?',
  confirmLabel = 'Confirmar',
  variant = 'destructive',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant={variant} className="flex-1" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
`

const tooltipTsx = `import { useState, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-popover text-popover-foreground border border-border text-xs font-medium rounded-lg whitespace-nowrap shadow-float animate-fade-in z-50">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  )
}
`

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════

const tableTsx = `import { useState, type ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (row: any) => ReactNode
}

interface TableProps {
  columns: Column[]
  data: any[]
  emptyMessage?: string
}

export default function Table({ columns, data, emptyMessage = 'No hay datos' }: TableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = a[sortKey]
        const vb = b[sortKey]
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  if (data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">{emptyMessage}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {col.sortable ? (
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key
                      ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                      : <ArrowUpDown size={12} className="opacity-30" />}
                  </button>
                ) : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="py-3 px-4 text-foreground">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
`

const statsCardTsx = `import type { ElementType } from 'react'

interface StatsCardProps {
  title: string
  value: string
  change?: string
  icon: ElementType
  iconColor?: string
  iconBg?: string
}

export default function StatsCard({ title, value, change, icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10' }: StatsCardProps) {
  const isPositive = change?.startsWith('+')
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-elevated transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className={\`w-9 h-9 rounded-lg \${iconBg} flex items-center justify-center\`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {change && (
        <span className={\`text-xs font-medium mt-1 inline-block \${isPositive ? 'text-success' : 'text-destructive'}\`}>
          {change} vs mes anterior
        </span>
      )}
    </div>
  )
}
`

const emptyStateTsx = `import { type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title = 'Sin datos', description = 'No hay elementos para mostrar.', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        {icon || <Inbox size={24} className="text-muted-foreground" />}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
`

// ═══════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════

const sidebarTsx = `import { type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarItem {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: string | number
  onClick?: () => void
}

interface SidebarProps {
  open: boolean
  onToggle: () => void
  title?: string
  items: SidebarItem[]
  footer?: ReactNode
}

export default function Sidebar({ open, onToggle, title, items, footer }: SidebarProps) {
  return (
    <aside className={\`\${open ? 'w-60' : 'w-16'} bg-card border-r border-border flex flex-col transition-all duration-200 flex-shrink-0\`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {open && title && <span className="text-lg font-bold text-primary">{title}</span>}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
              item.active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }\`}
          >
            {item.icon}
            {open && <span className="flex-1 text-left">{item.label}</span>}
            {open && item.badge !== undefined && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
      {footer && open && <div className="p-4 border-t border-border">{footer}</div>}
    </aside>
  )
}
`

const topBarTsx = `import { type ReactNode } from 'react'
import { Search, Bell } from 'lucide-react'

interface TopBarProps {
  title: string
  search?: boolean
  onSearch?: (query: string) => void
  actions?: ReactNode
  avatar?: ReactNode
}

export default function TopBar({ title, search = false, onSearch, actions, avatar }: TopBarProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-4">
        {search && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              onChange={e => onSearch?.(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring w-56"
            />
          </div>
        )}
        {actions}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        {avatar}
      </div>
    </header>
  )
}
`

const pageContainerTsx = `import { type ReactNode } from 'react'

export default function PageContainer({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={\`max-w-7xl mx-auto px-4 sm:px-6 py-6 \${className}\`}>{children}</div>
}
`

// ═══════════════════════════════════════════
// ADVANCED
// ═══════════════════════════════════════════

const dragDropTsx = `import { useState, type ReactNode, type DragEvent } from 'react'

let dragData: { itemId: string; fromColumn: string } | null = null
let globalOnDragEnd: ((itemId: string, from: string, to: string) => void) | null = null

interface DragDropContextProps {
  children: ReactNode
  onDragEnd: (itemId: string, fromColumn: string, toColumn: string) => void
}

export function DragDropContext({ children, onDragEnd }: DragDropContextProps) {
  globalOnDragEnd = onDragEnd
  return <>{children}</>
}

interface DroppableColumnProps {
  columnId: string
  children: ReactNode
  className?: string
}

export function DroppableColumn({ columnId, children, className = '' }: DroppableColumnProps) {
  const [over, setOver] = useState(false)

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setOver(true) }
  const handleDragLeave = () => setOver(false)
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (dragData && dragData.fromColumn !== columnId) {
      globalOnDragEnd?.(dragData.itemId, dragData.fromColumn, columnId)
    }
    dragData = null
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={\`min-h-[120px] transition-all \${over ? 'ring-2 ring-primary/30 bg-primary/5 rounded-xl' : ''} \${className}\`}
    >
      {children}
    </div>
  )
}

interface DraggableCardProps {
  itemId: string
  columnId: string
  children: ReactNode
  className?: string
}

export function DraggableCard({ itemId, columnId, children, className = '' }: DraggableCardProps) {
  const [dragging, setDragging] = useState(false)

  const handleDragStart = () => {
    dragData = { itemId, fromColumn: columnId }
    setDragging(true)
  }
  const handleDragEnd = () => {
    dragData = null
    setDragging(false)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={\`cursor-grab active:cursor-grabbing \${dragging ? 'opacity-50' : ''} \${className}\`}
    >
      {children}
    </div>
  )
}
`

const searchInputTsx = `import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export default function SearchInput({ onSearch, placeholder = 'Buscar...', debounceMs = 300, className = '' }: SearchInputProps) {
  const [value, setValue] = useState('')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useEffect(() => {
    const timer = setTimeout(() => onSearchRef.current(value), debounceMs)
    return () => clearTimeout(timer)
  }, [value, debounceMs])

  return (
    <div className={\`relative \${className}\`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 text-sm bg-card border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
      />
      {value && (
        <button onClick={() => setValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
`

// ═══════════════════════════════════════════
// BARREL EXPORT
// ═══════════════════════════════════════════

const indexTs = `export { default as Button } from './Button'
export { Card, CardHeader, CardContent, CardFooter } from './Card'
export { default as Badge } from './Badge'
export { default as Avatar } from './Avatar'
export { default as Input } from './Input'
export { default as Textarea } from './Textarea'
export { default as Select } from './Select'
export { default as Checkbox } from './Checkbox'
export { default as Divider } from './Divider'
export { default as Modal } from './Modal'
export { default as DropdownMenu } from './DropdownMenu'
export { default as Tabs } from './Tabs'
export { default as ToastContainer, toast } from './Toast'
export { default as ConfirmDialog } from './ConfirmDialog'
export { default as Tooltip } from './Tooltip'
export { default as Table } from './Table'
export { default as StatsCard } from './StatsCard'
export { default as EmptyState } from './EmptyState'
export { default as Sidebar } from './Sidebar'
export { default as TopBar } from './TopBar'
export { default as PageContainer } from './PageContainer'
export { DragDropContext, DroppableColumn, DraggableCard } from './DragDrop'
export { default as SearchInput } from './SearchInput'
`

// ═══════════════════════════════════════════
// EXPORT: FileSystemTree for components/ui/
// ═══════════════════════════════════════════

export function getUIComponentFiles(): FileSystemTree {
  return {
    ui: {
      directory: {
        'Button.tsx': { file: { contents: buttonTsx } },
        'Card.tsx': { file: { contents: cardTsx } },
        'Badge.tsx': { file: { contents: badgeTsx } },
        'Avatar.tsx': { file: { contents: avatarTsx } },
        'Input.tsx': { file: { contents: inputTsx } },
        'Textarea.tsx': { file: { contents: textareaTsx } },
        'Select.tsx': { file: { contents: selectTsx } },
        'Checkbox.tsx': { file: { contents: checkboxTsx } },
        'Divider.tsx': { file: { contents: dividerTsx } },
        'Modal.tsx': { file: { contents: modalTsx } },
        'DropdownMenu.tsx': { file: { contents: dropdownMenuTsx } },
        'Tabs.tsx': { file: { contents: tabsTsx } },
        'Toast.tsx': { file: { contents: toastTsx } },
        'ConfirmDialog.tsx': { file: { contents: confirmDialogTsx } },
        'Tooltip.tsx': { file: { contents: tooltipTsx } },
        'Table.tsx': { file: { contents: tableTsx } },
        'StatsCard.tsx': { file: { contents: statsCardTsx } },
        'EmptyState.tsx': { file: { contents: emptyStateTsx } },
        'Sidebar.tsx': { file: { contents: sidebarTsx } },
        'TopBar.tsx': { file: { contents: topBarTsx } },
        'PageContainer.tsx': { file: { contents: pageContainerTsx } },
        'DragDrop.tsx': { file: { contents: dragDropTsx } },
        'SearchInput.tsx': { file: { contents: searchInputTsx } },
        'index.ts': { file: { contents: indexTs } },
      },
    },
  }
}
