import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { MessageCircle, Pencil, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
import PortfolioView from './components/portfolio/PortfolioView'
import WorkspacePanel from './components/workspace/WorkspacePanel'
import EditPanel from './components/workspace/EditPanel'
import OnboardingView from './components/onboarding/OnboardingView'
import AdminDashboard from './components/admin/AdminDashboard'
import type { SelectedElement } from './components/workspace/VisualEditToolbar'
import { clientBundleToHtml } from './utils/clientBundle'

const App = () => {
  const { user, updateCreditBalance } = useAuth()
  const isAuthenticated = !!user
  const showOnboarding = isAuthenticated && !user.onboardingDone

  const [activeTab, setActiveTab] = useState('chat')
  const [adminSubTab, setAdminSubTab] = useState<AdminTab>('users')
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<'chat' | 'edit'>('chat')
  const [chatPanelVisible, setChatPanelVisible] = useState(true)

  // Visual edit state lifted from WorkspacePanel for EditPanel communication
  const [editMode, setEditMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)

  const handleDeliverable = (d: Deliverable) => {
    setActiveDeliverable(d)
    setSidebarCollapsed(true)
    // On desktop show chat; on mobile hide it to show preview
    setChatPanelVisible(window.innerWidth >= 768)
  }

  const chat = useChat({ onDeliverable: handleDeliverable, isAuthenticated, onCreditUpdate: updateCreditBalance })
  const { specialists } = useSpecialists()

  // Show CodeWorkspace progressively while Logic streams files (including 0 files = just started)
  const isLogicStreaming = chat.streamingAgent === 'dev' && chat.buildingArtifact !== null

  // Client-side progressive preview: generate HTML from streaming files
  const deferredArtifact = useDeferredValue(chat.buildingArtifact)
  const streamingPreviewHtml = useMemo(() => {
    if (!isLogicStreaming || !deferredArtifact) return ''
    return clientBundleToHtml(deferredArtifact)
  }, [isLogicStreaming, deferredArtifact])

  const streamingDeliverable = useMemo<Deliverable | null>(() => {
    if (!isLogicStreaming || !chat.buildingArtifact) return null
    return {
      id: 'building',
      title: `Logic: Construyendo proyecto...`,
      type: 'project',
      content: streamingPreviewHtml,
      agent: 'Logic',
      botType: 'dev',
      artifact: chat.buildingArtifact,
    }
  }, [isLogicStreaming, chat.buildingArtifact, streamingPreviewHtml])

  // Auto-show workspace when Logic starts streaming files
  useEffect(() => {
    if (streamingDeliverable && !activeDeliverable) {
      setActiveDeliverable(streamingDeliverable)
      setSidebarCollapsed(true)
    }
  }, [streamingDeliverable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep streaming deliverable updated while building
  const displayDeliverable = (activeDeliverable?.id === 'building' && streamingDeliverable)
    ? streamingDeliverable
    : activeDeliverable

  // Auto-collapse chat on mobile when a deliverable is active
  useEffect(() => {
    if (displayDeliverable && window.innerWidth < 768) {
      setChatPanelVisible(false)
    }
  }, [displayDeliverable])

  // Fetch disabled providers on mount
  const [disabledProviders, setDisabledProviders] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/providers/available')
      .then(r => r.ok ? r.json() : { disabled: [] })
      .then(data => setDisabledProviders(data.disabled ?? []))
      .catch(() => setDisabledProviders([]))
  }, [])

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab)
    if (tab !== 'chat') setActiveDeliverable(null)
  }

  const handleTaskClick = (deliverable: Deliverable) => {
    setActiveDeliverable(deliverable)
    setActiveTab('chat')
  }

  const handleNewChat = () => {
    chat.resetChat()
    setActiveDeliverable(null)
    setActiveTab('chat')
  }

  const handleUseBot = (prompt: string) => {
    chat.setInputText(prompt)
    setActiveTab('chat')
  }

  const handleOnboardingComplete = () => {
    setActiveTab('chat')
  }

  const handleLoadConversation = (convId: string) => {
    chat.loadConversation(convId)
    setActiveDeliverable(null)
    setActiveTab('chat')
  }

  // Auto-fix: send error message to Logic for correction
  const handleAutoFix = useCallback((errorMessage: string) => {
    if (chat.isRefineMode && chat.pendingStepApproval) {
      chat.sendRefineMessage(errorMessage)
    } else if (activeDeliverable?.botType === 'dev' && chat.conversationId) {
      // Send as a refinement message even outside refine mode
      chat.sendRefineMessage(errorMessage)
    }
  }, [chat.isRefineMode, chat.pendingStepApproval, chat.sendRefineMessage, activeDeliverable?.botType, chat.conversationId])

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
    onOpenDeliverable: setActiveDeliverable,
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
    onOpenMarketplace: () => setActiveTab('marketplace'),
    inactiveBotPrompt: chat.inactiveBotPrompt,
    onActivateBot: chat.handleActivateBot,
    onDismissInactiveBot: chat.handleDismissInactiveBot,
    assignedHumanAgent: chat.assignedHumanAgent,
    onRequestHuman: chat.requestHumanAssistance,
    humanRequested: chat.humanRequested,
    creditsExhausted: chat.creditsExhausted,
    onUpgrade: () => setActiveTab('settings'),
    disabledProviders,
    onAbort: chat.handleAbort,
    buildingArtifact: chat.buildingArtifact,
    activeAgents: chat.activeAgents,
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingView
          onComplete={handleOnboardingComplete}
          onOpenMarketplace={() => { handleOnboardingComplete(); setActiveTab('marketplace') }}
        />
      )}

      <div className="flex h-screen bg-page text-ink font-['Plus_Jakarta_Sans'] overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}

        {/* Sidebar - hidden on mobile unless menu open */}
        <div className={`${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} md:relative md:flex md:flex-shrink-0 h-full`}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => { handleSetActiveTab(tab); setMobileMenuOpen(false) }}
            agents={agents}
            onNewChat={() => { handleNewChat(); setMobileMenuOpen(false) }}
            activeAgents={chat.activeAgents}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
            conversations={chat.conversations}
            currentConversationId={chat.conversationId}
            onLoadConversation={(id) => { handleLoadConversation(id); setMobileMenuOpen(false) }}
            onDeleteConversation={chat.deleteConversation}
            assignedHumanAgent={chat.assignedHumanAgent}
            specialists={specialists}
            adminSubTab={adminSubTab}
            onAdminSubTabChange={setAdminSubTab}
          />
        </div>

        <main className="flex-1 flex flex-col relative overflow-hidden bg-surface min-w-0">
          <Header isCoordinating={chat.isCoordinating} activeTab={activeTab} onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)} setActiveTab={handleSetActiveTab} />

          <div className="flex-1 flex overflow-hidden relative">
            {displayDeliverable ? (
              <>
                {/* Chat side panel — collapsible, overlay on mobile */}
                {chatPanelVisible && (
                  <div className={`
                    ${/* Mobile: absolute overlay */''}
                    absolute inset-0 z-30 md:relative md:inset-auto md:z-auto
                    w-full md:w-[320px] flex-shrink-0 flex flex-col border-r border-edge bg-surface overflow-hidden
                  `}>
                    {/* Tab switcher + collapse button */}
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
                        onClick={() => setSidePanelTab('edit')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                          sidePanelTab === 'edit'
                            ? 'text-ink border-b-2 border-blue-500 bg-surface'
                            : 'text-ink-faint hover:text-ink bg-subtle/30'
                        }`}
                      >
                        <Pencil size={13} /> Edición
                      </button>
                      <button
                        onClick={() => setChatPanelVisible(false)}
                        className="px-2 py-2.5 text-ink-faint hover:text-ink transition-colors"
                        title="Ocultar panel"
                      >
                        <PanelLeftClose size={14} />
                      </button>
                    </div>

                    {/* Tab content */}
                    {sidePanelTab === 'chat' ? (
                      <ChatView {...chatViewProps} />
                    ) : (
                      <EditPanel
                        editMode={editMode}
                        onToggleEditMode={setEditMode}
                        selectedElement={selectedElement}
                        deliverable={displayDeliverable!}
                        onSendMessage={(text) => {
                          chat.setInputText(text)
                          setSidePanelTab('chat')
                        }}
                        onEditText={() => {
                          // Handled by double-click in iframe
                        }}
                        onChangeImage={() => {
                          window.dispatchEvent(new CustomEvent('open-unsplash-modal'))
                        }}
                        onApplyStyle={(styles) => {
                          window.dispatchEvent(new CustomEvent('apply-style-to-iframe', { detail: styles }))
                        }}
                        onReplaceImage={(url, alt) => {
                          window.dispatchEvent(new CustomEvent('replace-image-in-iframe', { detail: { url, alt } }))
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Floating button to reopen chat when collapsed */}
                {!chatPanelVisible && (
                  <button
                    onClick={() => setChatPanelVisible(true)}
                    className="absolute top-3 left-3 z-20 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                    title="Mostrar chat"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}

                {/* Canvas — always visible */}
                <div className="flex-1 flex min-w-0">
                  <WorkspacePanel
                    deliverable={displayDeliverable!}
                    onClose={() => { setActiveDeliverable(null); setChatPanelVisible(true) }}
                    editMode={editMode}
                    onEditModeChange={setEditMode}
                    onElementSelected={setSelectedElement}
                    onSwitchToEditTab={() => setSidePanelTab('edit')}
                    onAutoFix={handleAutoFix}
                    isFixing={!!chat.streamingAgent}
                    conversationId={chat.conversationId ?? undefined}
                  />
                </div>
              </>
            ) : activeTab === 'chat' ? (
              <ChatView {...chatViewProps} />
            ) : activeTab === 'marketplace' ? (
              <MarketplaceView onUseBot={handleUseBot} />
            ) : activeTab === 'portfolio' ? (
              <PortfolioView onContactBot={handleUseBot} />
            ) : activeTab === 'tasks' ? (
              <TaskTimeline tasks={chat.kanbanTasks} agents={agents} onTaskClick={handleTaskClick} onFinalizeTask={chat.finalizeTask} />
            ) : activeTab === 'admin' ? (
              <AdminDashboard activeTab={adminSubTab} onTabChange={setAdminSubTab} />
            ) : (
              <SettingsView />
            )}
          </div>
        </main>
      </div>
    </>
  )
}

export default App
