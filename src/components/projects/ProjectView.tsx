import { useState, useEffect } from 'react'
import { ArrowLeft, Globe, Code, FileText, Video, Palette, BarChart3, Calendar, MessageSquare, ExternalLink, ChevronDown, ChevronRight, Radio, Play, LayoutList } from 'lucide-react'
import type { Deliverable, ProjectAsset } from '../../types'

interface ProjectKanbanTask {
  id: string
  title: string
  agent: string
  status: 'todo' | 'doing' | 'done'
  botType: string
  instanceId?: string
  createdAt: string
  deliverable?: { id: string; title: string; type: string; botType: string } | null
}

interface ProjectConversation {
  id: string
  title: string
  updatedAt: string
  messages: { text: string; sender: string }[]
  deliverables: ProjectDeliverable[]
  kanbanTasks?: ProjectKanbanTask[]
}

interface ProjectDeliverable {
  id: string
  title: string
  type: string
  botType: string
  content: string
  version?: number
  instanceId?: string
  publishSlug?: string
  customDomain?: string
  createdAt: string
}

interface ProjectDetail {
  id: string
  name: string
  description?: string | null
  status: string
  createdAt: string
  updatedAt: string
  apps?: ProjectApp[]
  assets?: ProjectAsset[]
  conversations: ProjectConversation[]
}

interface ProjectApp {
  id: string
  name: string
  slug: string
  appType: string
  vertical?: string | null
  status: string
  runtime: string
  capabilitiesJson?: string | null
  configJson?: string | null
  createdAt: string
}

interface ProjectAppEvent {
  id: string
  projectAppId: string
  channelKey: string
  eventKey: string
  direction: 'emit' | 'listen' | 'bi'
  payloadJson: string
  source: string
  createdAt: string
}

interface RealtimeContract {
  runtime: 'project_backend' | 'workflow' | 'realtime'
  transport: 'sse+http' | 'workflow+http'
  channels: {
    key: string
    label: string
    description: string
    events: {
      key: string
      label: string
      direction: 'emit' | 'listen' | 'bi'
      description: string
    }[]
  }[]
}

interface ActiveAgentInfo {
  agentId: string
  agentName: string
  task?: string
}

interface ProjectViewProps {
  projectId: string
  refreshKey?: number
  activeAgents?: ActiveAgentInfo[]
  onBack: () => void
  onOpenDeliverable: (d: Deliverable) => void
  onLoadConversation: (id: string) => void
}

type EnrichedDeliverable = ProjectDeliverable & { conversationTitle: string; conversationId: string }
type ProjectDashboardTab = 'overview' | 'pieces' | 'resources' | 'tasks' | 'chat'

const API_BASE = '/api'

const CATEGORIES: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  logo: { label: 'Logos y marca', icon: Palette, color: '#ec4899' },
  graphic: { label: 'Piezas graficas', icon: LayoutList, color: '#8b5cf6' },
  web: { label: 'Webs y landing', icon: Globe, color: '#a855f7' },
  app: { label: 'Apps y SaaS', icon: Code, color: '#f59e0b' },
  video: { label: 'Videos', icon: Video, color: '#ef4444' },
  copy: { label: 'Copy & Contenido', icon: FileText, color: '#10b981' },
  seo: { label: 'SEO & Analytics', icon: BarChart3, color: '#3b82f6' },
  ads: { label: 'Ads', icon: BarChart3, color: '#14b8a6' },
}

const botColor: Record<string, string> = {
  web: '#a855f7',
  dev: '#f59e0b',
  seo: '#3b82f6',
  video: '#ef4444',
  ads: '#10b981',
  content: '#f97316',
  brand: '#ec4899',
}

function classifyDeliverable(d: ProjectDeliverable): string {
  const titleLower = (d.title || '').toLowerCase()
  const isBranding = ['logo', 'marca', 'brand', 'paleta', 'identidad', 'logotipo', 'isotipo'].some(k => titleLower.includes(k))
  const isGraphicPiece = ['flyer', 'flayer', 'banner', 'post', 'story', 'storie', 'carrusel', 'afiche', 'volante', 'pieza grafica'].some(k => titleLower.includes(k))

  if (isBranding && (d.botType === 'web' || d.botType === 'brand')) return 'logo'
  if (isGraphicPiece && d.type === 'design') return 'graphic'
  if (d.type === 'video') return 'video'
  if (d.type === 'code') return 'app'
  if (d.type === 'report') return 'seo'
  if (d.type === 'copy') return 'copy'
  if (d.botType === 'ads') return 'ads'
  if (d.type === 'design') return 'web'
  return 'other'
}

function parseCapabilities(value?: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []
  } catch {
    return []
  }
}

interface AppActionDefinition {
  key: string
  label: string
  description: string
}

interface RuntimeScenarioDefinition {
  key: string
  label: string
  description: string
}

type ProjectAppSnapshot =
  | {
      kind: 'saas'
      metrics: { totalWorkspaces: number; invitedUsers: number; activeSubscriptions: number; resolvedTickets: number }
      items: { workspaceId: string; companyName?: string; planId?: string; mrr?: number; status?: string }[]
    }
  | {
      kind: 'ecommerce'
      metrics: { totalProducts: number; activeCarts: number; paidOrders: number; fulfilledOrders: number }
      items: { orderId: string; paymentStatus?: string; fulfillmentStatus?: string; total?: number; customerEmail?: string }[]
    }
  | {
      kind: 'delivery'
      metrics: { totalOrders: number; assignedOrders: number; trackingOrders: number; deliveredOrders: number }
      items: { orderId: string; status: string; etaMinutes?: number; driverName?: string; total?: number }[]
    }
  | {
      kind: 'mobility'
      metrics: { totalRides: number; activeRides: number; pricedRides: number; completedRides: number }
      items: { rideId: string; status: string; etaMinutes?: number; estimatedTotal?: number; driverId?: string }[]
    }
  | {
      kind: 'chatflow'
      metrics: { totalFlows: number; publishedFlows: number; activeExecutions: number; executionLogs: number }
      flowItems: { flowId: string; version?: number; nodeCount?: number; publishedChannel?: string }[]
      executionItems: { executionId: string; flowId?: string; trigger?: string; logCount: number; status?: string; scenario?: string; output?: string; lastLevel?: string; lastMessage?: string }[]
    }
  | {
      kind: 'generic'
      metrics: { totalEvents: number; totalRecords?: number; assignedRecords?: number; completedRecords?: number }
      items?: { recordId: string; status?: string; ownerName?: string }[]
    }

