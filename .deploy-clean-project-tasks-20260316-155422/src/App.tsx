import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { MessageCircle, Pencil, PanelLeftClose, PanelLeftOpen, X, Save, Check, Loader2, Package, Layers3, Globe, Film, FileText } from 'lucide-react'
import type { AdminTab } from './components/admin/AdminDashboard'
import { agents } from './data/agents'
import { quickActions } from './data/quickActions'
import { useChat } from './hooks/useChat'
import { useSpecialists } from './hooks/useSpecialists'
import { useAuth } from './contexts/AuthContext'
import type { Deliverable } from './types'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ChatView from './components/chat/ChatView'
import ProjectTasksView from './components/tasks/ProjectTasksView'
import SettingsView from './components/settings/SettingsView'
import MarketplaceView from './components/marketplace/MarketplaceView'
import WorkspacePanel from './components/workspace/WorkspacePanel'
const WorkflowEditor = lazy(lazyWithReload(() => import('./components/workflow/WorkflowEditor'), 'workflow-editor'))
import EditPanel from './components/workspace/EditPanel'
import DevSettingsPanel from './components/workspace/DevSettingsPanel'
import UnsplashModal from './components/workspace/UnsplashModal'
import { ensureBridgeScriptInWebContainer } from './components/workspace/WebContainerPreview'
import AdminDashboard from './components/admin/AdminDashboard'
import ProjectView from './components/projects/ProjectView'
import LandingPage from './components/landing/LandingPage'
import LandingPageV2 from './components/landing/LandingPageV2'
import DocsPage from './components/docs/DocsPage'
import _SectionNavigator from './components/workspace/SectionNavigator'
import type { DetectedSection } from './components/workspace/SectionNavigator'
import type { SelectedElement } from './components/workspace/VisualEditToolbar'
import { lazyWithReload } from './utils/lazyWithReload'

