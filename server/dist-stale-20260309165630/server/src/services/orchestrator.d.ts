export interface OrchestratorOutput {
    requiresApproval?: boolean;
    approvalMessage?: string;
    directResponse?: string;
    quickReplies?: Array<{
        label: string;
        value: string;
        icon?: string;
    }>;
    steps: Array<{
        agentId: string;
        instanceId?: string;
        task: string;
        userDescription?: string;
        dependsOn?: string[];
    }>;
}
export declare function processMessage(conversationId: string, text: string, userId: string, modelOverride?: string, imageUrl?: string): Promise<void>;
//# sourceMappingURL=orchestrator.d.ts.map