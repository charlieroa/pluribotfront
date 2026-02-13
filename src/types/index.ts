import type { ReactElement } from 'react'

export interface Agent {
  id: string
  name: string
  role: string
  color: string
  icon: ReactElement
  desc: string
}

export interface MessageAttachment {
  type: 'code' | 'preview' | 'task'
  title: string
  content: string
  deliverable?: Deliverable
}

export interface Message {
  id: string
  sender: string
  text: string
  type: 'user' | 'agent' | 'approval'
  botType?: string
  attachment?: MessageAttachment
  approved?: boolean
  imageUrl?: string
  specialty?: string
  specialtyColor?: string
}

export interface Deliverable {
  id: string
  title: string
  type: 'report' | 'code' | 'design' | 'copy' | 'video'
  content: string
  agent: string
  botType: string
}

export interface KanbanTask {
  id: string
  title: string
  agent: string
  status: 'todo' | 'doing' | 'done'
  botType: string
  deliverable?: Deliverable
  instanceId?: string
  createdAt?: string
}

export interface QuickAction {
  id: string
  title: string
  icon: ReactElement
  desc: string
}

// ─── Plan & Model types (mirrored from shared/types.ts for frontend use) ───

export interface PlanStep {
  agentId: string
  agentName: string
  instanceId: string
  task: string
  userDescription: string
  dependsOn?: string[]
}

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
