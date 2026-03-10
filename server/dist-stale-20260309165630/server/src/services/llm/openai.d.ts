import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js';
export declare class OpenAIProvider implements LLMProvider {
    private client;
    private model;
    private temperature;
    constructor(apiKey: string, model: string, temperature?: number);
    stream(systemPrompt: string, messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<void>;
    streamWithTools(systemPrompt: string, messages: LLMMessage[], tools: ToolDefinition[], callbacks: LLMStreamWithToolsCallbacks): Promise<void>;
}
//# sourceMappingURL=openai.d.ts.map