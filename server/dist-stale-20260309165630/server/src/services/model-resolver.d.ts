import type { LLMProviderConfig } from './llm/types.js';
export declare function resolveModelConfig(modelId: string, agentDefaults?: LLMProviderConfig): LLMProviderConfig | null;
export declare function resolveAvailableConfig(config: LLMProviderConfig): Promise<LLMProviderConfig>;
//# sourceMappingURL=model-resolver.d.ts.map