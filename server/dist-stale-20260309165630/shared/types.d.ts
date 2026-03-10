export interface MessageWire {
    id: string;
    conversationId: string;
    sender: string;
    text: string;
    type: 'user' | 'agent' | 'approval';
    botType?: string;
    attachment?: MessageAttachmentWire;
    approved?: boolean;
    createdAt?: string;
}
export interface MessageAttachmentWire {
    type: 'code' | 'preview' | 'task';
    title: string;
    content: string;
    deliverable?: DeliverableWire;
}
export interface DeliverableWire {
    id: string;
    title: string;
    type: 'report' | 'code' | 'design' | 'copy' | 'video';
    content: string;
    agent: string;
    botType: string;
    version?: number;
    versionCount?: number;
}
export interface KanbanTaskWire {
    id: string;
    title: string;
    agent: string;
    status: 'todo' | 'doing' | 'done';
    botType: string;
    deliverableId?: string;
    deliverable?: DeliverableWire;
    instanceId?: string;
    createdAt?: string;
}
export interface PlanStep {
    agentId: string;
    agentName: string;
    instanceId: string;
    task: string;
    userDescription: string;
    dependsOn?: string[];
}
export type SSEEvent = {
    type: 'agent_start';
    agentId: string;
    agentName: string;
    task?: string;
    instanceId?: string;
    model?: string;
} | {
    type: 'agent_thinking';
    agentId: string;
    agentName: string;
    step: string;
    instanceId?: string;
} | {
    type: 'token';
    content: string;
    agentId: string;
    instanceId?: string;
} | {
    type: 'agent_end';
    agentId: string;
    messageId: string;
    fullText: string;
    instanceId?: string;
    creditsCost?: number;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
} | {
    type: 'credits_exhausted';
    balance: number;
    planId: string;
} | {
    type: 'credit_update';
    creditsUsed: number;
    balance: number;
} | {
    type: 'approval_request';
    messageId: string;
    text: string;
    agentId: string;
} | {
    type: 'plan_proposal';
    messageId: string;
    text: string;
    steps: PlanStep[];
} | {
    type: 'step_complete';
    agentId: string;
    agentName: string;
    instanceId?: string;
    summary: string;
    nextAgentId?: string;
    nextAgentName?: string;
    nextInstanceId?: string;
    nextTask?: string;
    stepIndex: number;
    totalSteps: number;
    conversationId: string;
} | {
    type: 'deliverable';
    deliverable: DeliverableWire;
} | {
    type: 'kanban_update';
    task: KanbanTaskWire;
} | {
    type: 'coordination_start';
    agents?: {
        agentId: string;
        agentName: string;
        task: string;
    }[];
} | {
    type: 'coordination_end';
} | {
    type: 'bot_inactive';
    botId: string;
    botName: string;
    stepTask: string;
    conversationId: string;
} | {
    type: 'human_review_requested';
    conversationId: string;
} | {
    type: 'human_agent_joined';
    agentName: string;
    agentRole: string;
    specialty?: string;
    specialtyColor?: string;
    avatarUrl?: string;
} | {
    type: 'human_message';
    agentName: string;
    agentRole: string;
    text: string;
    messageId: string;
    specialty?: string;
    specialtyColor?: string;
    avatarUrl?: string;
} | {
    type: 'human_agent_left';
} | {
    type: 'thinking_update';
    agentId: string;
    instanceId?: string;
    content: string;
} | {
    type: 'open_workflow';
    prompt: string;
    agentId: string;
    instanceId: string;
} | {
    type: 'quick_replies';
    options: {
        label: string;
        value: string;
        icon?: string;
    }[];
} | {
    type: 'project_suggest';
    conversationId: string;
    title: string;
} | {
    type: 'error';
    message: string;
} | {
    type: 'usage';
    inputTokens: number;
    outputTokens: number;
};
export interface SendMessageRequest {
    conversationId?: string;
    text: string;
    modelOverride?: string;
    imageUrl?: string;
}
export interface SendMessageResponse {
    conversationId: string;
    messageId: string;
}
export interface ApprovalRequest {
    messageId: string;
    approved: boolean;
    selectedAgents?: string[];
}
export interface StepApprovalRequest {
    conversationId: string;
    approved: boolean;
}
export interface RefineStepRequest {
    conversationId: string;
    text: string;
    instanceId?: string;
}
export interface AuthRegisterRequest {
    email: string;
    password: string;
    name: string;
}
export interface AuthLoginRequest {
    email: string;
    password: string;
}
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        planId: string;
        onboardingDone?: boolean;
        profession?: string;
        role?: string;
        organizationId?: string;
        creditBalance?: number;
        metaConnected?: boolean;
    };
}
export interface UsageResponse {
    totalInputTokens: number;
    totalOutputTokens: number;
    tokenLimit: number;
    byAgent: Array<{
        agentId: string;
        inputTokens: number;
        outputTokens: number;
    }>;
    period: {
        start: string;
        end: string;
    };
}
export interface ConversationListItem {
    id: string;
    title: string;
    updatedAt: string;
    lastMessage?: string;
    deliverableCount?: number;
    projectId?: string | null;
}
export interface ProjectListItem {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    conversationCount: number;
    deliverables: {
        id: string;
        title: string;
        type: string;
        botType: string;
        createdAt: string;
    }[];
    updatedAt: string;
    createdAt: string;
}
export interface AvailableModel {
    id: string;
    name: string;
    provider: 'anthropic';
    model: string;
    label?: string;
    desc?: string;
}
export declare const AVAILABLE_MODELS: AvailableModel[];
//# sourceMappingURL=types.d.ts.map