import { useState } from 'react'
import { agents } from './data/agents'
import { quickActions } from './data/quickActions'
import { useChat } from './hooks/useChat'
import { useAuth } from './contexts/AuthContext'
import type { Deliverable } from './types'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ChatView from './components/chat/ChatView'
import TaskTimeline from './components/tasks/TaskTimeline'
import SettingsView from './components/settings/SettingsView'
import MarketplaceView from './components/marketplace/MarketplaceView'
import WorkspacePanel from './components/workspace/WorkspacePanel'
import OnboardingView from './components/onboarding/OnboardingView'
import AdminDashboard from './components/admin/AdminDashboard'

const App = () => {
  const { user } = useAuth()
  const isAuthenticated = !!user
  const showOnboarding = isAuthenticated && !user.onboardingDone

  const [activeTab, setActiveTab] = useState('chat')
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const chat = useChat({ onDeliverable: setActiveDeliverable, isAuthenticated })

  const lastAgentId = chat.messages[chat.messages.length - 1]?.botType
  const activeAgent = agents.find(a => a.id === lastAgentId) || agents[0]

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
    isRefineMode: chat.isRefineMode,
    onOpenMarketplace: () => setActiveTab('marketplace'),
    inactiveBotPrompt: chat.inactiveBotPrompt,
    onActivateBot: chat.handleActivateBot,
    onDismissInactiveBot: chat.handleDismissInactiveBot,
    assignedHumanAgent: chat.assignedHumanAgent,
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
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          agents={agents}
          onNewChat={handleNewChat}
          activeAgents={chat.activeAgents}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          conversations={chat.conversations}
          currentConversationId={chat.conversationId}
          onLoadConversation={handleLoadConversation}
          onDeleteConversation={chat.deleteConversation}
          assignedHumanAgent={chat.assignedHumanAgent}
        />

        <main className="flex-1 flex flex-col relative overflow-hidden bg-surface">
          <Header isCoordinating={chat.isCoordinating} activeTab={activeTab} />

          <div className="flex-1 flex overflow-hidden">
            {activeDeliverable ? (
              <>
                {/* Split view: Chat + Workspace */}
                <div className="w-[42%] flex flex-col border-r border-edge min-w-0 overflow-hidden">
                  <ChatView {...chatViewProps} />
                </div>
                <WorkspacePanel
                  deliverable={activeDeliverable}
                  onClose={() => setActiveDeliverable(null)}
                />
              </>
            ) : activeTab === 'chat' ? (
              <ChatView {...chatViewProps} />
            ) : activeTab === 'marketplace' ? (
              <MarketplaceView onUseBot={handleUseBot} />
            ) : activeTab === 'tasks' ? (
              <TaskTimeline tasks={chat.kanbanTasks} agents={agents} onTaskClick={handleTaskClick} />
            ) : activeTab === 'admin' ? (
              <AdminDashboard />
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
