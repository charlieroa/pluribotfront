import type { ToolCall } from '../llm/types.js';
import type { AgentConfig } from '../../config/agents.js';
export declare function getToolDefinitions(toolNames: string[]): {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}[];
export declare function executeToolCall(toolCall: ToolCall, conversationId: string, agentConfig: AgentConfig, userId: string): Promise<string>;
//# sourceMappingURL=executor.d.ts.map