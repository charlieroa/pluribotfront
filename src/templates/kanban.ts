/**
 * Kanban/Task Manager template — Showcase of the UI component library.
 * Uses DragDrop, DropdownMenu, Modal, Toast, Badge, Avatar, Button, SearchInput.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import { useState } from 'react'
import { DragDropContext } from './components/ui/DragDrop'
import { toast } from './components/ui/Toast'
import ToastContainer from './components/ui/Toast'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import KanbanBoard from './components/KanbanBoard'
import TaskModal from './components/TaskModal'
import { tasks as initialTasks, columns } from './data/tasks'

export interface Task {
  id: number
  title: string
  description: string
  status: string
  priority: string
  assignee: string
  dueDate: string
  tags: string[]
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [search, setSearch] = useState('')

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDragEnd = (itemId: string, fromColumn: string, toColumn: string) => {
    setTasks(prev => prev.map(t => t.id === Number(itemId) ? { ...t, status: toColumn } : t))
    toast('Tarea movida a ' + toColumn, 'success')
  }

  const handleAddTask = (task: Omit<Task, 'id'>) => {
    setTasks([...tasks, { ...task, id: Date.now() }])
    setShowModal(false)
    toast('Tarea creada exitosamente', 'success')
  }

  const handleEditTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t))
    setEditTask(null)
    toast('Tarea actualizada', 'info')
  }

  const handleDeleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    toast('Tarea eliminada', 'error')
  }

  const openEdit = (task: Task) => setEditTask(task)

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header onAddTask={() => setShowModal(true)} onSearch={setSearch} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StatsBar tasks={tasks} />
        <DragDropContext onDragEnd={handleDragEnd}>
          <KanbanBoard
            tasks={filtered}
            columns={columns}
            onEdit={openEdit}
            onDelete={handleDeleteTask}
          />
        </DragDropContext>
      </div>

      <TaskModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAddTask}
      />

      {editTask && (
        <TaskModal
          open={true}
          onClose={() => setEditTask(null)}
          onSave={(t) => handleEditTask({ ...t, id: editTask.id })}
          initial={editTask}
        />
      )}

      <ToastContainer />
    </div>
  )
}
`

const headerTsx = `import { Plus, Kanban, Bell } from 'lucide-react'
import Button from './ui/Button'
import SearchInput from './ui/SearchInput'
import Avatar from './ui/Avatar'

const team = [
  { name: 'Ana Garcia' },
  { name: 'Carlos Ruiz' },
  { name: 'Sofia Torres' },
  { name: 'Diego Lopez' },
]

interface HeaderProps {
  onAddTask: () => void
  onSearch: (q: string) => void
}

export default function Header({ onAddTask, onSearch }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Kanban size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Mi Proyecto</h1>
            <p className="text-[11px] text-muted-foreground">Sprint 14 — Feb 2025</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SearchInput onSearch={onSearch} placeholder="Buscar tareas..." className="hidden sm:block w-56" />
          <div className="hidden md:flex -space-x-2.5">
            {team.map(m => (
              <Avatar key={m.name} name={m.name} size="sm" />
            ))}
          </div>
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell size={18} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-background" />
          </button>
          <Button variant="default" size="sm" onClick={onAddTask}>
            <Plus size={16} /> <span className="hidden sm:inline">Nueva tarea</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
`

const statsBarTsx = `import { CheckCircle2, Clock, AlertTriangle, BarChart3 } from 'lucide-react'

interface Task {
  id: number; title: string; status: string; priority: string
}

export default function StatsBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'Completado').length
  const inProgress = tasks.filter(t => t.status === 'En Progreso').length
  const highPriority = tasks.filter(t => t.priority === 'Alta' && t.status !== 'Completado').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const stats = [
    { label: 'Total', value: total, icon: BarChart3, gradient: 'from-violet-500/20 to-indigo-500/20', border: 'border-violet-500/20', iconColor: 'text-violet-400' },
    { label: 'En progreso', value: inProgress, icon: Clock, gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
    { label: 'Completadas', value: done, icon: CheckCircle2, gradient: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
    { label: 'Alta prioridad', value: highPriority, icon: AlertTriangle, gradient: 'from-rose-500/20 to-pink-500/20', border: 'border-rose-500/20', iconColor: 'text-rose-400' },
  ]

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className={\`relative overflow-hidden rounded-xl bg-gradient-to-br \${s.gradient} border \${s.border} p-4\`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
              </div>
              <s.icon size={20} className={s.iconColor} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{pct}% completado</span>
      </div>
    </div>
  )
}
`

const kanbanBoardTsx = `import KanbanColumn from './KanbanColumn'

interface Task {
  id: number; title: string; description: string; status: string
  priority: string; assignee: string; dueDate: string; tags: string[]
}

interface Column {
  id: string
  gradient: string
  dot: string
}

interface Props {
  tasks: Task[]
  columns: Column[]
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
}

export default function KanbanBoard({ tasks, columns, onEdit, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(col => (
        <KanbanColumn
          key={col.id}
          column={col}
          tasks={tasks.filter(t => t.status === col.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
`

const kanbanColumnTsx = `import { Plus } from 'lucide-react'
import { DroppableColumn } from './ui/DragDrop'
import TaskCard from './TaskCard'

interface Task {
  id: number; title: string; description: string; status: string
  priority: string; assignee: string; dueDate: string; tags: string[]
}

interface Column {
  id: string
  gradient: string
  dot: string
}

interface Props {
  column: Column
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
}

export default function KanbanColumn({ column, tasks, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className={\`h-1 bg-gradient-to-r \${column.gradient}\`} />
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={\`w-2 h-2 rounded-full \${column.dot} shadow-lg shadow-current/50\`} />
          <h3 className="text-sm font-bold text-foreground">{column.id}</h3>
          <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {tasks.length}
          </span>
        </div>
        <button className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Plus size={14} />
        </button>
      </div>

      <DroppableColumn columnId={column.id} className="px-3 pb-3 space-y-2.5">
        {tasks.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-xl h-24 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Arrastra tareas aqui</span>
          </div>
        )}
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </DroppableColumn>
    </div>
  )
}
`

const taskCardTsx = `import { Calendar, Edit3, Trash2, MoreHorizontal } from 'lucide-react'
import { DraggableCard } from './ui/DragDrop'
import DropdownMenu from './ui/DropdownMenu'
import Badge from './ui/Badge'
import Avatar from './ui/Avatar'

interface Task {
  id: number; title: string; description: string; status: string
  priority: string; assignee: string; dueDate: string; tags: string[]
}

const priorityVariant: Record<string, string> = {
  Alta: 'destructive',
  Media: 'warning',
  Baja: 'default',
}

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
}

export default function TaskCard({ task, onEdit, onDelete }: Props) {
  return (
    <DraggableCard itemId={String(task.id)} columnId={task.status}>
      <div className="group relative bg-card hover:bg-muted border border-border hover:border-ring/20 rounded-xl p-3.5 transition-all">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-[13px] font-semibold text-foreground leading-snug">{task.title}</h4>
          <DropdownMenu
            trigger={
              <button className="p-1 rounded-lg hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal size={14} />
              </button>
            }
            items={[
              { label: 'Editar', icon: <Edit3 size={14} />, onClick: () => onEdit(task) },
              { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => onDelete(task.id), destructive: true },
            ]}
          />
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{task.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant={priorityVariant[task.priority] || 'default'}>{task.priority}</Badge>
          {task.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar name={task.assignee} size="sm" />
            <span className="text-[11px] text-muted-foreground">{task.assignee}</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar size={10} /> {task.dueDate}
          </span>
        </div>
      </div>
    </DraggableCard>
  )
}
`

const taskModalTsx = `import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import Select from './ui/Select'
import Button from './ui/Button'

interface Task {
  title: string
  description: string
  status: string
  priority: string
  assignee: string
  dueDate: string
  tags: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (task: Task) => void
  initial?: Task
}

const statusOptions = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'En Progreso', label: 'En Progreso' },
  { value: 'Revision', label: 'Revision' },
  { value: 'Completado', label: 'Completado' },
]

const priorityOptions = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Media', label: 'Media' },
  { value: 'Baja', label: 'Baja' },
]

const assigneeOptions = [
  { value: 'Ana Garcia', label: 'Ana Garcia' },
  { value: 'Carlos Ruiz', label: 'Carlos Ruiz' },
  { value: 'Sofia Torres', label: 'Sofia Torres' },
  { value: 'Diego Lopez', label: 'Diego Lopez' },
  { value: 'Maria Vargas', label: 'Maria Vargas' },
]

export default function TaskModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'Pendiente',
    priority: 'Media',
    assignee: 'Ana Garcia',
    dueDate: '',
    tagsStr: '',
  })

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title,
        description: initial.description,
        status: initial.status,
        priority: initial.priority,
        assignee: initial.assignee,
        dueDate: initial.dueDate,
        tagsStr: initial.tags.join(', '),
      })
    }
  }, [initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee,
      dueDate: form.dueDate,
      tags: form.tagsStr.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Titulo"
          required
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Nombre de la tarea"
        />
        <Textarea
          label="Descripcion"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Describe la tarea..."
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Prioridad"
            value={form.priority}
            onChange={v => setForm({ ...form, priority: v })}
            options={priorityOptions}
          />
          <Select
            label="Asignado"
            value={form.assignee}
            onChange={v => setForm({ ...form, assignee: v })}
            options={assigneeOptions}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Estado"
            value={form.status}
            onChange={v => setForm({ ...form, status: v })}
            options={statusOptions}
          />
          <Input
            label="Fecha limite"
            type="date"
            value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        <Input
          label="Tags (separados por coma)"
          value={form.tagsStr}
          onChange={e => setForm({ ...form, tagsStr: e.target.value })}
          placeholder="frontend, bug, urgente"
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="default" className="flex-1">
            {initial ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
`

const tasksData = `export const columns = [
  { id: 'Pendiente', gradient: 'from-slate-500 to-slate-600', dot: 'bg-slate-400' },
  { id: 'En Progreso', gradient: 'from-blue-500 to-cyan-500', dot: 'bg-blue-400' },
  { id: 'Revision', gradient: 'from-amber-500 to-orange-500', dot: 'bg-amber-400' },
  { id: 'Completado', gradient: 'from-emerald-500 to-teal-500', dot: 'bg-emerald-400' },
]

export const tasks = [
  { id: 1, title: 'Disenar nueva landing page', description: 'Crear el diseno responsivo de la nueva landing page con hero, features y pricing.', status: 'En Progreso', priority: 'Alta', assignee: 'Ana Garcia', dueDate: '28 Feb', tags: ['diseno', 'frontend'] },
  { id: 2, title: 'Integrar pasarela de pagos', description: 'Conectar Stripe para procesar pagos recurrentes de suscripciones.', status: 'Pendiente', priority: 'Alta', assignee: 'Carlos Ruiz', dueDate: '5 Mar', tags: ['backend', 'pagos'] },
  { id: 3, title: 'Corregir bug en formulario', description: 'El formulario de contacto no valida emails correctamente en mobile.', status: 'Revision', priority: 'Media', assignee: 'Sofia Torres', dueDate: '26 Feb', tags: ['bug', 'frontend'] },
  { id: 4, title: 'Optimizar carga de imagenes', description: 'Implementar lazy loading y WebP para reducir tiempo de carga.', status: 'Pendiente', priority: 'Media', assignee: 'Diego Lopez', dueDate: '3 Mar', tags: ['performance'] },
  { id: 5, title: 'Escribir tests de API', description: 'Cubrir endpoints de autenticacion y CRUD de usuarios con tests.', status: 'En Progreso', priority: 'Media', assignee: 'Carlos Ruiz', dueDate: '1 Mar', tags: ['testing', 'backend'] },
  { id: 6, title: 'Actualizar documentacion', description: 'Documentar los nuevos endpoints de la API y el flujo de autenticacion.', status: 'Pendiente', priority: 'Baja', assignee: 'Maria Vargas', dueDate: '10 Mar', tags: ['docs'] },
  { id: 7, title: 'Migrar base de datos', description: 'Migrar de PostgreSQL 14 a 16 en el servidor de staging.', status: 'Completado', priority: 'Alta', assignee: 'Diego Lopez', dueDate: '20 Feb', tags: ['backend', 'devops'] },
  { id: 8, title: 'Implementar dark mode', description: 'Agregar toggle de tema claro/oscuro con persistencia en localStorage.', status: 'Revision', priority: 'Baja', assignee: 'Ana Garcia', dueDate: '7 Mar', tags: ['frontend', 'UX'] },
  { id: 9, title: 'Configurar CI/CD', description: 'Automatizar deploy con GitHub Actions para staging y produccion.', status: 'Completado', priority: 'Alta', assignee: 'Carlos Ruiz', dueDate: '18 Feb', tags: ['devops'] },
  { id: 10, title: 'Crear dashboard de metricas', description: 'Panel con graficos de uso, revenue y usuarios activos usando Recharts.', status: 'En Progreso', priority: 'Alta', assignee: 'Sofia Torres', dueDate: '28 Feb', tags: ['frontend', 'analytics'] },
  { id: 11, title: 'Revisar accesibilidad', description: 'Auditar con Lighthouse y corregir issues de contraste y aria labels.', status: 'Pendiente', priority: 'Media', assignee: 'Ana Garcia', dueDate: '12 Mar', tags: ['a11y', 'frontend'] },
  { id: 12, title: 'Setup monitoring', description: 'Configurar Sentry para error tracking y alertas en Slack.', status: 'Completado', priority: 'Media', assignee: 'Diego Lopez', dueDate: '22 Feb', tags: ['devops', 'monitoring'] },
]
`

export function getKanbanFiles(): FileSystemTree {
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
            'Header.tsx': { file: { contents: headerTsx } },
            'StatsBar.tsx': { file: { contents: statsBarTsx } },
            'KanbanBoard.tsx': { file: { contents: kanbanBoardTsx } },
            'KanbanColumn.tsx': { file: { contents: kanbanColumnTsx } },
            'TaskCard.tsx': { file: { contents: taskCardTsx } },
            'TaskModal.tsx': { file: { contents: taskModalTsx } },
          },
        },
        data: {
          directory: {
            'tasks.ts': { file: { contents: tasksData } },
          },
        },
      },
    },
  }
}
