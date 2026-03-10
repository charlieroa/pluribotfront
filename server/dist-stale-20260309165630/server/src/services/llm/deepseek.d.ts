import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js';
export declare class DeepSeekProvider implements LLMProvider {
    private client;
    private model;
    private maxTokens;
    private temperature;
    private jsonMode;
    constructor(apiKey: string, model: string, maxTokens?: number, temperature?: number, jsonMode?: boolean);
    stream(systemPrompt: string, messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<void>;
    streamWithTools(systemPrompt: string, messages: LLMMessage[], tools: ToolDefinition[], callbacks: LLMStreamWithToolsCallbacks): Promise<void>;
}
//# sourceMappingURL=deepseek.d.ts.map