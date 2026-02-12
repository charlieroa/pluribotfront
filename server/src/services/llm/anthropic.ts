import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js'

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async stream(
    systemPrompt: string,
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks
  ): Promise<void> {
    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 32768,
        system: systemPrompt,
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
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text
          callbacks.onToken(event.delta.text)
        }
      }

      const finalMessage = await stream.finalMessage()
      inputTokens = finalMessage.usage.input_tokens
      outputTokens = finalMessage.usage.output_tokens

      callbacks.onComplete(fullText, { inputTokens, outputTokens })
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
    let totalInputTokens = 0
    let totalOutputTokens = 0

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

        // Use streaming to avoid SDK timeout errors on long tool calls
        const stream = this.client.messages.stream({
          model: this.model,
          max_tokens: 32768,
          system: systemPrompt,
          messages: conversationMessages,
          tools: anthropicTools,
        })

        // Collect content blocks from the stream
        const assistantContent: Anthropic.ContentBlock[] = []
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
            }
          } else if (event.type === 'content_block_stop' && currentToolUse) {
            // Tool use block complete — will process after stream ends
          }
        }

        const finalMessage = await stream.finalMessage()
        totalInputTokens += finalMessage.usage.input_tokens
        totalOutputTokens += finalMessage.usage.output_tokens

        // Process the final message content blocks
        for (const block of finalMessage.content) {
          if (block.type === 'text') {
            assistantContent.push(block)
          } else if (block.type === 'tool_use') {
            assistantContent.push(block)

            const toolResult = await callbacks.onToolCall({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            })

            // Add assistant message with tool use, then tool result
            conversationMessages.push({ role: 'assistant', content: assistantContent })
            conversationMessages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: toolResult,
              }],
            })

            continueLoop = true
            break // restart the while loop with tool result
          }
        }

        if (!continueLoop) {
          callbacks.onComplete(fullText, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens })
        }
      }
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
