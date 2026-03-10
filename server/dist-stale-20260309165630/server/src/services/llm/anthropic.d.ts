import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js';
export declare class AnthropicProvider implements LLMProvider {
    private client;
    private model;
    private maxTokens;
    private temperature;
    private budgetTokens;
    constructor(apiKey: string, model: string, maxTokens?: number, temperature?: number, budgetTokens?: number);
    private buildRequestParams;
    private extractUsage;
    stream(systemPrompt: string, messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<void>;
    streamWithTools(systemPrompt: string, messages: LLMMessage[], tools: ToolDefinition[], callbacks: LLMStreamWithToolsCallbacks): Promise<void>;
}
//# sourceMappingURL=anthropic.d.ts.map