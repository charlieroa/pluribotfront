import OpenAI from 'openai'
import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async stream(
    systemPrompt: string,
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks
  ): Promise<void> {
    let fullText = ''

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m): OpenAI.ChatCompletionMessageParam => {
            if (m.role === 'user') {
              return {
                role: 'user' as const,
                content: m.images && m.images.length > 0
                  ? [
                      ...m.images.map(img => ({
                        type: 'image_url' as const,
                        image_url: { url: `data:${img.mediaType};base64,${img.source}` },
                      })),
                      { type: 'text' as const, text: m.content },
                    ]
                  : m.content,
              }
            }
            return { role: 'assistant' as const, content: m.content }
          }),
        ],
      })

      let inputTokens = 0
      let outputTokens = 0

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          fullText += delta
          callbacks.onToken(delta)
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens
          outputTokens = chunk.usage.completion_tokens
        }
      }

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

    const openaiTools: OpenAI.ChatCompletionTool[] = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))

    const conversationMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m): OpenAI.ChatCompletionMessageParam => {
        if (m.role === 'user') {
          return {
            role: 'user' as const,
            content: m.images && m.images.length > 0
              ? [
                  ...m.images.map(img => ({
                    type: 'image_url' as const,
                    image_url: { url: `data:${img.mediaType};base64,${img.source}` },
                  })),
                  { type: 'text' as const, text: m.content },
                ]
              : m.content,
          }
        }
        return { role: 'assistant' as const, content: m.content }
      }),
    ]

    try {
      let continueLoop = true

      while (continueLoop) {
        continueLoop = false

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: conversationMessages,
          tools: openaiTools,
        })

        const choice = response.choices[0]
        totalInputTokens += response.usage?.prompt_tokens ?? 0
        totalOutputTokens += response.usage?.completion_tokens ?? 0

        if (choice.message.content) {
          fullText += choice.message.content
          callbacks.onToken(choice.message.content)
        }

        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          conversationMessages.push(choice.message)

          for (const toolCall of choice.message.tool_calls) {
            const toolResult = await callbacks.onToolCall({
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
            })

            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResult,
            })
          }

          continueLoop = true
        } else {
          callbacks.onComplete(fullText, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens })
        }
      }
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
