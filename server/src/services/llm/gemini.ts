import { GoogleGenAI, type Content, type Part, type FunctionDeclaration, type GenerateContentResponse } from '@google/genai'
import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js'

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey })
    this.model = model
  }

  private buildContents(messages: LLMMessage[]): Content[] {
    return messages.map(m => {
      const parts: Part[] = []

      // Add images if present
      if (m.images && m.images.length > 0) {
        for (const img of m.images) {
          parts.push({
            inlineData: {
              mimeType: img.mediaType,
              data: img.source,
            },
          })
        }
      }

      // Add text
      if (m.content) {
        parts.push({ text: m.content })
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      }
    })
  }

  async stream(
    systemPrompt: string,
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks
  ): Promise<void> {
    let fullText = ''

    try {
      const contents = this.buildContents(messages)

      const response = await this.client.models.generateContentStream({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 32768,
        },
      })

      for await (const chunk of response) {
        const text = chunk.text ?? ''
        if (text) {
          fullText += text
          callbacks.onToken(text)
        }
      }

      // Gemini doesn't provide exact token counts in streaming, estimate
      const inputTokens = Math.ceil(JSON.stringify(contents).length / 4)
      const outputTokens = Math.ceil(fullText.length / 4)

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

    const functionDeclarations: FunctionDeclaration[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as FunctionDeclaration['parameters'],
    }))

    const conversationContents: Content[] = this.buildContents(messages)

    try {
      let continueLoop = true

      while (continueLoop) {
        continueLoop = false

        const response: GenerateContentResponse = await this.client.models.generateContent({
          model: this.model,
          contents: conversationContents,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 32768,
            tools: [{ functionDeclarations }],
          },
        })

        const candidate = response.candidates?.[0]
        if (!candidate?.content?.parts) break

        // Estimate tokens
        totalInputTokens += Math.ceil(JSON.stringify(conversationContents).length / 4)
        totalOutputTokens += Math.ceil(JSON.stringify(candidate.content.parts).length / 4)

        const assistantParts: Part[] = []
        let hasToolCalls = false

        for (const part of candidate.content.parts) {
          if (part.text) {
            fullText += part.text
            callbacks.onToken(part.text)
            assistantParts.push(part)
          } else if (part.functionCall) {
            hasToolCalls = true
            assistantParts.push(part)

            const toolResult = await callbacks.onToolCall({
              id: part.functionCall.name ?? 'unknown',
              name: part.functionCall.name ?? 'unknown',
              input: (part.functionCall.args ?? {}) as Record<string, unknown>,
            })

            // Add assistant message with tool call
            conversationContents.push({
              role: 'model',
              parts: assistantParts,
            })

            // Add tool result
            conversationContents.push({
              role: 'user',
              parts: [{
                functionResponse: {
                  name: part.functionCall.name ?? 'unknown',
                  response: { result: toolResult },
                },
              }],
            })

            continueLoop = true
            break
          }
        }

        if (!hasToolCalls) {
          if (assistantParts.length > 0) {
            conversationContents.push({
              role: 'model',
              parts: assistantParts,
            })
          }
          callbacks.onComplete(fullText, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens })
        }
      }
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
