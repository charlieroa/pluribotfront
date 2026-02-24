import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition, LLMUsage } from './types.js'

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic
  private model: string
  private maxTokens: number
  private temperature: number | undefined
  private budgetTokens: number

  constructor(apiKey: string, model: string, maxTokens = 32768, temperature?: number, budgetTokens = 0) {
    this.client = new Anthropic({ apiKey })
    this.model = model
    this.maxTokens = maxTokens
    this.temperature = temperature
    this.budgetTokens = budgetTokens
  }

  private buildRequestParams(systemPrompt: string): Record<string, unknown> {
    const params: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
    }

    // System prompt with cache_control for prompt caching
    params.system = [{
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    }]

    if (this.budgetTokens > 0) {
      // Extended thinking enabled — temperature must be omitted (Anthropic requirement)
      params.thinking = { type: 'enabled', budget_tokens: this.budgetTokens }
    } else if (this.temperature !== undefined) {
      params.temperature = this.temperature
    }

    return params
  }

  private extractUsage(finalMessage: Anthropic.Message): LLMUsage {
    const usage = finalMessage.usage as Anthropic.Usage & {
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreationInputTokens: usage.cache_creation_input_tokens,
      cacheReadInputTokens: usage.cache_read_input_tokens,
    }
  }

  async stream(
    systemPrompt: string,
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks
  ): Promise<void> {
    let fullText = ''

    try {
      const params = this.buildRequestParams(systemPrompt)
      const stream = this.client.messages.stream({
        ...params,
        messages: messages.map(m => ({
          role: m.role,
          content: m.images && m.images.length > 0
            ? [
                ...m.images.map(img => ({
                  type: 'image' as const,
                  source: { type: 'base64' as const, media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: img.source },
                })),
                { type: 'text' as const, text: m.content },
              ]
            : m.content,
        })),
      } as Anthropic.MessageStreamParams)

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text
            callbacks.onToken(event.delta.text)
          } else if (event.delta.type === 'thinking_delta' && callbacks.onThinking) {
            // Thinking content — send to onThinking but do NOT add to fullText
            callbacks.onThinking((event.delta as { type: string; thinking: string }).thinking)
          }
        }
      }

      const finalMessage = await stream.finalMessage()
      callbacks.onComplete(fullText, this.extractUsage(finalMessage))
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async streamWithTools(
    systemPrompt: string,
    messages: LLMMessage[],
    tools: ToolDefinition[],
    callbacks: LLMStreamWithToolsCallbacks
  ): Promise<void> {
    let fullText = ''
    let totalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 }

    const anthropicTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }))

    const conversationMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.images && m.images.length > 0
        ? [
            ...m.images.map(img => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: img.source },
            })),
            { type: 'text' as const, text: m.content },
          ]
        : m.content,
    }))

    try {
      let continueLoop = true

      while (continueLoop) {
        continueLoop = false

        const params = this.buildRequestParams(systemPrompt)
        const stream = this.client.messages.stream({
          ...params,
          messages: conversationMessages,
          tools: anthropicTools,
        } as Anthropic.MessageStreamParams)

        // Collect content blocks from the stream
        let currentToolUse: { id: string; name: string; jsonBuf: string } | null = null

        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              currentToolUse = { id: event.content_block.id, name: event.content_block.name, jsonBuf: '' }
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              fullText += event.delta.text
              callbacks.onToken(event.delta.text)
            } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.jsonBuf += event.delta.partial_json
            } else if (event.delta.type === 'thinking_delta' && callbacks.onThinking) {
              callbacks.onThinking((event.delta as { type: string; thinking: string }).thinking)
            }
          } else if (event.type === 'content_block_stop' && currentToolUse) {
            // Tool use block complete — will process after stream ends
          }
        }

        const finalMessage = await stream.finalMessage()
        const stepUsage = this.extractUsage(finalMessage)
        totalUsage.inputTokens += stepUsage.inputTokens
        totalUsage.outputTokens += stepUsage.outputTokens
        totalUsage.cacheCreationInputTokens = (totalUsage.cacheCreationInputTokens ?? 0) + (stepUsage.cacheCreationInputTokens ?? 0)
        totalUsage.cacheReadInputTokens = (totalUsage.cacheReadInputTokens ?? 0) + (stepUsage.cacheReadInputTokens ?? 0)

        // Separate text and tool_use blocks
        const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]

        if (toolUseBlocks.length > 0) {
          // Execute ALL tool calls in parallel
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (block) => {
              const result = await callbacks.onToolCall({
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
              return { tool_use_id: block.id, content: result }
            })
          )

          // Add assistant message with all content blocks (text + tool_use)
          conversationMessages.push({ role: 'assistant', content: finalMessage.content })

          // Add all tool results in a single user message
          conversationMessages.push({
            role: 'user',
            content: toolResults.map(r => ({
              type: 'tool_result' as const,
              tool_use_id: r.tool_use_id,
              content: r.content,
            })),
          })

          continueLoop = true
        } else {
          callbacks.onComplete(fullText, totalUsage)
        }
      }
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
