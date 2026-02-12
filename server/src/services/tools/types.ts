export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<string>
}

export interface ToolContext {
  conversationId: string
  agentId: string
  agentName: string
  userId: string
}
