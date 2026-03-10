import { type ExecutingPlan, type OrchestratorStep } from './plan-cache.js';
export declare function createTodoKanbanTask(conversationId: string, step: OrchestratorStep): Promise<void>;
export declare function startParallelExecution(conversationId: string, steps: OrchestratorStep[], userId: string, modelOverride?: string, imageUrl?: string): Promise<void>;
export declare function executeCurrentGroup(plan: ExecutingPlan): Promise<void>;
export declare function executeSingleStep(plan: ExecutingPlan, step: OrchestratorStep): Promise<void>;
export declare function ensureSequentialVisualAgents(groups: {
    instanceIds: string[];
}[], steps: OrchestratorStep[]): {
    instanceIds: string[];
}[];
export declare function topologicalSortGroups(steps: OrchestratorStep[]): {
    instanceIds: string[];
}[];
//# sourceMappingURL=execution-engine.d.ts.map