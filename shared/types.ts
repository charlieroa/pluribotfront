// ─── Wire types: shared between frontend and backend (no React imports) ───

export interface MessageWire {
  id: string
  conversationId: string
  sender: string
  text: string
  type: 'user' | 'agent' | 'approval'
  botType?: string
  attachment?: MessageAttachmentWire
  approved?: boolean
  createdAt?: string
}

export interface MessageAttachmentWire {
  type: 'code' | 'preview' | 'task'
  title: string
  content: string
  deliverable?: DeliverableWire
}

export interface DeliverableWire {
  id: string
  title: string
  type: 'report' | 'code' | 'design' | 'copy' | 'video'
  content: string
  agent: string
  botType: string
  version?: number
  versionCount?: number
  validationPassed?: boolean
  previewStable?: boolean
}

export interface KanbanTaskWire {
  id: string
  title: string
  agent: string
  status: 'todo' | 'doing' | 'done'
  botType: string
  deliverableId?: string
  deliverable?: DeliverableWire
  instanceId?: string
  createdAt?: string
}

// ─── SSE Events ───

export interface PlanStep {
  agentId: string
  agentName: string
  instanceId: string        // e.g. "web-1", "web-2", "seo-1"
  task: string
  userDescription: string   // human-readable summary in Spanish
  dependsOn?: string[]      // references instanceIds (not agentIds)
  phaseIndex?: number
  phaseTotal?: number
  phaseTitle?: string
}

export type SSEEvent =
  | { type: 'agent_start'; agentId: string; agentName: string; task?: string; instanceId?: string; model?: string }
  | { type: 'agent_thinking'; agentId: string; agentName: string; step: string; instanceId?: string }
  | { type: 'token'; content: string; agentId: string; instanceId?: string }
  | { type: 'agent_end'; agentId: string; messageId: string; fullText: string; instanceId?: string; creditsCost?: number; model?: string; inputTokens?: number; outputTokens?: number }
  | { type: 'credits_exhausted'; balance: number; planId: string }
  | { type: 'credit_update'; creditsUsed: number; balance: number }
  | { type: 'approval_request'; messageId: string; text: string; agentId: string }
  | { type: 'plan_proposal'; messageId: string; text: string; steps: PlanStep[] }
  | { type: 'step_complete'; agentId: string; agentName: string; instanceId?: string; summary: string; nextAgentId?: string; nextAgentName?: string; nextInstanceId?: string; nextTask?: string; stepIndex: number; totalSteps: number; conversationId: string }
  | { type: 'deliverable'; deliverable: DeliverableWire; validation?: { passed: boolean; checks: { name: string; status: 'pass' | 'fail' | 'warn'; message: string; details?: string[] }[] }; previewStable?: boolean }
  | { type: 'kanban_update'; task: KanbanTaskWire }
  | { type: 'coordination_start'; agents?: { agentId: string; agentName: string; task: string }[] }
  | { type: 'coordination_end' }
  | { type: 'bot_inactive'; botId: string; botName: string; stepTask: string; conversationId: string }
  | { type: 'human_review_requested'; conversationId: string }
  | { type: 'human_agent_joined'; agentName: string; agentRole: string; specialty?: string; specialtyColor?: string; avatarUrl?: string }
  | { type: 'human_message'; agentName: string; agentRole: string; text: string; messageId: string; specialty?: string; specialtyColor?: string; avatarUrl?: string }
  | { type: 'human_agent_left' }
  | { type: 'thinking_update'; agentId: string; instanceId?: string; content: string }
  | { type: 'open_workflow'; prompt: string; agentId: string; instanceId: string }
  | { type: 'quick_replies'; options: { label: string; value: string; icon?: string }[] }
  | { type: 'project_suggest'; conversationId: string; title: string }
  | { type: 'project_created'; project: { id: string; name: string } }
  | { type: 'error'; message: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number }

// ─── API Request/Response types ───

export interface SendMessageRequest {
  conversationId?: string
  text: string
  modelOverride?: string
  imageUrl?: string
}

export interface SendMessageResponse {
  conversationId: string
  messageId: string
}

export interface ApprovalRequest {
  messageId: string
  approved: boolean
  selectedAgents?: string[]
}

export interface StepApprovalRequest {
  conversationId: string
  approved: boolean
}

export interface RefineStepRequest {
  conversationId: string
  text: string
  instanceId?: string
  selectedImageSrc?: string
}

export interface AuthRegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    planId: string
    onboardingDone?: boolean
    profession?: string
    role?: string
    organizationId?: string
    creditBalance?: number
    metaConnected?: boolean
  }
}

export interface UsageResponse {
  totalInputTokens: number
  totalOutputTokens: number
  tokenLimit: number
  byAgent: Array<{
    agentId: string
    inputTokens: number
    outputTokens: number
  }>
  period: {
    start: string
    end: string
  }
}

export interface ConversationListItem {
  id: string
  title: string
  updatedAt: string
  lastMessage?: string
  deliverableCount?: number
  projectId?: string | null
}

export interface ProjectListItem {
  id: string
  name: string
  description?: string | null
  status: string
  conversationCount: number
  deliverables: { id: string; title: string; type: string; botType: string; createdAt: string }[]
  updatedAt: string
  createdAt: string
}

export type ProjectAppType = 'generic' | 'saas' | 'ecommerce' | 'delivery' | 'chatflow' | 'mobility'

