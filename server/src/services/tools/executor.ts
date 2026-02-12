import type { ToolCall } from '../llm/types.js'
import type { ToolDefinition, ToolContext } from './types.js'
import type { AgentConfig } from '../../config/agents.js'
import { seoTools } from './seo.js'
import { codegenTools } from './codegen.js'
import { adsTools } from './ads.js'
import { deployTools } from './deploy.js'
import { imagenTools } from './imagen.js'
import { videoTools } from './video.js'

const allTools: ToolDefinition[] = [
  ...seoTools,
  ...codegenTools,
  ...adsTools,
  ...deployTools,
  ...imagenTools,
  ...videoTools,
]

export function getToolDefinitions(toolNames: string[]): { name: string; description: string; parameters: Record<string, unknown> }[] {
  return allTools
    .filter(t => toolNames.includes(t.name))
    .map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
}

export async function executeToolCall(
  toolCall: ToolCall,
  conversationId: string,
  agentConfig: AgentConfig,
  userId: string
): Promise<string> {
  const tool = allTools.find(t => t.name === toolCall.name)
  if (!tool) {
    return `Error: herramienta "${toolCall.name}" no encontrada`
  }

  const context: ToolContext = {
    conversationId,
    agentId: agentConfig.id,
    agentName: agentConfig.name,
    userId,
  }

  try {
    return await tool.execute(toolCall.input, context)
  } catch (err) {
    console.error(`[Tool] Error executing ${toolCall.name}:`, err)
    return `Error ejecutando herramienta: ${err instanceof Error ? err.message : String(err)}`
  }
}
