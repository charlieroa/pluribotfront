import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Pencil, PanelLeftClose, PanelLeftOpen, Settings, X } from 'lucide-react'
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
import TaskTimeline from './components/tasks/TaskTimeline'
import SettingsView from './components/settings/SettingsView'
import MarketplaceView from './components/marketplace/MarketplaceView'
import WorkspacePanel from './components/workspace/WorkspacePanel'
import WorkflowEditor from './components/workflow/WorkflowEditor'
import EditPanel from './components/workspace/EditPanel'
import DevSettingsPanel from './components/workspace/DevSettingsPanel'
import AdminDashboard from './components/admin/AdminDashboard'
import ProjectView from './components/projects/ProjectView'
import LandingPage from './components/landing/LandingPage'
import LandingPageV2 from './components/landing/LandingPageV2'
import DocsPage from './components/docs/DocsPage'
import SectionNavigator from './components/workspace/SectionNavigator'
import type { DetectedSection } from './components/workspace/SectionNavigator'
import type { SelectedElement } from './components/workspace/VisualEditToolbar'

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
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null)
  const [projectMode, setProjectMode] = useState<{ projectId: string; projectName: string } | null>(null)
  const [projectRefreshKey, setProjectRefreshKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Start collapsed, will expand if user has history
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<'chat' | 'edit' | 'settings'>('chat')
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

  // Section navigator state
  const [detectedSections, setDetectedSections] = useState<DetectedSection[]>([])

  useEffect(() => {
    (window as any).__selectedLogoForRefine = selectedLogo
  }, [selectedLogo])

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
    setActiveProjectId(null) // don't use the standalone view
    setSidebarCollapsed(true)
    setChatPanelVisible(window.innerWidth >= 768)
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

  const handleNewChat = () => {
    chat.resetChat()
    setActiveDeliverable(null)
    setWorkflowOpen(false)
    setWorkflowPrompt('')
    setSidebarCollapsed(false)
    setChatPanelVisible(true)
    setEditMode(false)
    setSelectedElement(null)
    setSidePanelTab('chat')
    setShowAdmin(false)
    setActiveProjectId(null)
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

  const handleLoadTemplate = (templateId: string) => {
    const prompt = templatePrompts[templateId] || `Crea un proyecto tipo ${templateId}`
    chat.setInputText(prompt)
  }

  const handleUseBot = (prompt: string) => {
    chat.setInputText(prompt)
    setShowMarketplace(false)
  }

  const handleLoadConversation = (convId: string) => {
    chat.loadConversation(convId)
    setActiveDeliverable(null)
    setSidebarCollapsed(false)
    setChatPanelVisible(true)
    setShowAdmin(false)
    setActiveProjectId(null)
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
            onOpenProject={(id) => { setActiveProjectId(id); setShowAdmin(false); setMobileMenuOpen(false) }}
            onOpenMarketplace={() => setShowMarketplace(true)}
            onOpenTasks={() => setShowTasks(true)}
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
            ) : activeProjectId ? (
              <ProjectView
                projectId={activeProjectId}
                onBack={() => setActiveProjectId(null)}
                onOpenDeliverable={(d) => { setActiveDeliverable(d); setSidePanelTab('chat') }}
                onLoadConversation={(id) => { setActiveProjectId(null); chat.loadConversation(id) }}
              />
            ) : projectMode && !displayDeliverable && !workflowOpen ? (
              /* ─── Project Mode: Chat sidebar + Project Hub ─── */
              <>
                {chatPanelVisible && (
                  <div className="absolute inset-0 z-30 md:relative md:inset-auto md:z-auto w-full md:w-[320px] md:min-w-[320px] flex-shrink-0 flex flex-col border-r border-edge bg-surface overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-edge">
                      <MessageCircle size={13} className="text-primary" />
                      <span className="text-[11px] font-semibold text-ink flex-1">Chat</span>
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
                  onLoadConversation={(id) => { setProjectMode(null); chat.loadConversation(id) }}
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
                      {isDevDeliverable ? (
                        <button
                          onClick={() => setSidePanelTab('settings')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                            sidePanelTab === 'settings'
                              ? 'text-ink border-b-2 border-amber-500 bg-surface'
                              : 'text-ink-faint hover:text-ink bg-subtle/30'
                          }`}
                        >
                          <Settings size={13} /> Ajustes
                        </button>
                      ) : !isImageOnlyDeliverable ? (
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
                    ) : sidePanelTab === 'settings' && isDevDeliverable ? (
                      <DevSettingsPanel
                        deliverable={displayDeliverable!}
                        iframeRef={null}
                        conversationId={chat.conversationId ?? undefined}
                      />
                    ) : (
                      <EditPanel
                        editMode={editMode}
                        onToggleEditMode={setEditMode}
                        selectedElement={selectedElement}
                        deliverable={displayDeliverable!}
                        selectedLogo={selectedLogo}
                        onSendMessage={(text) => {
                          chat.setInputText(text)
                          setSidePanelTab('chat')
                        }}
                        onEditText={() => {}}
                        onChangeImage={() => {
                          window.dispatchEvent(new CustomEvent('open-unsplash-modal'))
                        }}
                        onApplyStyle={(styles) => {
                          window.dispatchEvent(new CustomEvent('apply-style-to-iframe', { detail: styles }))
                        }}
                        onReplaceImage={(url, alt) => {
                          window.dispatchEvent(new CustomEvent('replace-image-in-iframe', { detail: { url, alt } }))
                        }}
                        detectedSections={detectedSections}
                        onHighlightSection={(sectionId) => {
                          window.dispatchEvent(new CustomEvent('highlight-section', { detail: sectionId }))
                        }}
                        onUpdateSectionProp={(sectionId, prop, value) => {
                          window.dispatchEvent(new CustomEvent('update-section-prop', { detail: { sectionId, prop, value } }))
                        }}
                      />
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
                    <WorkflowEditor
                      initialPrompt={workflowPrompt}
                      onClose={() => { setWorkflowOpen(false); setWorkflowPrompt(''); setChatPanelVisible(true) }}
                      onShowChat={() => setChatPanelVisible(true)}
                    />
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

      {/* Tasks Drawer */}
      {showTasks && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTasks(false)} />
          <div className="relative ml-auto w-full max-w-4xl bg-surface shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
              <h2 className="text-lg font-bold text-ink">Tareas</h2>
              <button onClick={() => setShowTasks(false)} className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TaskTimeline tasks={chat.kanbanTasks} agents={agents} onTaskClick={handleTaskClick} onFinalizeTask={chat.finalizeTask} />
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
    </>
  )
}

export default App