const ProjectView = ({ projectId, refreshKey, activeAgents, onBack, onOpenDeliverable, onLoadConversation }: ProjectViewProps) => {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [convsOpen, setConvsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ProjectDashboardTab>('overview')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appEvents, setAppEvents] = useState<ProjectAppEvent[]>([])
  const [realtimeContract, setRealtimeContract] = useState<RealtimeContract | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [simulateLoading, setSimulateLoading] = useState(false)
  const [appActions, setAppActions] = useState<AppActionDefinition[]>([])
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null)
  const [appSnapshot, setAppSnapshot] = useState<ProjectAppSnapshot | null>(null)
  const [projectSnapshots, setProjectSnapshots] = useState<Record<string, ProjectAppSnapshot>>({})
  const [runtimeLoading, setRuntimeLoading] = useState(false)
  const [runtimeScenario, setRuntimeScenario] = useState('lead_capture')
  const [runtimeScenarios, setRuntimeScenarios] = useState<RuntimeScenarioDefinition[]>([])

  const fetchAppSnapshot = async (appId: string, headers?: HeadersInit) => {
    const snapshotRes = await fetch(`${API_BASE}/projects/${projectId}/apps/${appId}/snapshot`, { headers })
    if (snapshotRes.ok) {
      const payload = await snapshotRes.json()
      const snapshot = payload.snapshot ?? null
      setAppSnapshot(snapshot)
      if (snapshot) {
        setProjectSnapshots(prev => ({ ...prev, [appId]: snapshot }))
      }
      return
    }
    setAppSnapshot(null)
  }

  const fetchProject = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const token = localStorage.getItem('plury_token')
      const headers: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
      const [projectRes, snapshotsRes] = await Promise.all([
        fetch(`${API_BASE}/projects/${projectId}`, { headers }),
        fetch(`${API_BASE}/projects/${projectId}/apps-snapshots`, { headers }),
      ])

      if (projectRes.ok) {
        setProject(await projectRes.json())
      }

      if (snapshotsRes.ok) {
        const payload = await snapshotsRes.json()
        const nextSnapshots: Record<string, ProjectAppSnapshot> = {}
        for (const item of Array.isArray(payload.snapshots) ? payload.snapshots : []) {
          if (item?.appId && item?.snapshot) nextSnapshots[item.appId] = item.snapshot as ProjectAppSnapshot
        }
        setProjectSnapshots(nextSnapshots)
      } else {
        setProjectSnapshots({})
      }
    } catch (err) {
      console.error('Error fetching project:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveTab('overview')
    setConvsOpen(false)
  }, [projectId])

  // Re-fetch when refreshKey changes (new deliverable arrived)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchProject(false)
    }
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!project?.apps?.length) {
      setSelectedAppId(null)
      return
    }
    setSelectedAppId(current => current && project.apps?.some(app => app.id === current) ? current : project.apps?.[0]?.id ?? null)
  }, [project])

  useEffect(() => {
    if (!projectId || !selectedAppId) {
      setAppEvents([])
      setRealtimeContract(null)
      return
    }

    const fetchAppRuntimeData = async () => {
      setEventsLoading(true)
      try {
        const token = localStorage.getItem('plury_token')
        const headers: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
        const [eventsRes, contractRes, actionsRes, snapshotRes, runtimeOptionsRes] = await Promise.all([
          fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/events?limit=12`, { headers }),
          fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/realtime-contract`, { headers }),
          fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/actions`, { headers }),
          fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/snapshot`, { headers }),
          fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/runtime/options`, { headers }),
        ])

        if (eventsRes.ok) setAppEvents(await eventsRes.json())
        else setAppEvents([])

        if (contractRes.ok) {
          const payload = await contractRes.json()
          setRealtimeContract(payload.contract ?? null)
        } else {
          setRealtimeContract(null)
        }

        if (actionsRes.ok) {
          const payload = await actionsRes.json()
          setAppActions(Array.isArray(payload.actions) ? payload.actions : [])
        } else {
          setAppActions([])
        }

        if (snapshotRes.ok) {
          const payload = await snapshotRes.json()
          setAppSnapshot(payload.snapshot ?? null)
        } else setAppSnapshot(null)

        if (runtimeOptionsRes.ok) {
          const payload = await runtimeOptionsRes.json()
          const nextScenarios = Array.isArray(payload.scenarios) ? payload.scenarios as RuntimeScenarioDefinition[] : []
          setRuntimeScenarios(nextScenarios)
          if (nextScenarios[0]?.key) {
            setRuntimeScenario(current => nextScenarios.some(item => item.key === current) ? current : nextScenarios[0].key)
          }
        } else {
          setRuntimeScenarios([])
        }
      } catch (err) {
        console.error('Error fetching app runtime data:', err)
        setAppEvents([])
        setRealtimeContract(null)
        setAppActions([])
        setAppSnapshot(null)
        setRuntimeScenarios([])
      } finally {
        setEventsLoading(false)
      }
    }

    fetchAppRuntimeData()
  }, [projectId, selectedAppId])

  useEffect(() => {
    if (!projectId || !selectedAppId) return

    const token = localStorage.getItem('plury_token')
    const url = `${API_BASE}/projects/${projectId}/apps/${selectedAppId}/events/stream${token ? `?token=${token}` : ''}`
    const es = new EventSource(url)

    es.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as { type?: string; event?: ProjectAppEvent }
        if (data.type !== 'project_app_event' || !data.event) return

        const nextEvent = data.event
        setAppEvents(prev => {
          if (prev.some(event => event.id === nextEvent.id)) return prev
          return [nextEvent, ...prev].slice(0, 12)
        })
        const token = localStorage.getItem('plury_token')
        const headers: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
        void fetchAppSnapshot(selectedAppId, headers)
      } catch (err) {
        console.error('Error parsing app event stream:', err)
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
    }
  }, [projectId, selectedAppId])

  const runSimulation = async (appId: string) => {
    setSimulateLoading(true)
    try {
      const token = localStorage.getItem('plury_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch(`${API_BASE}/projects/${projectId}/apps/${appId}/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ count: 4 }),
      })
      if (!res.ok) throw new Error('simulate failed')

      const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
      const eventsRes = await fetch(`${API_BASE}/projects/${projectId}/apps/${appId}/events?limit=12`, {
        headers: authHeaders,
      })
      if (eventsRes.ok) setAppEvents(await eventsRes.json())
      await fetchAppSnapshot(appId, authHeaders)
    } catch (err) {
      console.error('Error simulating app events:', err)
    } finally {
      setSimulateLoading(false)
    }
  }

  const runAppAction = async (actionKey: string) => {
    if (!selectedAppId) return

    setActionLoadingKey(actionKey)
    try {
      const token = localStorage.getItem('plury_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/actions/${actionKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('action failed')
      await fetchAppSnapshot(selectedAppId, token ? { Authorization: `Bearer ${token}` } : undefined)
    } catch (err) {
      console.error('Error executing app action:', err)
    } finally {
      setActionLoadingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full animate-spin border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink-faint">Proyecto no encontrado</p>
        <button onClick={onBack} className="text-xs font-semibold text-primary hover:underline">Volver</button>
      </div>
    )
  }

  // Flatten all deliverables, keeping latest version per instanceId
  const allDeliverables: EnrichedDeliverable[] = []
  const seenInstances = new Set<string>()

  for (const conv of project.conversations) {
    for (const d of conv.deliverables) {
      const key = d.instanceId || d.id
      if (seenInstances.has(key)) continue
      seenInstances.add(key)
      allDeliverables.push({ ...d, conversationTitle: conv.title, conversationId: conv.id })
    }
  }

  const totalConversations = project.conversations.length
  const totalDeliverables = allDeliverables.length
  const totalApps = project.apps?.length || 0
  const totalAssets = project.assets?.length || 0
  const primaryPieceCount = totalApps + totalDeliverables
  const deliverableById = new Map(allDeliverables.map(deliverable => [deliverable.id, deliverable]))
  const assetsByCategory: Record<string, ProjectAsset[]> = {}
  for (const asset of project.assets || []) {
    if (!assetsByCategory[asset.category]) assetsByCategory[asset.category] = []
    assetsByCategory[asset.category].push(asset)
  }

  // Group by smart category
  const byCategory: Record<string, EnrichedDeliverable[]> = {}
  for (const d of allDeliverables) {
    const cat = classifyDeliverable(d)
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(d)
  }

  // Order categories as defined in CATEGORIES, skip empties
  const categoryOrder = Object.keys(CATEGORIES)
  const visibleCategories = categoryOrder.filter(cat => byCategory[cat]?.length)
  // Add 'other' at the end if present
  if (byCategory['other']?.length) visibleCategories.push('other')

  const handleOpenDeliverable = (d: ProjectDeliverable) => {
    onOpenDeliverable({
      id: d.id,
      title: d.title,
      type: d.type as Deliverable['type'],
      content: d.content,
      agent: d.botType,
      botType: d.botType,
    })
  }

  const selectedApp = project.apps?.find(app => app.id === selectedAppId) ?? null
  const deliverySummary = appSnapshot?.kind === 'delivery' ? appSnapshot : null
  const chatflowSummary = appSnapshot?.kind === 'chatflow' ? appSnapshot : null
  const mobilitySummary = appSnapshot?.kind === 'mobility' ? appSnapshot : null
  const saasSummary = appSnapshot?.kind === 'saas' ? appSnapshot : null
  const ecommerceSummary = appSnapshot?.kind === 'ecommerce' ? appSnapshot : null
  const genericSummary = appSnapshot?.kind === 'generic' ? appSnapshot : null
  const sortedConversations = [...project.conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const recentConversations = sortedConversations.slice(0, 3)
  const recentDeliverables = [...allDeliverables]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
  const overviewSuggestion = (() => {
    if (totalDeliverables === 0) return 'Empieza desde el chat y crea la primera pieza del proyecto.'
    if (totalAssets === 0) return 'Guarda recursos reutilizables para que nuevas piezas hereden marca e imagenes.'
    if (totalConversations <= 1) return 'Sigue trabajando desde el chat del proyecto para mantener el contexto unido.'
    return 'Revisa tus piezas recientes y decide cual debe quedar como principal.'
  })()
  const tabItems: Array<{ id: ProjectDashboardTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Resumen' },
    { id: 'pieces', label: 'Piezas', count: primaryPieceCount },
    { id: 'resources', label: 'Recursos', count: totalAssets },
    { id: 'tasks', label: 'Tareas' },
    { id: 'chat', label: 'Chat', count: totalConversations },
  ]

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-edge">
        <div className="px-6 py-4">
          <nav className="flex items-center gap-1.5 text-xs text-ink-faint mb-3">
            <button onClick={onBack} className="font-semibold hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft size={13} />
              Inicio
            </button>
            <span className="text-ink-faint/40">/</span>
            <span className="font-semibold text-ink truncate max-w-[200px]">{project.name}</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-ink">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-ink-faint mt-1">{project.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Code size={13} />
              <span className="font-semibold">{primaryPieceCount}</span> piezas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Palette size={13} />
              <span className="font-semibold">{totalAssets}</span> recursos
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <MessageSquare size={13} />
              <span className="font-semibold">{totalConversations}</span> chats
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <BarChart3 size={13} />
              <span className="font-semibold">{totalDeliverables}</span> entregas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Calendar size={13} />
              {new Date(project.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tabItems.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-edge text-ink-faint hover:text-ink hover:border-primary/20'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-subtle text-ink-faint'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {activeTab === 'overview' && (
        <>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-edge bg-surface px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Principal</p>
            <p className="text-sm font-semibold text-ink mt-2">
              {project.apps?.[0]?.name || allDeliverables[0]?.title || 'Aun no has creado una pieza principal'}
            </p>
            <p className="text-xs text-ink-faint mt-1">
              {project.apps?.[0]
                ? `${project.apps[0].appType} activa en este proyecto`
                : allDeliverables[0]
                  ? 'Ultima pieza creada en este proyecto'
                  : 'Empieza desde el chat y luego organiza el resultado aqui'}
            </p>
          </div>
          <div className="rounded-2xl border border-edge bg-surface px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Recursos</p>
            <p className="text-sm font-semibold text-ink mt-2">
              {totalAssets > 0 ? `${totalAssets} recurso${totalAssets === 1 ? '' : 's'} disponible${totalAssets === 1 ? '' : 's'}` : 'Aun no has guardado recursos'}
            </p>
            <p className="text-xs text-ink-faint mt-1">
              Logos, imagenes, videos y copy reutilizable viven aqui.
            </p>
          </div>
          <div className="rounded-2xl border border-edge bg-surface px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Historial</p>
            <p className="text-sm font-semibold text-ink mt-2">
              {totalConversations > 0 ? `${totalConversations} chat${totalConversations === 1 ? '' : 's'} asociado${totalConversations === 1 ? '' : 's'}` : 'Sin chats asociados'}
            </p>
            <p className="text-xs text-ink-faint mt-1">
              {overviewSuggestion}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-edge bg-surface px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Ultimas piezas</p>
                <p className="text-sm font-semibold text-ink mt-1">Lo mas reciente del proyecto</p>
              </div>
              <button type="button" onClick={() => setActiveTab('pieces')} className="text-xs font-semibold text-primary hover:underline">
                Ver piezas
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {recentDeliverables.length === 0 ? (
                <p className="text-xs text-ink-faint">Todavia no hay piezas guardadas.</p>
              ) : (
                recentDeliverables.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenDeliverable(item)}
                    className="w-full rounded-xl border border-edge bg-surface-alt px-3 py-3 text-left hover:border-primary/30 transition-colors"
                  >
                    <p className="text-sm font-semibold text-ink truncate">{item.title.replace(/\s*\(refinado\)/, '')}</p>
                    <p className="text-[11px] text-ink-faint mt-1 truncate">{item.conversationTitle}</p>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-edge bg-surface px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Chats recientes</p>
                <p className="text-sm font-semibold text-ink mt-1">Contexto activo del proyecto</p>
              </div>
              <button type="button" onClick={() => setActiveTab('chat')} className="text-xs font-semibold text-primary hover:underline">
                Ver chat
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {recentConversations.length === 0 ? (
                <p className="text-xs text-ink-faint">Este proyecto aun no tiene chats asociados.</p>
              ) : (
                recentConversations.map(conv => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onLoadConversation(conv.id)}
                    className="w-full rounded-xl border border-edge bg-surface-alt px-3 py-3 text-left hover:border-primary/30 transition-colors"
                  >
                    <p className="text-sm font-semibold text-ink truncate">{conv.title}</p>
                    <p className="text-[11px] text-ink-faint mt-1 truncate">
                      {conv.messages[0]?.sender ? `${conv.messages[0].sender}: ${conv.messages[0].text}` : 'Sin mensajes visibles'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        </>
        )}

        {/* Active agents working indicator */}
        {(activeTab === 'overview' || activeTab === 'tasks') && activeAgents && activeAgents.length > 0 && (
          <div className="space-y-2">
            {activeAgents.map(a => (
              <div key={a.agentId} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-ink">Actualizando proyecto</span>
                <span className="text-xs text-ink-faint flex-1 truncate">{a.task || 'Construyendo una nueva pieza...'}</span>
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-primary border-t-transparent" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'resources' && project.assets && project.assets.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-fuchsia-500/10">
                <Palette size={15} className="text-fuchsia-500" />
              </div>
              <h2 className="text-sm font-bold text-ink">Recursos reutilizables</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-500">
                {totalAssets}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Object.keys(CATEGORIES)
                .filter(category => project.assets?.some(asset => asset.category === category))
                .map(category => {
                  const config = CATEGORIES[category]
                  const Icon = config.icon
                  const count = project.assets?.filter(asset => asset.category === category).length ?? 0
                  return (
                    <div key={category} className="rounded-2xl border border-edge bg-surface px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}16`, color: config.color }}>
                          <Icon size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ink">{config.label}</p>
                          <p className="text-[11px] text-ink-faint">{count} recurso{count === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="mt-6 space-y-6">
              {Object.keys(CATEGORIES)
                .filter(category => assetsByCategory[category]?.length)
                .map(category => {
                  const config = CATEGORIES[category]
                  const Icon = config.icon
                  const assets = assetsByCategory[category]

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${config.color}15` }}
                        >
                          <Icon size={15} style={{ color: config.color }} />
                        </div>
                        <h3 className="text-sm font-bold text-ink">{config.label}</h3>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${config.color}15`, color: config.color }}
                        >
                          {assets.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {assets.map(asset => {
                          const linkedDeliverable = asset.deliverableId ? deliverableById.get(asset.deliverableId) : undefined
                          const publishedUrl = asset.deliverable ? getPublishedUrl(asset.deliverable) : null
                          const canOpen = !!linkedDeliverable

                          return (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => linkedDeliverable ? handleOpenDeliverable(linkedDeliverable) : undefined}
                              className={`rounded-xl border bg-surface-alt p-4 text-left transition-colors ${canOpen ? 'border-edge hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5' : 'border-edge/70 cursor-default'}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-ink truncate">{asset.name}</p>
                                  <p className="text-[11px] text-ink-faint mt-0.5 truncate">
                                    {asset.deliverable?.title || 'Recurso guardado'}
                                  </p>
                                </div>
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                >
                                  {asset.deliverable?.thumbnailUrl ? (
                                    <img
                                      src={asset.deliverable.thumbnailUrl}
                                      alt={asset.name}
                                      className="w-10 h-10 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <Icon size={16} />
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {asset.deliverable?.type && (
                                  <span className="text-[10px] font-medium text-ink-faint bg-subtle px-2 py-1 rounded-full">
                                    {asset.deliverable.type}
                                  </span>
                                )}
                                {asset.deliverable?.botType && (
                                  <span className="text-[10px] font-medium text-ink-faint bg-subtle px-2 py-1 rounded-full">
                                    {asset.deliverable.botType}
                                  </span>
                                )}
                                <span className="text-[10px] font-medium text-ink-faint bg-subtle px-2 py-1 rounded-full">
                                  {new Date(asset.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-[11px] text-ink-faint">
                                  {canOpen ? 'Abrir en canvas' : 'Sin preview local'}
                                </span>
                                {publishedUrl && (
                                  <a
                                    href={publishedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={event => event.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                  >
                                    <ExternalLink size={12} />
                                    Live
                                  </a>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {project.apps && project.apps.length > 0 && (activeTab === 'pieces' || activeTab === 'tasks') && (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10">
                <Code size={15} className="text-amber-500" />
              </div>
              <h2 className="text-sm font-bold text-ink">{activeTab === 'tasks' ? 'Pieza activa para operar' : 'Piezas principales'}</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                {project.apps.length}
              </span>
            </div>

            {activeTab === 'tasks' && (
              <div className="flex flex-wrap gap-2 mb-4">
                {project.apps.map(app => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedAppId(app.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                      selectedAppId === app.id
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-edge text-ink-faint hover:text-ink hover:border-primary/20'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'pieces' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {project.apps.map(app => {
                const capabilities = parseCapabilities(app.capabilitiesJson)
                const cardSnapshot = projectSnapshots[app.id]
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedAppId(app.id)}
                    className={`rounded-xl border bg-surface-alt p-4 text-left transition-colors ${selectedAppId === app.id ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-edge hover:border-primary/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{app.name}</p>
                    <p className="text-[11px] text-ink-faint mt-0.5">{app.appType} · {app.runtime}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        {app.status}
                      </span>
                    </div>
                    {app.vertical && (
                      <p className="text-[11px] text-ink-faint mt-3">Vertical: {app.vertical}</p>
                    )}
                    {cardSnapshot?.kind === 'delivery' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Pedidos</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.totalOrders}</p>
                        </div>
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Entregados</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.deliveredOrders}</p>
                        </div>
                      </div>
                    )}
                    {cardSnapshot?.kind === 'mobility' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Viajes</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.totalRides}</p>
                        </div>
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Activos</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.activeRides}</p>
                        </div>
                      </div>
                    )}
                    {cardSnapshot?.kind === 'chatflow' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Flows</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.totalFlows}</p>
                        </div>
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Runs</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.activeExecutions}</p>
                        </div>
                      </div>
                    )}
                    {cardSnapshot?.kind === 'saas' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Workspaces</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.totalWorkspaces}</p>
                        </div>
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Subs activas</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.activeSubscriptions}</p>
                        </div>
                      </div>
                    )}
                    {cardSnapshot?.kind === 'ecommerce' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Productos</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.totalProducts}</p>
                        </div>
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Ordenes paid</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.paidOrders}</p>
                        </div>
                      </div>
                    )}
                    {cardSnapshot?.kind === 'generic' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Eventos</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.totalEvents}</p>
                        </div>
                        <div className="rounded-lg bg-subtle px-2 py-2">
                          <p className="text-[10px] text-ink-faint">Completados</p>
                          <p className="text-xs font-semibold text-ink">{cardSnapshot.metrics.completedRecords ?? 0}</p>
                        </div>
                      </div>
                    )}
                    {capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {capabilities.slice(0, 5).map(capability => (
                          <span key={capability} className="text-[10px] font-medium text-ink-faint bg-subtle px-2 py-1 rounded-full">
                            {capability}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            )}

            {activeTab === 'tasks' && selectedApp && (
              <div className="mt-4 rounded-xl border border-edge bg-surface-alt p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Actividad de la pieza · {selectedApp.name}</p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                      {selectedApp.appType} · {realtimeContract?.transport || selectedApp.runtime} · live stream
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runSimulation(selectedApp.id)}
                    disabled={simulateLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    <Play size={12} />
                    {simulateLoading ? 'Simulando...' : 'Simular eventos'}
                  </button>
                </div>

                {realtimeContract && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {realtimeContract.channels.map(channel => (
                      <div key={channel.key} className="rounded-lg border border-edge bg-subtle p-3">
                        <div className="flex items-center gap-2">
                          <Radio size={13} className="text-primary" />
                          <p className="text-xs font-semibold text-ink">{channel.label}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-faint">{channel.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {channel.events.map(event => (
                            <span key={event.key} className="rounded-full bg-surface px-2 py-1 text-[10px] font-medium text-ink-faint">
                              {event.key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {appActions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">Acciones operativas</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {appActions.map(action => (
                        <button
                          key={action.key}
                          type="button"
                          onClick={() => runAppAction(action.key)}
                          disabled={actionLoadingKey === action.key}
                          className="rounded-lg border border-edge bg-subtle px-3 py-3 text-left transition-colors hover:border-primary/30 disabled:opacity-60"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold text-ink">{action.label}</p>
                            {actionLoadingKey === action.key && <div className="w-3.5 h-3.5 rounded-full animate-spin border-2 border-primary border-t-transparent" />}
                          </div>
                          <p className="mt-1 text-[10px] text-ink-faint">{action.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {runtimeScenarios.length > 0 && !chatflowSummary && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-ink">Runtime operativo</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={runtimeScenario}
                          onChange={event => setRuntimeScenario(event.target.value)}
                          className="rounded-lg border border-edge bg-surface px-2.5 py-2 text-[11px] text-ink"
                        >
                          {runtimeScenarios.map(item => (
                            <option key={item.key} value={item.key}>{item.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedAppId) return
                            setRuntimeLoading(true)
                            try {
                              const token = localStorage.getItem('plury_token')
                              const headers: HeadersInit = {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              }
                              const res = await fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/runtime/execute`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({ scenario: runtimeScenario, trigger: `workspace_${runtimeScenario}` }),
                              })
                              if (!res.ok) throw new Error('runtime failed')
                              const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
                              const eventsRes = await fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/events?limit=12`, {
                                headers: authHeaders,
                              })
                              if (eventsRes.ok) setAppEvents(await eventsRes.json())
                              await fetchAppSnapshot(selectedAppId, authHeaders)
                            } catch (err) {
                              console.error('Error executing runtime:', err)
                            } finally {
                              setRuntimeLoading(false)
                            }
                          }}
                          disabled={runtimeLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60"
                        >
                          <Play size={12} />
                          {runtimeLoading ? 'Ejecutando...' : 'Ejecutar runtime'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {deliverySummary && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">Panel operativo delivery</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Pedidos</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{deliverySummary.metrics.totalOrders}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Asignados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{deliverySummary.metrics.assignedOrders}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Tracking activo</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{deliverySummary.metrics.trackingOrders}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Entregados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{deliverySummary.metrics.deliveredOrders}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {deliverySummary.items.map(item => (
                        <div key={item.orderId} className="rounded-lg border border-edge bg-subtle p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold text-ink">{item.orderId}</p>
                            <span className="rounded-full bg-surface px-2 py-1 text-[10px] text-ink-faint">{item.status}</span>
                          </div>
                          <p className="mt-2 text-[10px] text-ink-faint">Driver: {item.driverName || 'pendiente'}</p>
                          <p className="text-[10px] text-ink-faint">ETA: {item.etaMinutes ? `${item.etaMinutes} min` : 'sin tracking'}</p>
                          <p className="text-[10px] text-ink-faint">Total: {typeof item.total === 'number' ? `$${item.total}` : 'n/a'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mobilitySummary && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">Panel operativo movilidad</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Viajes</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{mobilitySummary.metrics.totalRides}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Activos</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{mobilitySummary.metrics.activeRides}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Con tarifa</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{mobilitySummary.metrics.pricedRides}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Completados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{mobilitySummary.metrics.completedRides}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {mobilitySummary.items.map(item => (
                        <div key={item.rideId} className="rounded-lg border border-edge bg-subtle p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold text-ink">{item.rideId}</p>
                            <span className="rounded-full bg-surface px-2 py-1 text-[10px] text-ink-faint">{item.status}</span>
                          </div>
                          <p className="mt-2 text-[10px] text-ink-faint">Driver: {item.driverId || 'pendiente'}</p>
                          <p className="text-[10px] text-ink-faint">ETA: {item.etaMinutes ? `${item.etaMinutes} min` : 'sin tracking'}</p>
                          <p className="text-[10px] text-ink-faint">Estimado: {typeof item.estimatedTotal === 'number' ? `$${item.estimatedTotal}` : 'n/a'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {saasSummary && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">Panel operativo SaaS</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Workspaces</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{saasSummary.metrics.totalWorkspaces}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Usuarios invitados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{saasSummary.metrics.invitedUsers}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Subs activas</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{saasSummary.metrics.activeSubscriptions}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Tickets resueltos</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{saasSummary.metrics.resolvedTickets}</p>
                      </div>
                    </div>
                  </div>
                )}

                {ecommerceSummary && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">Panel operativo e-commerce</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Productos</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{ecommerceSummary.metrics.totalProducts}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Carritos</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{ecommerceSummary.metrics.activeCarts}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Ordenes paid</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{ecommerceSummary.metrics.paidOrders}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Fulfilled</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{ecommerceSummary.metrics.fulfilledOrders}</p>
                      </div>
                    </div>
                  </div>
                )}

                {genericSummary && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">Panel operativo base</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Eventos</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{genericSummary.metrics.totalEvents}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Registros</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{genericSummary.metrics.totalRecords ?? 0}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Asignados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{genericSummary.metrics.assignedRecords ?? 0}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Completados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{genericSummary.metrics.completedRecords ?? 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                {chatflowSummary && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-ink">Panel operativo chatflow</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={runtimeScenario}
                          onChange={event => setRuntimeScenario(event.target.value)}
                          className="rounded-lg border border-edge bg-surface px-2.5 py-2 text-[11px] text-ink"
                        >
                          {runtimeScenarios.map(item => (
                            <option key={item.key} value={item.key}>{item.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedAppId || selectedApp?.appType !== 'chatflow') return
                            setRuntimeLoading(true)
                            try {
                              const token = localStorage.getItem('plury_token')
                              const headers: HeadersInit = {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              }
                              const res = await fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/runtime/execute`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({
                                  scenario: runtimeScenario,
                                  trigger: `workspace_${runtimeScenario}`,
                                  contact: 'demo@plury.co',
                                }),
                              })
                              if (!res.ok) throw new Error('runtime failed')
                              const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
                              const eventsRes = await fetch(`${API_BASE}/projects/${projectId}/apps/${selectedAppId}/events?limit=12`, {
                                headers: authHeaders,
                              })
                              if (eventsRes.ok) setAppEvents(await eventsRes.json())
                              await fetchAppSnapshot(selectedAppId, authHeaders)
                            } catch (err) {
                              console.error('Error executing chatflow runtime:', err)
                            } finally {
                              setRuntimeLoading(false)
                            }
                          }}
                          disabled={runtimeLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60"
                        >
                          <Play size={12} />
                          {runtimeLoading ? 'Ejecutando...' : 'Test runtime'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Flows</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{chatflowSummary.metrics.totalFlows}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Publicados</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{chatflowSummary.metrics.publishedFlows}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Ejecuciones</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{chatflowSummary.metrics.activeExecutions}</p>
                      </div>
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[10px] text-ink-faint">Logs</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{chatflowSummary.metrics.executionLogs}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[11px] font-semibold text-ink">Flows recientes</p>
                        <div className="mt-3 space-y-2">
                          {chatflowSummary.flowItems.length === 0 ? (
                            <p className="text-[10px] text-ink-faint">Sin flows guardados todavia.</p>
                          ) : (
                            chatflowSummary.flowItems.map(item => (
                              <div key={item.flowId} className="rounded-lg border border-edge bg-surface p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] font-semibold text-ink">{item.flowId}</p>
                                  <span className="rounded-full bg-subtle px-2 py-1 text-[10px] text-ink-faint">
                                    v{item.version ?? 1}
                                  </span>
                                </div>
                                <p className="mt-2 text-[10px] text-ink-faint">Nodos: {item.nodeCount ?? 0}</p>
                                <p className="text-[10px] text-ink-faint">Canal activo: {item.publishedChannel || 'draft'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-edge bg-subtle p-3">
                        <p className="text-[11px] font-semibold text-ink">Ejecuciones recientes</p>
                        <div className="mt-3 space-y-2">
                          {chatflowSummary.executionItems.length === 0 ? (
                            <p className="text-[10px] text-ink-faint">Sin ejecuciones todavia.</p>
                          ) : (
                            chatflowSummary.executionItems.map(item => (
                              <div key={item.executionId} className="rounded-lg border border-edge bg-surface p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] font-semibold text-ink">{item.executionId}</p>
                                  <span className="rounded-full bg-subtle px-2 py-1 text-[10px] text-ink-faint">
                                    {item.logCount} logs
                                  </span>
                                </div>
                                <p className="mt-2 text-[10px] text-ink-faint">Flow: {item.flowId || 'n/a'}</p>
                                <p className="text-[10px] text-ink-faint">Trigger: {item.trigger || 'manual'}</p>
                                <p className="text-[10px] text-ink-faint">Escenario: {item.scenario || 'n/a'}</p>
                                <p className="text-[10px] text-ink-faint">Estado: {item.status || 'running'}</p>
                                <p className="text-[10px] text-ink-faint">Salida: {item.output || 'sin salida final'}</p>
                                <p className="text-[10px] text-ink-faint">Ultimo log: {item.lastLevel || 'info'} · {item.lastMessage || 'sin mensajes'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink">Actividad reciente</p>
                  {eventsLoading ? (
                    <div className="mt-3 text-[11px] text-ink-faint">Cargando eventos...</div>
                  ) : appEvents.length === 0 ? (
                    <div className="mt-3 text-[11px] text-ink-faint">No hay eventos todavia para esta app.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {appEvents.map(event => (
                        <div key={event.id} className="rounded-lg border border-edge bg-subtle p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold text-ink">{event.eventKey}</p>
                              <p className="text-[10px] text-ink-faint">{event.channelKey} · {event.source}</p>
                            </div>
                            <span className="text-[10px] text-ink-faint">
                              {new Date(event.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <pre className="mt-2 overflow-x-auto rounded-md bg-surface px-2 py-2 text-[10px] text-ink-faint">
                            {event.payloadJson}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deliverable categories */}
        {activeTab === 'pieces' && totalDeliverables === 0 && (!activeAgents || activeAgents.length === 0) ? (
          <div className="text-center py-16">
            <Globe size={40} className="mx-auto text-ink-faint/20 mb-3" />
            <p className="text-sm text-ink-faint">Este proyecto aun no tiene piezas</p>
            <p className="text-xs text-ink-faint/60 mt-1">Crea algo desde el chat y organizalo aqui</p>
          </div>
        ) : activeTab === 'pieces' && totalDeliverables > 0 ? (
          visibleCategories.map(cat => {
            const items = byCategory[cat]
            const config = CATEGORIES[cat] || { label: 'Otros', icon: FileText, color: '#6b7280' }
            const Icon = config.icon
            const color = config.color

            return (
              <div key={cat}>
                {/* Section header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <h2 className="text-sm font-bold text-ink">{config.label}</h2>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Asset cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(d => {
                    const bColor = botColor[d.botType] || '#6b7280'
                    const isVisual = ['design', 'code'].includes(d.type)
                    const isVideo = d.type === 'video'
                    const isText = ['copy', 'report'].includes(d.type)

                    return (
                      <button
                        key={d.id}
                        onClick={() => handleOpenDeliverable(d)}
                        className="group text-left rounded-xl border border-edge bg-surface-alt hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
                      >
                        {/* Thumbnail area */}
                        {isVisual && d.content && (
                          <div className="relative h-36 bg-subtle overflow-hidden">
                            <iframe
                              srcDoc={d.content}
                              className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                              sandbox="allow-scripts allow-same-origin"
                              title={d.title}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-surface-alt/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                              <ExternalLink size={14} className="text-primary" />
                            </div>
                          </div>
                        )}

                        {isVideo && (
                          <div className="relative h-36 bg-subtle flex items-center justify-center overflow-hidden">
                            <div
                              className="w-14 h-14 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <Video size={24} style={{ color }} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-surface-alt/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}

                        {isText && d.content && (
                          <div className="h-28 bg-subtle overflow-hidden px-3 py-2.5">
                            <p className="text-[11px] leading-relaxed text-ink-faint/70 line-clamp-6">
                              {d.content.replace(/<[^>]*>/g, '').slice(0, 300)}
                            </p>
                          </div>
                        )}

                        {/* Card body */}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
                                {d.title.replace(/\s*\(refinado\)/, '')}
                              </p>
                              <p className="text-[11px] text-ink-faint mt-0.5 truncate">{d.conversationTitle}</p>
                            </div>
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ backgroundColor: bColor }}
                              title={`Agente: ${d.botType}`}
                            >
                              {d.botType?.charAt(0)?.toUpperCase()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-ink-faint">
                              {new Date(d.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                            </span>
                            {getPublishedUrl(d) && (
                              <a
                                href={getPublishedUrl(d)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[10px] font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
                              >
                                <Globe size={9} /> Publicado
                              </a>
                            )}
                            {d.version && d.version > 1 && (
                              <span className="text-[10px] font-semibold text-ink-faint bg-subtle px-1.5 py-0.5 rounded">v{d.version}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        ) : null}

        {/* Conversations section — collapsible */}
        {activeTab === 'chat' && project.conversations.length > 0 && (
          <div>
            <button
              onClick={() => setConvsOpen(prev => !prev)}
              className="flex items-center gap-2 mb-3 w-full text-left group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
                <MessageSquare size={15} className="text-primary" />
              </div>
              <h2 className="text-sm font-bold text-ink">Historial de chat</h2>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                {project.conversations.length}
              </span>
              <div className="ml-auto text-ink-faint group-hover:text-ink transition-colors">
                {convsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {convsOpen && (
              <div className="space-y-1.5">
                {project.conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => onLoadConversation(conv.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-edge hover:border-primary/30 hover:bg-subtle transition-all text-left"
                  >
                    <MessageSquare size={14} className="text-ink-faint flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{conv.title}</p>
                      {conv.messages[0] && (
                        <p className="text-[11px] text-ink-faint truncate mt-0.5">
                          {conv.messages[0].sender}: {conv.messages[0].text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conv.deliverables.length > 0 && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {conv.deliverables.length} resultado{conv.deliverables.length === 1 ? '' : 's'}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-faint">
                        {new Date(conv.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (!project.assets || project.assets.length === 0) && (
          <div className="text-center py-16">
            <Palette size={40} className="mx-auto text-ink-faint/20 mb-3" />
            <p className="text-sm text-ink-faint">Este proyecto aun no tiene recursos guardados</p>
            <p className="text-xs text-ink-faint/60 mt-1">Cuando generes logos, imagenes o videos reutilizables apareceran aqui.</p>
          </div>
        )}

        {activeTab === 'tasks' && (() => {
          // Collect all kanban tasks from all conversations in this project
          const allKanbanTasks: (ProjectKanbanTask & { conversationTitle: string })[] = []
          for (const conv of project.conversations) {
            for (const task of conv.kanbanTasks || []) {
              allKanbanTasks.push({ ...task, conversationTitle: conv.title })
            }
          }
          const planningTasks = allKanbanTasks.filter(t => t.status === 'todo')
          const inProgressTasks = allKanbanTasks.filter(t => t.status === 'doing')
          const completedTasks = allKanbanTasks.filter(t => t.status === 'done')

          if (allKanbanTasks.length === 0 && (!project.apps || project.apps.length === 0)) {
            return (
              <div className="text-center py-16">
                <LayoutList size={40} className="mx-auto text-ink-faint/20 mb-3" />
                <p className="text-sm text-ink-faint">Todavia no hay tareas en este proyecto</p>
                <p className="text-xs text-ink-faint/60 mt-1">Las tareas aparecen automaticamente cuando trabajas desde el chat.</p>
              </div>
            )
          }

          if (allKanbanTasks.length > 0) {
            const KanbanColumn = ({ title, tasks, color, emptyMsg }: { title: string; tasks: typeof allKanbanTasks; color: string; emptyMsg: string }) => (
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="text-xs font-bold text-ink">{title}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {tasks.length === 0 ? (
                    <p className="text-[11px] text-ink-faint/50 text-center py-4">{emptyMsg}</p>
                  ) : tasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => t.deliverable ? handleOpenDeliverable({ ...t.deliverable, content: '', createdAt: t.createdAt } as ProjectDeliverable) : undefined}
                      className={`w-full text-left p-3 rounded-xl border border-edge bg-surface hover:border-primary/30 transition-all ${t.deliverable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <p className="text-xs font-semibold text-ink truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold"
                          style={{ backgroundColor: botColor[t.botType] || '#6b7280' }}>
                          {t.botType?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-[10px] text-ink-faint truncate">{t.agent}</span>
                      </div>
                      <p className="text-[10px] text-ink-faint/60 mt-1 truncate">{t.conversationTitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            )

            return (
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
                    <LayoutList size={15} className="text-primary" />
                  </div>
                  <h2 className="text-sm font-bold text-ink">Kanban del proyecto</h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {allKanbanTasks.length}
                  </span>
                </div>
                <div className="flex gap-4 overflow-hidden">
                  <KanbanColumn title="Planificacion" tasks={planningTasks} color="#6366f1" emptyMsg="Sin tareas pendientes" />
                  <KanbanColumn title="En Proceso" tasks={inProgressTasks} color="#f59e0b" emptyMsg="Nada en proceso" />
                  <KanbanColumn title="Completado" tasks={completedTasks} color="#10b981" emptyMsg="Sin completadas" />
                </div>
              </div>
            )
          }

          return null
        })()}

        {activeTab === 'chat' && project.conversations.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto text-ink-faint/20 mb-3" />
            <p className="text-sm text-ink-faint">Este proyecto aun no tiene chats asociados</p>
            <p className="text-xs text-ink-faint/60 mt-1">Usa el chat del proyecto para empezar a construir algo.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectView
function getPublishedUrl(deliverable: { publishSlug?: string | null; customDomain?: string | null }): string | null {
  if (deliverable.customDomain) return `https://${deliverable.customDomain}`
  if (deliverable.publishSlug) return `https://${deliverable.publishSlug}.plury.co`
  return null
}
