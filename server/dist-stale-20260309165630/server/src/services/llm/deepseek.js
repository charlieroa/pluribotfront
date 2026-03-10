import OpenAI from 'openai';
export class DeepSeekProvider {
    client;
    model;
    maxTokens;
    temperature;
    jsonMode;
    constructor(apiKey, model, maxTokens, temperature, jsonMode) {
        this.client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
        this.model = model;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
        this.jsonMode = jsonMode ?? false;
    }
    async stream(systemPrompt, messages, callbacks) {
        let fullText = '';
        try {
            console.log(`[DeepSeek] Starting stream: model=${this.model}, maxTokens=${this.maxTokens}, temp=${this.temperature}, jsonMode=${this.jsonMode}`);
            const stream = await this.client.chat.completions.create({
                model: this.model,
                stream: true,
                stream_options: { include_usage: true },
                ...(this.maxTokens !== undefined && { max_tokens: this.maxTokens }),
                ...(this.temperature !== undefined && { temperature: this.temperature }),
                ...(this.jsonMode && { response_format: { type: 'json_object' } }),
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map((m) => {
                        if (m.role === 'user') {
                            return {
                                role: 'user',
                                content: m.images && m.images.length > 0
                                    ? [
                                        ...m.images.map(img => ({
                                            type: 'image_url',
                                            image_url: { url: `data:${img.mediaType};base64,${img.source}` },
                                        })),
                                        { type: 'text', text: m.content },
                                    ]
                                    : m.content,
                            };
                        }
                        return { role: 'assistant', content: m.content };
                    }),
                ],
            });
            console.log(`[DeepSeek] Stream created, reading chunks...`);
            let inputTokens = 0;
            let outputTokens = 0;
            let chunkCount = 0;
            for await (const chunk of stream) {
                chunkCount++;
                if (chunkCount === 1)
                    console.log(`[DeepSeek] First chunk received`);
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    fullText += delta;
                    callbacks.onToken(delta);
                }
                if (chunk.usage) {
                    inputTokens = chunk.usage.prompt_tokens;
                    outputTokens = chunk.usage.completion_tokens;
                }
            }
            console.log(`[DeepSeek] Stream done: ${chunkCount} chunks, ${fullText.length} chars, ${outputTokens} tokens`);
            await callbacks.onComplete(fullText, { inputTokens, outputTokens });
        }
        catch (err) {
            console.error(`[DeepSeek] Stream error:`, err);
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
    }
    async streamWithTools(systemPrompt, messages, tools, callbacks) {
        let fullText = '';
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const openaiTools = tools.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const conversationMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => {
                if (m.role === 'user') {
                    return {
                        role: 'user',
                        content: m.images && m.images.length > 0
                            ? [
                                ...m.images.map(img => ({
                                    type: 'image_url',
                                    image_url: { url: `data:${img.mediaType};base64,${img.source}` },
                                })),
                                { type: 'text', text: m.content },
                            ]
                            : m.content,
                    };
                }
                return { role: 'assistant', content: m.content };
            }),
        ];
        try {
            let continueLoop = true;
            while (continueLoop) {
                continueLoop = false;
                const response = await this.client.chat.completions.create({
                    model: this.model,
                    messages: conversationMessages,
                    tools: openaiTools,
                    ...(this.maxTokens !== undefined && { max_tokens: this.maxTokens }),
                    ...(this.temperature !== undefined && { temperature: this.temperature }),
                    ...(this.jsonMode && { response_format: { type: 'json_object' } }),
                });
                const choice = response.choices[0];
                totalInputTokens += response.usage?.prompt_tokens ?? 0;
                totalOutputTokens += response.usage?.completion_tokens ?? 0;
                if (choice.message.content) {
                    fullText += choice.message.content;
                    callbacks.onToken(choice.message.content);
                }
                if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                    conversationMessages.push(choice.message);
                    const toolResults = await Promise.all(choice.message.tool_calls.map(async (toolCall) => {
                        const result = await callbacks.onToolCall({
                            id: toolCall.id,
                            name: toolCall.function.name,
                            input: JSON.parse(toolCall.function.arguments),
                        });
                        return { tool_call_id: toolCall.id, content: result };
                    }));
                    for (const r of toolResults) {
                        conversationMessages.push({
                            role: 'tool',
                            tool_call_id: r.tool_call_id,
                            content: r.content,
                        });
                    }
                    continueLoop = true;
                }
                else {
                    await callbacks.onComplete(fullText, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
                }
            }
        }
        catch (err) {
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
    }
}
//# sourceMappingURL=deepseek.js.map