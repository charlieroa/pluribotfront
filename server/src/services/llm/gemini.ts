import { GoogleGenAI, type Content, type Part, type FunctionDeclaration, type GenerateContentResponse } from '@google/genai'
import type { LLMProvider, LLMMessage, LLMStreamCallbacks, LLMStreamWithToolsCallbacks, ToolDefinition } from './types.js'

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI
  private model: string
  private temperature: number | undefined

  constructor(apiKey: string, model: string, temperature?: number) {
    this.client = new GoogleGenAI({ apiKey })
    this.model = model
    this.temperature = temperature
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
          ...(this.temperature !== undefined && { temperature: this.temperature }),
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
            ...(this.temperature !== undefined && { temperature: this.temperature }),
            tools: [{ functionDeclarations }],
          },
        })

        const candidate = response.candidates?.[0]
        if (!candidate?.content?.parts) break

        // Estimate tokens
        totalInputTokens += Math.ceil(JSON.stringify(conversationContents).length / 4)
        totalOutputTokens += Math.ceil(JSON.stringify(candidate.content.parts).length / 4)

        const assistantParts: Part[] = []
        const functionCallParts: Part[] = []

        for (const part of candidate.content.parts) {
          if (part.text) {
            fullText += part.text
            callbacks.onToken(part.text)
            assistantParts.push(part)
          } else if (part.functionCall) {
            assistantParts.push(part)
            functionCallParts.push(part)
          }
        }

        if (functionCallParts.length > 0) {
          // Execute ALL tool calls in parallel
          const toolResults = await Promise.all(
            functionCallParts.map(async (part) => {
              const result = await callbacks.onToolCall({
                id: part.functionCall!.name ?? 'unknown',
                name: part.functionCall!.name ?? 'unknown',
                input: (part.functionCall!.args ?? {}) as Record<string, unknown>,
              })
              return {
                name: part.functionCall!.name ?? 'unknown',
                result,
              }
            })
          )

          // Add assistant message with all parts
          conversationContents.push({
            role: 'model',
            parts: assistantParts,
          })

          // Add all tool results in a single user message
          conversationContents.push({
            role: 'user',
            parts: toolResults.map(r => ({
              functionResponse: {
                name: r.name,
                response: { result: r.result },
              },
            })),
          })

          continueLoop = true
        } else {
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
