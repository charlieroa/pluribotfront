/**
 * Dashboard template — Uses UI library Sidebar, TopBar, StatsCard, Table.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import { useState } from 'react'
import Sidebar from './components/ui/Sidebar'
import TopBar from './components/ui/TopBar'
import StatsCard from './components/ui/StatsCard'
import Avatar from './components/ui/Avatar'
import Chart from './components/Chart'
import RecentTable from './components/RecentTable'
import { LayoutDashboard, Users, ShoppingCart, BarChart3, Settings, DollarSign, TrendingUp } from 'lucide-react'

const stats = [
  { title: 'Ingresos', value: '$45,231', change: '+20.1%', icon: DollarSign, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-500/10' },
  { title: 'Usuarios', value: '2,338', change: '+15.3%', icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-500/10' },
  { title: 'Ventas', value: '1,234', change: '+12.5%', icon: ShoppingCart, iconColor: 'text-purple-600', iconBg: 'bg-purple-500/10' },
  { title: 'Crecimiento', value: '23.5%', change: '+4.1%', icon: TrendingUp, iconColor: 'text-amber-600', iconBg: 'bg-amber-500/10' },
]

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', active: true },
  { icon: <Users size={18} />, label: 'Usuarios' },
  { icon: <ShoppingCart size={18} />, label: 'Ventas' },
  { icon: <BarChart3 size={18} />, label: 'Reportes' },
  { icon: <Settings size={18} />, label: 'Configuracion' },
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="dark flex h-screen bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        title="Pluria"
        items={navItems}
        footer={
          <div className="flex items-center gap-3">
            <Avatar name="Admin" size="sm" />
            <div>
              <p className="text-sm font-medium text-foreground">Admin</p>
              <p className="text-xs text-muted-foreground">admin@pluria.com</p>
            </div>
          </div>
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Dashboard"
          search
          avatar={<Avatar name="Admin" size="sm" />}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Bienvenido de vuelta</h2>
            <p className="text-muted-foreground text-sm mt-1">Aqui tienes un resumen de tu negocio</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((s) => (
              <StatsCard key={s.title} {...s} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" />
                Ventas mensuales
              </h3>
              <Chart />
            </div>
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Actividad reciente</h3>
              <RecentTable />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
`

const chartTsx = `import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'

const data = [
  { month: 'Ene', ventas: 4000, meta: 3500 },
  { month: 'Feb', ventas: 3200, meta: 3500 },
  { month: 'Mar', ventas: 5100, meta: 4000 },
  { month: 'Abr', ventas: 4800, meta: 4000 },
  { month: 'May', ventas: 6200, meta: 4500 },
  { month: 'Jun', ventas: 5800, meta: 5000 },
  { month: 'Jul', ventas: 7100, meta: 5500 },
  { month: 'Ago', ventas: 6500, meta: 5500 },
]

export default function Chart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
        />
        <Bar dataKey="ventas" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="meta" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
`

const recentTableTsx = `import Badge from './ui/Badge'

const rows = [
  { id: '#1234', client: 'Maria Lopez', amount: '$320', status: 'Completado', variant: 'success' },
  { id: '#1235', client: 'Juan Garcia', amount: '$150', status: 'Pendiente', variant: 'warning' },
  { id: '#1236', client: 'Ana Martinez', amount: '$480', status: 'Completado', variant: 'success' },
  { id: '#1237', client: 'Carlos Ruiz', amount: '$95', status: 'Cancelado', variant: 'destructive' },
  { id: '#1238', client: 'Sofia Torres', amount: '$210', status: 'Completado', variant: 'success' },
]

export default function RecentTable() {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 text-muted-foreground font-medium text-xs">ID</th>
            <th className="text-left py-2.5 text-muted-foreground font-medium text-xs">Cliente</th>
            <th className="text-left py-2.5 text-muted-foreground font-medium text-xs">Monto</th>
            <th className="text-left py-2.5 text-muted-foreground font-medium text-xs">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border hover:bg-muted/50">
              <td className="py-2.5 text-muted-foreground">{r.id}</td>
              <td className="py-2.5 text-foreground font-medium">{r.client}</td>
              <td className="py-2.5 text-foreground">{r.amount}</td>
              <td className="py-2.5">
                <Badge variant={r.variant}>{r.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
`

/** Merge shared files with dashboard-specific src files */
export function getDashboardFiles(): FileSystemTree {
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
            'Chart.tsx': { file: { contents: chartTsx } },
            'RecentTable.tsx': { file: { contents: recentTableTsx } },
          },
        },
      },
    },
  }
}
