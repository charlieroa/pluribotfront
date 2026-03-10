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
interface PendingPlan {
    steps: OrchestratorStep[];
    createdAt: number;
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
}): void;
export declare function getPendingPlan(messageId: string): PendingPlan | undefined;
export declare function removePendingPlan(messageId: string): void;
export declare function setExecutingPlan(conversationId: string, plan: ExecutingPlan): void;
export declare function getExecutingPlan(conversationId: string): ExecutingPlan | undefined;
export declare function removeExecutingPlan(conversationId: string): void;
export {};
//# sourceMappingURL=plan-cache.d.ts.map