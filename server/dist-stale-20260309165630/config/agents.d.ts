import type { LLMProviderConfig } from '../services/llm/types.js';
export interface AgentConfig {
    id: string;
    name: string;
    role: string;
    botType: string;
    systemPrompt: string;
    modelConfig: LLMProviderConfig;
    tools: string[];
}
export declare const VISUAL_AGENT_IDS: string[];
export declare const PROJECT_AGENT_IDS: string[];
export declare const REFINE_AGENT_IDS: string[];
export declare const agentConfigs: AgentConfig[];
export declare const orchestratorConfig: AgentConfig;
export declare function getAgentConfig(agentId: string): AgentConfig | undefined;
//# sourceMappingURL=agents.d.ts.map