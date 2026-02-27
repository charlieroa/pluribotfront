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
  avatarUrl?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  creditsCost?: number
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
  label: string
  desc: string
  provider: 'anthropic' | 'openai' | 'google'
  model: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: 'claude-opus', name: 'Claude Opus', label: 'Máxima calidad', desc: 'El más inteligente y creativo', provider: 'anthropic', model: 'claude-opus-4-6' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', label: 'Equilibrado', desc: 'Rápido y de gran calidad', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  { id: 'claude-haiku', name: 'Claude Haiku', label: 'Rápido', desc: 'El más veloz, ideal para tareas simples', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'gpt-4.5', name: 'GPT-4.5', label: 'Premium', desc: 'Alta calidad de OpenAI', provider: 'openai', model: 'gpt-4.5-preview' },
  { id: 'gpt-4o', name: 'GPT-4o', label: 'Versátil', desc: 'Rápido y multimodal', provider: 'openai', model: 'gpt-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', label: 'Económico', desc: 'Rápido y bajo consumo', provider: 'openai', model: 'gpt-4o-mini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', label: 'Avanzado', desc: 'El más potente de Google', provider: 'google', model: 'gemini-2.5-pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', label: 'Ultra rápido', desc: 'Velocidad extrema de Google', provider: 'google', model: 'gemini-2.5-flash' },
]
