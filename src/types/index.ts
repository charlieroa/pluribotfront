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
  version?: number
  versionCount?: number
  publishSlug?: string
  customDomain?: string
  customDomainStatus?: string
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

// ─── Plan & Model types (re-exported from shared/types.ts) ───

export type { PlanStep, AvailableModel } from '../../shared/types'
export { AVAILABLE_MODELS } from '../../shared/types'
