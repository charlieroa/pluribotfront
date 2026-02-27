/**
 * CRM/Client Management template — Uses UI library Sidebar, TopBar, StatsCard, Table, Modal, Badge, Avatar.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import { useState } from 'react'
import Sidebar from './components/ui/Sidebar'
import TopBar from './components/ui/TopBar'
import StatsCard from './components/ui/StatsCard'
import Avatar from './components/ui/Avatar'
import Button from './components/ui/Button'
import ClientTable from './components/ClientTable'
import Pipeline from './components/Pipeline'
import ActivityFeed from './components/ActivityFeed'
import ClientModal from './components/ClientModal'
import { clients as initialClients } from './data/clients'
import { LayoutDashboard, Users, Kanban, Activity, Settings, UserPlus, DollarSign, TrendingUp } from 'lucide-react'

type View = 'dashboard' | 'clients' | 'pipeline' | 'activity'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [clients] = useState(initialClients)

  const totalClients = clients.length
  const newClients = clients.filter(c => c.status === 'Nuevo').length
  const activeDeals = clients.filter(c => c.stage !== 'Cerrado').length
  const totalRevenue = clients.reduce((sum, c) => sum + c.dealValue, 0)

  const stats = [
    { title: 'Total clientes', value: totalClients.toString(), icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-500/10', change: '+12%' },
    { title: 'Nuevos este mes', value: newClients.toString(), icon: UserPlus, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-500/10', change: '+8%' },
    { title: 'Deals activos', value: activeDeals.toString(), icon: TrendingUp, iconColor: 'text-purple-600', iconBg: 'bg-purple-500/10', change: '+5%' },
    { title: 'Revenue total', value: '$' + totalRevenue.toLocaleString(), icon: DollarSign, iconColor: 'text-amber-600', iconBg: 'bg-amber-500/10', change: '+22%' },
  ]

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', active: view === 'dashboard', onClick: () => setView('dashboard') },
    { icon: <Users size={18} />, label: 'Clientes', active: view === 'clients', onClick: () => setView('clients') },
    { icon: <Kanban size={18} />, label: 'Pipeline', active: view === 'pipeline', onClick: () => setView('pipeline') },
    { icon: <Activity size={18} />, label: 'Actividad', active: view === 'activity', onClick: () => setView('activity') },
  ]

  return (
    <div className="dark flex h-screen bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        title="MiCRM"
        items={navItems}
        footer={
          <div className="flex items-center gap-3">
            <Avatar name="Admin" size="sm" />
            <div>
              <p className="text-sm font-medium text-foreground">Admin</p>
              <p className="text-xs text-muted-foreground">admin@micrm.com</p>
            </div>
          </div>
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={view === 'dashboard' ? 'Panel general' : view === 'clients' ? 'Clientes' : view === 'pipeline' ? 'Pipeline' : 'Actividad'}
          actions={
            <Button variant="default" size="sm" onClick={() => setShowModal(true)}>
              + Nuevo cliente
            </Button>
          }
          avatar={<Avatar name="Admin" size="sm" />}
        />

        <main className="flex-1 overflow-auto p-6">
          {view === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(s => <StatsCard key={s.title} {...s} />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2">
                  <ClientTable clients={clients.slice(0, 5)} />
                </div>
                <ActivityFeed />
              </div>
            </>
          )}
          {view === 'clients' && <ClientTable clients={clients} />}
          {view === 'pipeline' && <Pipeline clients={clients} />}
          {view === 'activity' && <ActivityFeed />}
        </main>
      </div>

      {showModal && <ClientModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
`

const clientTableTsx = `import { MoreHorizontal } from 'lucide-react'
import Badge from './ui/Badge'
import Avatar from './ui/Avatar'

interface Client {
  id: number; name: string; company: string; email: string
  status: string; lastActivity: string; dealValue: number; stage: string
}

const statusVariant: Record<string, string> = {
  Activo: 'success',
  Nuevo: 'default',
  Inactivo: 'outline',
  VIP: 'warning',
}

export default function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Clientes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-5 text-muted-foreground font-medium text-xs">Nombre</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium text-xs">Empresa</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium text-xs">Email</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium text-xs">Estado</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium text-xs">Valor deal</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium text-xs">Actividad</th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <span className="font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="py-3 px-5 text-muted-foreground">{c.company}</td>
                <td className="py-3 px-5 text-muted-foreground">{c.email}</td>
                <td className="py-3 px-5">
                  <Badge variant={statusVariant[c.status] || 'outline'}>{c.status}</Badge>
                </td>
                <td className="py-3 px-5 text-foreground font-medium">\${c.dealValue.toLocaleString()}</td>
                <td className="py-3 px-5 text-muted-foreground text-xs">{c.lastActivity}</td>
                <td className="py-3 px-5">
                  <button className="p-1 rounded hover:bg-muted"><MoreHorizontal size={16} className="text-muted-foreground" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
`

const pipelineTsx = `import Avatar from './ui/Avatar'
import Badge from './ui/Badge'

interface Client {
  id: number; name: string; company: string; email: string
  status: string; lastActivity: string; dealValue: number; stage: string
}

const stages = ['Prospecto', 'Contactado', 'Negociando', 'Cerrado']
const stageColors: Record<string, string> = {
  Prospecto: 'bg-blue-500',
  Contactado: 'bg-amber-500',
  Negociando: 'bg-purple-500',
  Cerrado: 'bg-emerald-500',
}

export default function Pipeline({ clients }: { clients: Client[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stages.map(stage => {
        const stageClients = clients.filter(c => c.stage === stage)
        return (
          <div key={stage} className="bg-muted rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={\`w-2.5 h-2.5 rounded-full \${stageColors[stage]}\`} />
                <h3 className="text-sm font-bold text-foreground">{stage}</h3>
              </div>
              <Badge variant="outline">{stageClients.length}</Badge>
            </div>
            <div className="space-y-3">
              {stageClients.map(c => (
                <div key={c.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-elevated transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={c.name} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-bold text-foreground">\${c.dealValue.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground">{c.lastActivity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
`

const activityFeedTsx = `const activities = [
  { id: 1, action: 'Nuevo cliente agregado', detail: 'Maria Lopez - TechCorp', time: 'Hace 2 horas', color: 'bg-blue-500' },
  { id: 2, action: 'Deal cerrado', detail: 'Juan Garcia - $15,000', time: 'Hace 4 horas', color: 'bg-emerald-500' },
  { id: 3, action: 'Reunion agendada', detail: 'Ana Torres - 15 Feb, 10:00', time: 'Hace 6 horas', color: 'bg-purple-500' },
  { id: 4, action: 'Email enviado', detail: 'Carlos Ruiz - Propuesta comercial', time: 'Ayer', color: 'bg-amber-500' },
  { id: 5, action: 'Pipeline actualizado', detail: 'Sofia Mendez paso a Negociando', time: 'Ayer', color: 'bg-indigo-500' },
  { id: 6, action: 'Nota agregada', detail: 'Pedro Sanchez - Seguimiento pendiente', time: 'Hace 2 dias', color: 'bg-rose-500' },
]

export default function ActivityFeed() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Actividad reciente</h3>
      <div className="space-y-4">
        {activities.map(a => (
          <div key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={\`w-2.5 h-2.5 rounded-full \${a.color} mt-1.5\`} />
              <div className="w-px flex-1 bg-border mt-1" />
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-foreground">{a.action}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
`

const clientModalTsx = `import { useState } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Select from './ui/Select'
import Button from './ui/Button'

export default function ClientModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', stage: 'Prospecto', dealValue: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title="Nuevo cliente">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre completo"
        />
        <Input
          label="Empresa"
          value={form.company}
          onChange={e => setForm({ ...form, company: e.target.value })}
          placeholder="Nombre de empresa"
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="correo@empresa.com"
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Etapa"
            value={form.stage}
            onChange={v => setForm({ ...form, stage: v })}
            options={[
              { value: 'Prospecto', label: 'Prospecto' },
              { value: 'Contactado', label: 'Contactado' },
              { value: 'Negociando', label: 'Negociando' },
              { value: 'Cerrado', label: 'Cerrado' },
            ]}
          />
          <Input
            label="Valor deal"
            type="number"
            value={form.dealValue}
            onChange={e => setForm({ ...form, dealValue: e.target.value })}
            placeholder="$0"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="default" className="flex-1">
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
`

const clientsData = `export const clients = [
  { id: 1, name: 'Maria Lopez', company: 'TechCorp', email: 'maria@techcorp.com', status: 'Activo', lastActivity: 'Hace 2 horas', dealValue: 15000, stage: 'Negociando' },
  { id: 2, name: 'Juan Garcia', company: 'InnovaLab', email: 'juan@innovalab.com', status: 'VIP', lastActivity: 'Hoy', dealValue: 32000, stage: 'Cerrado' },
  { id: 3, name: 'Ana Torres', company: 'DesignPro', email: 'ana@designpro.com', status: 'Nuevo', lastActivity: 'Ayer', dealValue: 8000, stage: 'Prospecto' },
  { id: 4, name: 'Carlos Ruiz', company: 'CloudSoft', email: 'carlos@cloudsoft.com', status: 'Activo', lastActivity: 'Hace 3 dias', dealValue: 21000, stage: 'Contactado' },
  { id: 5, name: 'Sofia Mendez', company: 'GrowthIO', email: 'sofia@growthio.com', status: 'Activo', lastActivity: 'Hoy', dealValue: 18000, stage: 'Negociando' },
  { id: 6, name: 'Pedro Sanchez', company: 'DataViz', email: 'pedro@dataviz.com', status: 'Nuevo', lastActivity: 'Hace 1 semana', dealValue: 5000, stage: 'Prospecto' },
  { id: 7, name: 'Laura Vargas', company: 'MediaHub', email: 'laura@mediahub.com', status: 'Activo', lastActivity: 'Hace 2 dias', dealValue: 12000, stage: 'Contactado' },
  { id: 8, name: 'Roberto Silva', company: 'EcomPlus', email: 'roberto@ecomplus.com', status: 'VIP', lastActivity: 'Hoy', dealValue: 45000, stage: 'Cerrado' },
  { id: 9, name: 'Diana Castro', company: 'FinTech360', email: 'diana@fintech360.com', status: 'Activo', lastActivity: 'Ayer', dealValue: 27000, stage: 'Negociando' },
  { id: 10, name: 'Miguel Herrera', company: 'AppForge', email: 'miguel@appforge.com', status: 'Inactivo', lastActivity: 'Hace 2 semanas', dealValue: 3000, stage: 'Prospecto' },
  { id: 11, name: 'Elena Rojas', company: 'SmartRetail', email: 'elena@smartretail.com', status: 'Nuevo', lastActivity: 'Hoy', dealValue: 9500, stage: 'Contactado' },
]
`

export function getCrmFiles(): FileSystemTree {
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
            'ClientTable.tsx': { file: { contents: clientTableTsx } },
            'Pipeline.tsx': { file: { contents: pipelineTsx } },
            'ActivityFeed.tsx': { file: { contents: activityFeedTsx } },
            'ClientModal.tsx': { file: { contents: clientModalTsx } },
          },
        },
        data: {
          directory: {
            'clients.ts': { file: { contents: clientsData } },
          },
        },
      },
    },
  }
}
