export interface LLMMessageImage {
  type: 'image'
  source: string  // base64 data
  mediaType: string
}

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
  images?: LLMMessageImage[]
}

export interface LLMStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string, usage: { inputTokens: number; outputTokens: number }) => void
  onError: (error: Error) => void
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface LLMStreamWithToolsCallbacks extends LLMStreamCallbacks {
  onToolCall: (toolCall: ToolCall) => Promise<string>
}

export interface LLMProviderConfig {
  provider: 'anthropic' | 'openai' | 'google'
  model: string
  apiKey?: string
}

export interface LLMProvider {
  stream(
    systemPrompt: string,
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks
  ): Promise<void>

  streamWithTools(
    systemPrompt: string,
    messages: LLMMessage[],
    tools: ToolDefinition[],
    callbacks: LLMStreamWithToolsCallbacks
  ): Promise<void>
}
