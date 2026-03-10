export interface OrchestratorStep {
    agentId: string;
    instanceId: string;
    task: string;
    userDescription: string;
    dependsOn?: string[];
}
interface ExecutionGroup {
    instanceIds: string[];
}
export interface ExecutingPlan {
    steps: OrchestratorStep[];
    executionGroups: ExecutionGroup[];
    currentGroupIndex: number;
    completedInstances: string[];
    agentOutputs: Record<string, string>;
    conversationId: string;
    userId: string;
    modelOverride?: string;
    imageUrl?: string;
}
export declare function setPendingPlan(messageId: string, plan: {
    steps: OrchestratorStep[];
}): Promise<void>;
export declare function getPendingPlan(messageId: string): Promise<{
    steps: OrchestratorStep[];
    createdAt: number;
} | undefined>;
export declare function removePendingPlan(messageId: string): Promise<void>;
export declare function setExecutingPlan(conversationId: string, plan: ExecutingPlan): Promise<void>;
export declare function getExecutingPlan(conversationId: string): Promise<ExecutingPlan | undefined>;
export declare function removeExecutingPlan(conversationId: string): Promise<void>;
export {};
//# sourceMappingURL=plan-cache.d.ts.map