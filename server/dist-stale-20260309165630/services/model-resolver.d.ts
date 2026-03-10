import type { LLMProviderConfig } from './llm/types.js';
export declare function resolveModelConfig(modelId: string, agentDefaults?: LLMProviderConfig): LLMProviderConfig | null;
export declare const FALLBACK_MODELS: Record<string, LLMProviderConfig[]>;
export declare function resolveAvailableConfig(config: LLMProviderConfig): Promise<LLMProviderConfig | null>;
//# sourceMappingURL=model-resolver.d.ts.map