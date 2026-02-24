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
  type: 'report' | 'code' | 'design' | 'copy' | 'video' | 'project'
  content: string
  agent: string
  botType: string
  artifact?: ProjectArtifact
}

// ─── Project Artifact types (Logic app builder) ───

export interface ProjectArtifact {
  id: string
  title: string
  files: ArtifactFile[]
  shellCommands?: string[]
}

export interface ArtifactFile {
  filePath: string
  content: string
  language: string
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
}

export type SSEEvent =
  | { type: 'agent_start'; agentId: string; agentName: string; task?: string; instanceId?: string }
  | { type: 'agent_thinking'; agentId: string; agentName: string; step: string; instanceId?: string }
  | { type: 'token'; content: string; agentId: string; instanceId?: string }
  | { type: 'agent_end'; agentId: string; messageId: string; fullText: string; instanceId?: string; creditsCost?: number; model?: string; inputTokens?: number; outputTokens?: number }
  | { type: 'artifact_start'; agentId: string; instanceId?: string }
  | { type: 'file_update'; filePath: string; content: string; language: string; partial?: boolean; instanceId?: string }
  | { type: 'credits_exhausted'; balance: number; planId: string }
  | { type: 'credit_update'; creditsUsed: number; balance: number }
  | { type: 'approval_request'; messageId: string; text: string; agentId: string }
  | { type: 'plan_proposal'; messageId: string; text: string; steps: PlanStep[] }
  | { type: 'step_complete'; agentId: string; agentName: string; instanceId?: string; summary: string; nextAgentId?: string; nextAgentName?: string; nextInstanceId?: string; nextTask?: string; stepIndex: number; totalSteps: number; conversationId: string }
  | { type: 'deliverable'; deliverable: DeliverableWire }
  | { type: 'kanban_update'; task: KanbanTaskWire }
  | { type: 'coordination_start'; agents?: { agentId: string; agentName: string; task: string }[] }
  | { type: 'coordination_end' }
  | { type: 'bot_inactive'; botId: string; botName: string; stepTask: string; conversationId: string }
  | { type: 'human_review_requested'; conversationId: string }
  | { type: 'human_agent_joined'; agentName: string; agentRole: string; specialty?: string; specialtyColor?: string; avatarUrl?: string }
  | { type: 'human_message'; agentName: string; agentRole: string; text: string; messageId: string; specialty?: string; specialtyColor?: string; avatarUrl?: string }
  | { type: 'human_agent_left' }
  | { type: 'thinking_update'; agentId: string; instanceId?: string; content: string }
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
}

// ─── Available models ───

export interface AvailableModel {
  id: string
  name: string
  provider: 'anthropic' | 'openai' | 'google'
  model: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: 'claude-opus', name: 'Claude Opus', provider: 'anthropic', model: 'claude-opus-4-6' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  { id: 'claude-haiku', name: 'Claude Haiku', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'gpt-4.5', name: 'GPT-4.5', provider: 'openai', model: 'gpt-4.5-preview' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', model: 'gpt-4o-mini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', model: 'gemini-2.5-pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', model: 'gemini-2.5-flash' },
]