const App = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/'
  const showLandingV2 = pathname === '/landingv2'
  const showDocs = pathname === '/docs'
  const { user, isLoading, updateCreditBalance } = useAuth()
  const isAuthenticated = !!user
  const pendingPromptSent = useRef(false)

  // Core state — chat is always the main view
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminSubTab, setAdminSubTab] = useState<AdminTab>('users')
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null)
  const [projectMode, setProjectMode] = useState<{ projectId: string; projectName: string } | null>(null)
  const [projectRefreshKey, setProjectRefreshKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Start collapsed, will expand if user has history
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<'chat' | 'resources' | 'edit' | 'settings'>('chat')
  const [chatPanelVisible, setChatPanelVisible] = useState(true)

  // Drawer/modal overlays
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Visual edit state
  const [editMode, setEditMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<{ index: number; src: string; style: string } | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [devUnsplashOpen, setDevUnsplashOpen] = useState(false)
  const [pendingEditsCount, setPendingEditsCount] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Section navigator state
  const [detectedSections, setDetectedSections] = useState<DetectedSection[]>([])

  useEffect(() => {
    (window as any).__selectedLogoForRefine = selectedLogo
  }, [selectedLogo])

  // Listen for messages from WebContainer iframes (dev projects)
  const editModeRef = useRef(editMode)
  editModeRef.current = editMode
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        setSelectedElement({
          tag: e.data.tag,
          text: e.data.text,
          isImage: e.data.isImage,
          imageSrc: e.data.imageSrc,
          rect: e.data.rect,
          classes: e.data.classes,
          elementLabel: e.data.elementLabel,
        })
        setSidePanelTab('edit')
      }
      if (e.data?.type === 'element-deselected') {
        setSelectedElement(null)
      }
      // Bridge script loaded/reloaded (e.g. after Vite HMR) — re-send edit mode state
      if (e.data?.type === 'plury-bridge-ready' && editModeRef.current) {
        const source = e.source as Window | null
        if (source) {
          source.postMessage({ type: 'toggle-edit-mode', enabled: true }, '*')
        }
      }
      // Track pending edit count from bridge
      if (e.data?.type === 'plury-has-edits') {
        setPendingEditsCount(e.data.count || 0)
        setSaveStatus('idle')
      }
      // Receive collected edits for save
      if (e.data?.type === 'visual-edits-response') {
        saveVisualEdits(e.data.edits, e.data.theme)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Save visual edits to backend
  const saveVisualEdits = useCallback(async (edits: any[], theme: any) => {
    if (!activeDeliverable) return
    setSaveStatus('saving')
    try {
      const resp = await fetch(`/api/deploy/${activeDeliverable.id}/visual-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, edits }),
      })
      if (resp.ok) {
        setSaveStatus('saved')
        setPendingEditsCount(0)
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('idle')
    }
  }, [activeDeliverable])

  const handleSaveEdits = useCallback(() => {
    // Ask bridge script for collected edits
    document.querySelectorAll('iframe').forEach(f =>
      f.contentWindow?.postMessage({ type: 'get-visual-edits' }, '*')
    )
  }, [])

  // Workflow editor state
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [workflowPrompt, setWorkflowPrompt] = useState('')

  const handleDeliverable = (d: Deliverable) => {
    if (projectMode) {
      // In project mode, don't auto-open each deliverable — just refresh the hub
      setProjectRefreshKey(k => k + 1)
      return
    }
    setActiveDeliverable(d)
    setSidebarCollapsed(true)
    setChatPanelVisible(window.innerWidth >= 768)
  }

  const handleProjectCreated = (project: { id: string; name: string }) => {
    setProjectMode({ projectId: project.id, projectName: project.name })
    setSidebarCollapsed(true)
    setChatPanelVisible(window.innerWidth >= 768)
  }

  const handleOpenProject = (projectId: string) => {
    const project = chat.projects.find(item => item.id === projectId)
    const latestProjectConversation = chat.conversations
      .filter(conv => conv.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    setProjectMode({
      projectId,
      projectName: project?.name || 'Proyecto',
    })
    setShowAdmin(false)
    setMobileMenuOpen(false)
    setActiveDeliverable(null)
    setWorkflowOpen(false)
    setWorkflowPrompt('')
    setShowTasks(false)
    setSidebarCollapsed(true)
    setChatPanelVisible(window.innerWidth >= 768)
    setSidePanelTab('chat')

    if (latestProjectConversation) {
      chat.loadConversation(latestProjectConversation.id)
      return
    }

    chat.resetChat()
    setProjectMode({
      projectId,
      projectName: project?.name || 'Proyecto',
    })
  }

  const [workflowJustOpened, setWorkflowJustOpened] = useState(false)
  const handleOpenWorkflow = (prompt: string) => {
    setWorkflowPrompt(prompt)
    setWorkflowOpen(true)
    setSidebarCollapsed(true)
    setChatPanelVisible(false)
    setSidePanelTab('chat')
    setWorkflowJustOpened(true)
  }

  const chat = useChat({ onDeliverable: handleDeliverable, onOpenWorkflow: handleOpenWorkflow, isAuthenticated, onCreditUpdate: updateCreditBalance, onProjectCreated: handleProjectCreated })
  useSpecialists()

  const conversationResources = (() => {
    const seen = new Set<string>()
    const deliverables = chat.kanbanTasks
      .filter(task => task.deliverable)
      .map(task => task.deliverable!)
      .filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })

    const byLabel = {
      apps: [] as Deliverable[],
      brand: [] as Deliverable[],
      video: [] as Deliverable[],
      content: [] as Deliverable[],
      visual: [] as Deliverable[],
    }

    for (const item of deliverables) {
      const title = item.title.toLowerCase()
      if (item.botType === 'dev' || item.botType === 'web') {
        byLabel.apps.push(item)
      } else if (item.botType === 'video') {
        byLabel.video.push(item)
      } else if (item.botType === 'brand' || title.includes('logo') || title.includes('marca') || title.includes('branding') || title.includes('identidad')) {
        byLabel.brand.push(item)
      } else if (item.type === 'copy') {
        byLabel.content.push(item)
      } else {
        byLabel.visual.push(item)
      }
    }

    return [
      { id: 'brand', title: 'Marca y logos', icon: Layers3, items: byLabel.brand },
      { id: 'apps', title: 'Webs y sistemas', icon: Globe, items: byLabel.apps },
      { id: 'video', title: 'Videos', icon: Film, items: byLabel.video },
      { id: 'visual', title: 'Piezas visuales', icon: Package, items: byLabel.visual },
      { id: 'content', title: 'Contenido', icon: FileText, items: byLabel.content },
    ].filter(group => group.items.length > 0)
  })()
  const totalTaskCount = chat.kanbanTasks.length
  const activeTaskCount = chat.kanbanTasks.filter(task => task.status !== 'done').length

  // Auto-expand sidebar when user has conversation history (only on first load)
  const sidebarAutoExpanded = useRef(false)
  useEffect(() => {
    if (!sidebarAutoExpanded.current && chat.conversations.length > 0 && window.innerWidth >= 768) {
      sidebarAutoExpanded.current = true
      setSidebarCollapsed(false)
    }
  }, [chat.conversations.length])

  useEffect(() => {
    if (workflowJustOpened) {
      chat.addSystemMessage('Places esta listo. ¿Necesitas ayuda creando tu video? Puedo sugerirte escenas, ajustar prompts o guiarte paso a paso.')
      setWorkflowJustOpened(false)
    }
  }, [workflowJustOpened]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayDeliverable = activeDeliverable
  const isDevDeliverable = displayDeliverable?.botType === 'dev'
  const isImageOnlyDeliverable = (() => {
    if (!displayDeliverable || displayDeliverable.type !== 'design') return false
    const imgs = displayDeliverable.content.match(/<img[^>]+src=["'][^"']*\/uploads\/[^"']+\.(?:png|jpg|jpeg|webp)["']/gi)
    if (!imgs || imgs.length === 0) return false
    const t = displayDeliverable.title.toLowerCase()
    return !(t.includes('landing') || t.includes('pagina') || t.includes('página') || t.includes('web') || t.includes('sitio') || t.includes('app'))
  })()

  useEffect(() => {
    if (displayDeliverable && window.innerWidth < 768) {
      setChatPanelVisible(false)
    }
  }, [displayDeliverable])

  useEffect(() => {
    if (isImageOnlyDeliverable && sidePanelTab === 'edit') {
      setSidePanelTab('chat')
    }
  }, [isImageOnlyDeliverable, sidePanelTab])

  // Disable visual edit mode when leaving the Edit tab (for dev projects)
  useEffect(() => {
    if (sidePanelTab !== 'edit' && isDevDeliverable) {
      setEditMode(false)
      setSelectedElement(null)
      document.querySelectorAll('iframe').forEach(f => f.contentWindow?.postMessage({ type: 'toggle-edit-mode', enabled: false }, '*'))
    }
  }, [sidePanelTab, isDevDeliverable])

  useEffect(() => {
    if (isAuthenticated && !pendingPromptSent.current) {
      const pending = localStorage.getItem('plury_pending_prompt')
      if (pending) {
        localStorage.removeItem('plury_pending_prompt')
        pendingPromptSent.current = true
        chat.setInputText(pending)
      }
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const [disabledProviders, setDisabledProviders] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/providers/available')
      .then(r => r.ok ? r.json() : { disabled: [] })
      .then(data => setDisabledProviders(data.disabled ?? []))
      .catch(() => setDisabledProviders([]))
  }, [])

  const handleTaskClick = (deliverable: Deliverable) => {
    setActiveDeliverable(deliverable)
    setShowTasks(false)
  }

  const handleOpenTasksView = () => {
    setShowTasks(true)
    setShowAdmin(false)
    setWorkflowOpen(false)
    setChatPanelVisible(true)
  }

  const openDeliverableFromResource = (item: Deliverable) => {
    setActiveDeliverable(item)
    setSelectedImageUrl(null)
    setSidebarCollapsed(true)
    setChatPanelVisible(true)
    const imgs = item.type === 'design' ? item.content.match(/<img[^>]+src=["'][^"']*\/uploads\/[^"']+\.(?:png|jpg|jpeg|webp)["']/gi) : null
    const tLower = item.title.toLowerCase()
    const isImgOnly = imgs && imgs.length > 0 && !(tLower.includes('landing') || tLower.includes('pagina') || tLower.includes('página') || tLower.includes('web') || tLower.includes('sitio') || tLower.includes('app'))
    if (isImgOnly) {
      setSidePanelTab('chat')
    } else if (item.type === 'design' || item.type === 'copy') {
      setSidePanelTab('edit')
    }
  }

  const handleNewChat = () => {
    chat.resetChat()
    setActiveDeliverable(null)
    setWorkflowOpen(false)
    setWorkflowPrompt('')
    setShowTasks(false)
    setSidebarCollapsed(false)
    setChatPanelVisible(true)
    setEditMode(false)
    setSelectedElement(null)
    setSidePanelTab('chat')
    setShowAdmin(false)
    setProjectMode(null)
  }

  const templatePrompts: Record<string, string> = {
    landing: 'Crea una landing page profesional con hero, features y precios',
    ecommerce: 'Crea una tienda online con catálogo, filtros y carrito',
    portfolio: 'Crea un portfolio profesional con galería y contacto',
    blog: 'Crea un blog con posts, categorías y newsletter',
    restaurant: 'Crea un sitio para restaurante con menú interactivo y reservaciones',
    saas: 'Crea una landing para producto digital SaaS con pricing',
    crm: 'Crea un CRM con gestión de clientes, pipeline y tabla',
    booking: 'Crea un sistema de reservas con calendario',
    kanban: 'Crea un board de tareas tipo Kanban con filtros y prioridades',
  }

  const platformTemplatePrompts: Record<string, string> = {
    delivery: 'Crea una app de delivery con restaurantes, menu, carrito, pedidos y tracking simulado',
    chatflow: 'Crea una plataforma de chatflow con builder visual, nodos, ejecuciones y logs',
    mobility: 'Crea una plataforma tipo Uber simple con conductores, pasajeros, viajes, dispatch y tracking simulado',
  }

  const handleLoadTemplate = (templateId: string) => {
    const prompt = templatePrompts[templateId] || platformTemplatePrompts[templateId] || `Crea un proyecto tipo ${templateId}`
    chat.setInputText(prompt)
  }

  const handleUseBot = (prompt: string) => {
    chat.setInputText(prompt)
    setShowMarketplace(false)
  }

  const handleLoadConversation = (convId: string) => {
    chat.loadConversation(convId)
    // Don't setActiveDeliverable(null) here — loadConversation auto-restores
    // the last deliverable via onDeliverable callback. Clearing it here
    // causes a race where the restored deliverable gets immediately nullified.
    setSidebarCollapsed(false)
    setChatPanelVisible(true)
    setShowAdmin(false)
    setProjectMode(null)
    setShowTasks(false)
  }

  const chatViewProps = {
    messages: chat.messages,
    agents,
    quickActions,
    showWelcome: chat.showWelcome,
    isCoordinating: chat.isCoordinating,
    inputText: chat.inputText,
    setInputText: chat.setInputText,
    onSubmit: chat.handleSendMessage,
    chatEndRef: chat.chatEndRef,
    onApprove: chat.handleApprove,
    onReject: chat.handleReject,
    onOpenDeliverable: (d: Deliverable, clickedImageUrl?: string) => {
      setActiveDeliverable(d)
      setSelectedImageUrl(clickedImageUrl ?? null)
      setSidebarCollapsed(true)
      setChatPanelVisible(true)
      const imgs = d.type === 'design' ? d.content.match(/<img[^>]+src=["'][^"']*\/uploads\/[^"']+\.(?:png|jpg|jpeg|webp)["']/gi) : null
      const tLower = d.title.toLowerCase()
      const isImgOnly = imgs && imgs.length > 0 && !(tLower.includes('landing') || tLower.includes('pagina') || tLower.includes('página') || tLower.includes('web') || tLower.includes('sitio') || tLower.includes('app'))
      if (isImgOnly) {
        setSidePanelTab('chat')
      } else if (d.type === 'design' || d.type === 'copy') {
        setSidePanelTab('edit')
      }
    },
    pendingApproval: chat.pendingApproval,
    streamingText: chat.streamingText,
    streamingAgent: chat.streamingAgent,
    proposedPlan: chat.proposedPlan,
    pendingStepApproval: chat.pendingStepApproval,
    onApproveStep: chat.handleApproveStep,
    selectedModel: chat.selectedModel,
    onModelChange: chat.setSelectedModel,
    thinkingSteps: chat.thinkingSteps,
    coordinationAgents: chat.coordinationAgents,
    isRefineMode: chat.isRefineMode,
    isRefining: chat.isRefining,
    refiningAgentName: chat.refiningAgentName,
    onOpenMarketplace: () => setShowMarketplace(true),
    assignedHumanAgent: chat.assignedHumanAgent,
    onRequestHuman: chat.requestHumanAssistance,
    humanRequested: chat.humanRequested,
    creditsExhausted: chat.creditsExhausted,
    onUpgrade: () => setShowSettings(true),
    disabledProviders,
    onAbort: chat.handleAbort,
    activeAgents: chat.activeAgents,
    onLoadTemplate: handleLoadTemplate,
    conversations: chat.conversations,
    onLoadConversation: handleLoadConversation,
    kanbanTasks: chat.kanbanTasks,
    activeDeliverable,
    quickReplies: chat.quickReplies,
    onQuickReply: (value: string) => {
      chat.setInputText(value)
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('plury:focus-input'))
      })
    },
    projectSuggest: chat.projectSuggest,
    onCreateProject: chat.createProject,
    onAddToProject: chat.addConversationToProject,
    onDismissProjectSuggest: chat.dismissProjectSuggest,
    projects: chat.projects,
  }

  // Docs page (public, no auth required)
  if (showDocs) return <DocsPage />

  // Landing page for unauthenticated visitors
  if (!isAuthenticated && !isLoading) {
    if (showLandingV2) {
      return <LandingPageV2 />
    }
    return <LandingPage />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page font-['Plus_Jakarta_Sans']">
        <div className="flex flex-col items-center gap-4 animate-[fadeSlideIn_0.3s_ease-out]">
          <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#a78bfa]/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-ink">Cargando tu espacio de trabajo...</p>
            <div className="w-48 h-1 bg-primary/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#a78bfa] to-[#a78bfa] rounded-full animate-[loadBar_1.5s_ease-in-out_infinite]" />
            </div>
            <style>{`@keyframes loadBar { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }`}</style>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-screen bg-page text-ink font-['Plus_Jakarta_Sans'] overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}

        {/* Sidebar */}
        <div className={`${isDevDeliverable ? 'hidden' : ''} ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} md:relative md:flex md:flex-shrink-0 h-full`}>
          <Sidebar
            onNewChat={() => { handleNewChat(); setMobileMenuOpen(false) }}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
            conversations={chat.conversations}
            currentConversationId={chat.conversationId}
            onLoadConversation={(id) => { handleLoadConversation(id); setMobileMenuOpen(false) }}
            onDeleteConversation={chat.deleteConversation}
            projects={chat.projects}
            onOpenProject={handleOpenProject}
            onOpenMarketplace={() => setShowMarketplace(true)}
            onOpenTasks={handleOpenTasksView}
            activeAgents={chat.activeAgents}
          />
        </div>

        <main className="flex-1 flex flex-col relative overflow-hidden bg-surface min-w-0">
          <Header
            isCoordinating={chat.isCoordinating}
            completionFlash={chat.completionFlash}
            onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)}
            onNewChat={handleNewChat}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAdmin={() => setShowAdmin(true)}
            onOpenTasks={handleOpenTasksView}
            taskCount={totalTaskCount}
            activeTaskCount={activeTaskCount}
          />

          <div className="flex-1 flex overflow-hidden relative">
            {showAdmin ? (
              /* Admin — full view with back button */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-edge bg-surface">
                  <button
                    onClick={() => setShowAdmin(false)}
                    className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all"
                  >
                    <X size={16} />
                  </button>
                  <span className="text-sm font-bold text-ink">Panel Admin</span>
                </div>
                <AdminDashboard activeTab={adminSubTab} onTabChange={setAdminSubTab} />
              </div>
            ) : showTasks ? (
              <ProjectTasksView
                projects={chat.projects}
                currentProjectId={projectMode?.projectId ?? null}
                agents={agents}
                onBackToChat={() => setShowTasks(false)}
                onOpenProject={handleOpenProject}
                onOpenConversation={handleLoadConversation}
                onOpenDeliverable={handleTaskClick}
                onFinalizeTask={chat.finalizeTask}
              />
            ) : projectMode && !displayDeliverable && !workflowOpen ? (
              /* ─── Project Mode: Chat sidebar + Project Hub ─── */
              <>
                {chatPanelVisible && (
                  <div className="absolute inset-0 z-30 md:relative md:inset-auto md:z-auto w-full md:w-[320px] md:min-w-[320px] flex-shrink-0 flex flex-col border-r border-edge bg-surface overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-edge">
                      <MessageCircle size={13} className="text-primary" />
                      <span className="text-[11px] font-semibold text-ink flex-1">
                        Chat del proyecto{projectMode?.projectName ? ` · ${projectMode.projectName}` : ''}
                      </span>
                      <button
                        onClick={() => setChatPanelVisible(false)}
                        className="px-1 py-0.5 text-ink-faint hover:text-ink transition-colors"
                      >
                        <PanelLeftClose size={14} />
                      </button>
                    </div>
                    <ChatView {...chatViewProps} />
                  </div>
                )}
                {!chatPanelVisible && (
                  <button
                    onClick={() => setChatPanelVisible(true)}
                    className="absolute top-3 left-3 z-20 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                    title="Mostrar chat"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}
                <ProjectView
                  projectId={projectMode.projectId}
                  refreshKey={projectRefreshKey}
                  activeAgents={chat.coordinationAgents}
                  onBack={() => setProjectMode(null)}
                  onOpenDeliverable={(d) => { setActiveDeliverable(d); setSidePanelTab('chat') }}
                  onLoadConversation={(id) => { chat.loadConversation(id); setChatPanelVisible(true) }}
                />
              </>
            ) : (displayDeliverable || workflowOpen) ? (
              <>
                {/* Chat side panel */}
                {chatPanelVisible && (
                  <div className={`
                    absolute inset-0 z-30 md:relative md:inset-auto md:z-auto
                    w-full ${isDevDeliverable ? 'md:w-[340px] md:min-w-[340px]' : 'md:w-[320px]'} flex-shrink-0 flex flex-col border-r border-edge bg-surface overflow-hidden
                  `}>
                    <div className="flex border-b border-edge flex-shrink-0">
                      <button
                        onClick={() => setSidePanelTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                          sidePanelTab === 'chat'
                            ? 'text-ink border-b-2 border-primary bg-surface'
                            : 'text-ink-faint hover:text-ink bg-subtle/30'
                        }`}
                      >
                        <MessageCircle size={13} /> Chat
                      </button>
                      <button
                        onClick={() => setSidePanelTab('resources')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                          sidePanelTab === 'resources'
                            ? 'text-ink border-b-2 border-violet-500 bg-surface'
                            : 'text-ink-faint hover:text-ink bg-subtle/30'
                        }`}
                      >
                        <Layers3 size={13} /> Recursos
                        {(conversationResources.length > 0 || activeTaskCount > 0) && (
                          <span className="text-[9px] font-bold bg-violet-500/15 text-violet-600 px-1 py-0.5 rounded-full">
                            {conversationResources.reduce((total, group) => total + group.items.length, 0) || activeTaskCount}
                          </span>
                        )}
                      </button>
                      {!isImageOnlyDeliverable ? (
                        <button
                          onClick={() => setSidePanelTab('edit')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                            sidePanelTab === 'edit'
                              ? 'text-ink border-b-2 border-blue-500 bg-surface'
                              : 'text-ink-faint hover:text-ink bg-subtle/30'
                          }`}
                        >
                          <Pencil size={13} /> Edicion
                        </button>
                      ) : null}
                      <button
                        onClick={() => setChatPanelVisible(false)}
                        className="px-2 py-2.5 text-ink-faint hover:text-ink transition-colors"
                        title="Ocultar panel"
                      >
                        <PanelLeftClose size={14} />
                      </button>
                    </div>

                    {sidePanelTab === 'chat' || isImageOnlyDeliverable ? (
                      <ChatView {...chatViewProps} />
                    ) : sidePanelTab === 'resources' ? (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                        {(() => {
                          if (conversationResources.length === 0 && chat.kanbanTasks.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <Layers3 size={32} className="mx-auto text-ink-faint/20 mb-3" />
                                <p className="text-xs text-ink-faint">Aun no hay recursos creados en este chat</p>
                              </div>
                            )
                          }

                          return (
                            <>
                              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 px-3 py-3">
                                <p className="text-[11px] font-semibold text-violet-700 mb-1">Recursos del chat</p>
                                <p className="text-xs text-ink-faint">
                                  Aqui ves lo que se planifico, lo que se esta ejecutando y lo que ya fue entregado en esta conversacion.
                                </p>
                              </div>
                              {chat.kanbanTasks.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="rounded-xl border border-slate-500/15 bg-slate-500/5 px-3 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Planeado</p>
                                    <p className="mt-1 text-lg font-bold text-ink">{chat.kanbanTasks.filter(task => task.status === 'todo').length}</p>
                                  </div>
                                  <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Ejecutando</p>
                                    <p className="mt-1 text-lg font-bold text-ink">{chat.kanbanTasks.filter(task => task.status === 'doing').length}</p>
                                  </div>
                                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Entregado</p>
                                    <p className="mt-1 text-lg font-bold text-ink">{chat.kanbanTasks.filter(task => task.status === 'done').length}</p>
                                  </div>
                                </div>
                              )}
                              {chat.kanbanTasks.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Actividad</p>
                                  <div className="space-y-1.5">
                                    {chat.kanbanTasks.slice().sort((a, b) => {
                                      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
                                      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
                                      return db - da
                                    }).map(task => (
                                      <div key={task.id} className="rounded-xl border border-edge bg-surface-alt px-3 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'doing' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-ink truncate">{task.title}</p>
                                            <p className="text-[10px] text-ink-faint truncate">{task.agent}</p>
                                          </div>
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${task.status === 'done' ? 'text-emerald-600 bg-emerald-500/10' : task.status === 'doing' ? 'text-amber-600 bg-amber-500/10' : 'text-slate-600 bg-slate-500/10'}`}>
                                            {task.status === 'done' ? 'Entregado' : task.status === 'doing' ? 'Ejecutando' : 'Planeado'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {conversationResources.map(group => {
                                const Icon = group.icon
                                return (
                                <div key={group.id}>
                                  <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">{group.title}</p>
                                  <div className="space-y-1.5">
                                    {group.items.map(item => (
                                      <button
                                        key={item.id}
                                        onClick={() => openDeliverableFromResource(item)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-edge hover:border-primary/30 bg-surface-alt hover:bg-subtle transition-all text-left"
                                      >
                                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 bg-gradient-to-br from-violet-500 to-fuchsia-500">
                                          <Icon size={12} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                                          <p className="text-[10px] text-ink-faint truncate">{item.agent}</p>
                                        </div>
                                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Abrir</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )})}
                            </>
                          )
                        })()}
                      </div>
                    ) : false ? (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                        {conversationResources.length === 0 ? (
                          <div className="text-center py-12">
                            <Layers3 size={32} className="mx-auto text-ink-faint/20 mb-3" />
                            <p className="text-xs text-ink-faint">Aun no hay recursos creados en este chat</p>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 px-3 py-3">
                              <p className="text-[11px] font-semibold text-violet-700 mb-1">Recursos en desarrollo</p>
                              <p className="text-xs text-ink-faint">
                                Aqui se va guardando lo que nace en esta conversacion: logos, webs, sistemas, videos y piezas para publicidad.
                              </p>
                            </div>
                            {conversationResources.map(group => {
                              const Icon = group.icon
                              return (
                                <div key={group.id}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                                      <Icon size={14} />
                                    </div>
                                    <div>
                                      <p className="text-[12px] font-semibold text-ink">{group.title}</p>
                                      <p className="text-[10px] text-ink-faint">{group.items.length} recurso{group.items.length === 1 ? '' : 's'}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    {group.items.map(item => (
                                      <button
                                        key={item.id}
                                        onClick={() => {
                                          setActiveDeliverable(item)
                                          setSelectedImageUrl(null)
                                          setSidebarCollapsed(true)
                                          setChatPanelVisible(true)
                                          const imgs = item.type === 'design' ? item.content.match(/<img[^>]+src=["'][^"']*\/uploads\/[^"']+\.(?:png|jpg|jpeg|webp)["']/gi) : null
                                          const tLower = item.title.toLowerCase()
                                          const isImgOnly = imgs && imgs.length > 0 && !(tLower.includes('landing') || tLower.includes('pagina') || tLower.includes('página') || tLower.includes('web') || tLower.includes('sitio') || tLower.includes('app'))
                                          if (isImgOnly) {
                                            setSidePanelTab('chat')
                                          } else if (item.type === 'design' || item.type === 'copy') {
                                            setSidePanelTab('edit')
                                          }
                                        }}
                                        className="w-full rounded-xl border border-edge bg-surface-alt hover:bg-subtle hover:border-primary/25 transition-all px-3 py-2.5 text-left"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/90 to-fuchsia-500/90 text-white flex items-center justify-center flex-shrink-0">
                                            <Icon size={14} />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                                            <p className="text-[10px] text-ink-faint truncate">
                                              {item.agent} · {item.botType || item.type}
                                            </p>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Dev projects: show theme settings + visual editor in one scrollable panel */}
                        {isDevDeliverable && (
                          <>
                            <DevSettingsPanel
                              deliverable={displayDeliverable!}
                              iframeRef={null}
                              conversationId={chat.conversationId ?? undefined}
                            />
                            {/* Save button — visible when there are pending edits or theme changes */}
                            <div className="px-3 pb-2 border-b border-edge flex-shrink-0">
                              <button
                                onClick={handleSaveEdits}
                                disabled={saveStatus === 'saving'}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                                  saveStatus === 'saved'
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : saveStatus === 'saving'
                                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                      : pendingEditsCount > 0
                                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                        : 'bg-subtle text-ink hover:bg-edge border border-edge'
                                }`}
                              >
                                {saveStatus === 'saving' ? (
                                  <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                                ) : saveStatus === 'saved' ? (
                                  <><Check size={14} /> Guardado{displayDeliverable?.publishSlug ? ' y publicado' : ''}</>
                                ) : (
                                  <><Save size={14} /> Guardar cambios{pendingEditsCount > 0 ? ` (${pendingEditsCount})` : ''}</>
                                )}
                              </button>
                            </div>
                          </>
                        )}
                        <EditPanel
                          editMode={editMode}
                          onToggleEditMode={async (enabled) => {
                            setEditMode(enabled)
                            if (isDevDeliverable) {
                              if (enabled) {
                                await ensureBridgeScriptInWebContainer()
                              }
                              // Send toggle — if bridge just reloaded via HMR, the plury-bridge-ready handler will re-send
                              document.querySelectorAll('iframe').forEach(f => f.contentWindow?.postMessage({ type: 'toggle-edit-mode', enabled }, '*'))
                            }
                          }}
                          selectedElement={selectedElement}
                          deliverable={displayDeliverable!}
                          selectedLogo={selectedLogo}
                          onSendMessage={(text) => {
                            chat.setInputText(text)
                            setSidePanelTab('chat')
                          }}
                          onEditText={() => {}}
                          onChangeImage={() => {
                            if (isDevDeliverable) {
                              setDevUnsplashOpen(true)
                            } else {
                              window.dispatchEvent(new CustomEvent('open-unsplash-modal'))
                            }
                          }}
                          onApplyStyle={(styles) => {
                            if (isDevDeliverable) {
                              document.querySelectorAll('iframe').forEach(f => f.contentWindow?.postMessage({ type: 'apply-style', styles }, '*'))
                            } else {
                              window.dispatchEvent(new CustomEvent('apply-style-to-iframe', { detail: styles }))
                            }
                          }}
                          onReplaceImage={(url, alt) => {
                            if (isDevDeliverable) {
                              document.querySelectorAll('iframe').forEach(f => f.contentWindow?.postMessage({ type: 'replace-image', url, alt }, '*'))
                            } else {
                              window.dispatchEvent(new CustomEvent('replace-image-in-iframe', { detail: { url, alt } }))
                            }
                          }}
                          detectedSections={detectedSections}
                          onHighlightSection={(sectionId) => {
                            window.dispatchEvent(new CustomEvent('highlight-section', { detail: sectionId }))
                          }}
                          onUpdateSectionProp={(sectionId, prop, value) => {
                            window.dispatchEvent(new CustomEvent('update-section-prop', { detail: { sectionId, prop, value } }))
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {!chatPanelVisible && !workflowOpen && (
                  <button
                    onClick={() => setChatPanelVisible(true)}
                    className="absolute top-3 left-3 z-20 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                    title="Mostrar chat"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}

                <div className="flex-1 flex min-w-0 bg-page">
                  {workflowOpen ? (
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-ink-faint text-sm">Cargando editor...</div>}>
                    <WorkflowEditor
                      initialPrompt={workflowPrompt}
                      onClose={() => { setWorkflowOpen(false); setWorkflowPrompt(''); setChatPanelVisible(true) }}
                      onShowChat={() => setChatPanelVisible(true)}
                    />
                    </Suspense>
                  ) : displayDeliverable ? (
                    <WorkspacePanel
                      deliverable={displayDeliverable}
                      onClose={() => { setActiveDeliverable(null); setSelectedImageUrl(null); setChatPanelVisible(true); setSelectedLogo(null); if (projectMode) setProjectRefreshKey(k => k + 1) }}
                      editMode={editMode}
                      onEditModeChange={setEditMode}
                      onElementSelected={setSelectedElement}
                      onSwitchToEditTab={() => setSidePanelTab('edit')}
                      conversationId={chat.conversationId ?? undefined}
                      onSelectVersion={(d) => { setActiveDeliverable(d as Deliverable); setSelectedLogo(null) }}
                      onLogoSelected={setSelectedLogo}
                      onSectionsDetected={setDetectedSections}
                      selectedImageUrl={selectedImageUrl}
                      isGenerating={!!(chat.isRefining || (chat.streamingAgent && ['web', 'dev'].includes(chat.streamingAgent) && chat.streamingText))}
                      generatingAgent={chat.refiningAgentName || (chat.streamingAgent && ['web', 'dev'].includes(chat.streamingAgent) ? chat.streamingAgent === 'dev' ? 'Code' : 'Pixel' : null)}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              /* Default: Full-page chat */
              <ChatView {...chatViewProps} />
            )}
          </div>
        </main>
      </div>

      {/* ─── Drawer Overlays ─── */}

      {/* Marketplace Drawer */}
      {showMarketplace && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMarketplace(false)} />
          <div className="relative ml-auto w-full max-w-2xl bg-surface shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]">
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
              <h2 className="text-lg font-bold text-ink">Agentes</h2>
              <button onClick={() => setShowMarketplace(false)} className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MarketplaceView onUseBot={handleUseBot} />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl shadow-2xl flex flex-col animate-[fadeSlideIn_0.2s_ease-out] mx-4">
            <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge rounded-t-2xl">
              <h2 className="text-lg font-bold text-ink">Ajustes</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-b-2xl">
              <SettingsView />
            </div>
          </div>
        </div>
      )}
      {/* Unsplash modal for dev projects (visual editor) */}
      <UnsplashModal
        isOpen={devUnsplashOpen}
        onClose={() => setDevUnsplashOpen(false)}
        onSelect={(url, alt) => {
          document.querySelectorAll('iframe').forEach(f => f.contentWindow?.postMessage({ type: 'replace-image', url, alt }, '*'))
          setSelectedElement(null)
          setDevUnsplashOpen(false)
        }}
      />
    </>
  )
}

export default App