export interface ProjectAppModuleWire {
  id: string
  label: string
  description: string
  capabilities: string[]
  phase: number
}

export interface ProjectAppPhaseWire {
  index: number
  title: string
  goal: string
}

export interface ProjectAppWire {
  id: string
  projectId: string
  conversationId?: string | null
  name: string
  slug: string
  appType: ProjectAppType
  vertical?: string | null
  status: string
  runtime: 'project_backend' | 'workflow' | 'realtime'
  configJson?: string | null
  capabilitiesJson?: string | null
  metadataJson?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectAppCatalogItemWire {
  type: ProjectAppType
  label: string
  summary: string
  runtime: 'project_backend' | 'workflow' | 'realtime'
  targetUsers: string[]
  readinessScore: number
  defaultCapabilities: string[]
  recommendedPayments: string[]
  phases: ProjectAppPhaseWire[]
  modules: ProjectAppModuleWire[]
}

export interface ProjectAppExecutionBriefWire {
  title: string
  prompt: string
  phaseIndex: number
  phaseTitle: string
  runtime: 'project_backend' | 'workflow' | 'realtime'
}

export interface RealtimeEventFieldWire {
  name: string
  type: string
  required: boolean
}

export interface RealtimeEventDefinitionWire {
  key: string
  label: string
  direction: 'emit' | 'listen' | 'bi'
  description: string
  fields: RealtimeEventFieldWire[]
}

export interface RealtimeChannelDefinitionWire {
  key: string
  label: string
  description: string
  events: RealtimeEventDefinitionWire[]
}

export interface RealtimeContractWire {
  runtime: 'project_backend' | 'workflow' | 'realtime'
  transport: 'sse+http' | 'workflow+http'
  channels: RealtimeChannelDefinitionWire[]
}

export interface ProjectAppEventWire {
  id: string
  projectAppId: string
  channelKey: string
  eventKey: string
  direction: 'emit' | 'listen' | 'bi'
  payloadJson: string
  source: string
  createdAt: string
}

export type ProjectAppSnapshotWire =
  | {
      kind: 'saas'
      metrics: {
        totalWorkspaces: number
        invitedUsers: number
        activeSubscriptions: number
        resolvedTickets: number
      }
      items: {
        workspaceId: string
        companyName?: string
        planId?: string
        mrr?: number
        status?: string
      }[]
    }
  | {
      kind: 'ecommerce'
      metrics: {
        totalProducts: number
        activeCarts: number
        paidOrders: number
        fulfilledOrders: number
      }
      items: {
        orderId: string
        paymentStatus?: string
        fulfillmentStatus?: string
        total?: number
        customerEmail?: string
      }[]
    }
  | {
      kind: 'delivery'
      metrics: {
        totalOrders: number
        assignedOrders: number
        trackingOrders: number
        deliveredOrders: number
      }
      items: {
        orderId: string
        status: string
        etaMinutes?: number
        driverName?: string
        total?: number
      }[]
    }
  | {
      kind: 'mobility'
      metrics: {
        totalRides: number
        activeRides: number
        pricedRides: number
        completedRides: number
      }
      items: {
        rideId: string
        status: string
        etaMinutes?: number
        estimatedTotal?: number
        driverId?: string
      }[]
    }
  | {
      kind: 'chatflow'
      metrics: {
        totalFlows: number
        publishedFlows: number
        activeExecutions: number
        executionLogs: number
      }
      flowItems: {
        flowId: string
        version?: number
        nodeCount?: number
        publishedChannel?: string
      }[]
      executionItems: {
        executionId: string
        flowId?: string
        trigger?: string
        logCount: number
        status?: string
        scenario?: string
        output?: string
        lastLevel?: string
        lastMessage?: string
      }[]
    }
  | {
      kind: 'generic'
      metrics: {
        totalEvents: number
        totalRecords?: number
        assignedRecords?: number
        completedRecords?: number
      }
      items?: {
        recordId: string
        status?: string
        ownerName?: string
      }[]
    }

export interface ProjectAppRuntimeScenarioWire {
  key: string
  label: string
  description: string
}

// ─── Available models ───

export interface AvailableModel {
  id: string
  name: string
  provider: 'anthropic'
  model: string
  label?: string
  desc?: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: 'claude-opus', name: 'Claude Opus', label: 'Máxima calidad', desc: 'El más inteligente y creativo', provider: 'anthropic', model: 'claude-opus-4-6' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', label: 'Equilibrado', desc: 'Rápido y de gran calidad', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  { id: 'claude-haiku', name: 'Claude Haiku', label: 'Rápido', desc: 'El más veloz, ideal para tareas simples', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
]

// ─── Available image models ───

export interface AvailableImageModel {
  id: string
  name: string
  label: string
  desc: string
}

export const AVAILABLE_IMAGE_MODELS: AvailableImageModel[] = [
  { id: 'ideogram', name: 'Ideogram V3', label: 'Ideogram', desc: 'Mejor para logos, texto y diseño gráfico' },
  { id: 'gemini-flash', name: 'Nano Banana', label: 'Gemini Flash', desc: 'Rápido (~6s), buena calidad general' },
  { id: 'gemini-pro', name: 'Nano Banana Pro', label: 'Gemini Pro', desc: 'Máxima calidad (~20s), studio-quality' },
]
