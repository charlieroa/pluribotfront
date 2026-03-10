import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js';
export declare class GeminiProvider implements LLMProvider {
    private client;
    private model;
    private temperature;
    constructor(apiKey: string, model: string, temperature?: number);
    private buildContents;
    stream(systemPrompt: string, messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<void>;
    streamWithTools(systemPrompt: string, messages: LLMMessage[], tools: ToolDefinition[], callbacks: LLMStreamWithToolsCallbacks): Promise<void>;
}
//# sourceMappingURL=gemini.d.ts.map