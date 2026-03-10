import Anthropic from '@anthropic-ai/sdk';
export class AnthropicProvider {
    client;
    model;
    maxTokens;
    temperature;
    constructor(apiKey, model, maxTokens = 32768, temperature) {
        this.client = new Anthropic({ apiKey });
        this.model = model;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
    }
    async stream(systemPrompt, messages, callbacks) {
        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;
        try {
            const stream = this.client.messages.stream({
                model: this.model,
                max_tokens: this.maxTokens,
                ...(this.temperature !== undefined && { temperature: this.temperature }),
                system: systemPrompt,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.images && m.images.length > 0
                        ? [
                            ...m.images.map(img => ({
                                type: 'image',
                                source: { type: 'base64', media_type: img.mediaType, data: img.source },
                            })),
                            { type: 'text', text: m.content },
                        ]
                        : m.content,
                })),
            });
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    fullText += event.delta.text;
                    callbacks.onToken(event.delta.text);
                }
            }
            const finalMessage = await stream.finalMessage();
            inputTokens = finalMessage.usage.input_tokens;
            outputTokens = finalMessage.usage.output_tokens;
            callbacks.onComplete(fullText, { inputTokens, outputTokens });
        }
        catch (err) {
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
    }
    async streamWithTools(systemPrompt, messages, tools, callbacks) {
        let fullText = '';
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const anthropicTools = tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
        }));
        const conversationMessages = messages.map(m => ({
            role: m.role,
            content: m.images && m.images.length > 0
                ? [
                    ...m.images.map(img => ({
                        type: 'image',
                        source: { type: 'base64', media_type: img.mediaType, data: img.source },
                    })),
                    { type: 'text', text: m.content },
                ]
                : m.content,
        }));
        try {
            let continueLoop = true;
            while (continueLoop) {
                continueLoop = false;
                // Use streaming to avoid SDK timeout errors on long tool calls
                const stream = this.client.messages.stream({
                    model: this.model,
                    max_tokens: this.maxTokens,
                    ...(this.temperature !== undefined && { temperature: this.temperature }),
                    system: systemPrompt,
                    messages: conversationMessages,
                    tools: anthropicTools,
                });
                // Collect content blocks from the stream
                const assistantContent = [];
                let currentToolUse = null;
                for await (const event of stream) {
                    if (event.type === 'content_block_start') {
                        if (event.content_block.type === 'tool_use') {
                            currentToolUse = { id: event.content_block.id, name: event.content_block.name, jsonBuf: '' };
                        }
                    }
                    else if (event.type === 'content_block_delta') {
                        if (event.delta.type === 'text_delta') {
                            fullText += event.delta.text;
                            callbacks.onToken(event.delta.text);
                        }
                        else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                            currentToolUse.jsonBuf += event.delta.partial_json;
                        }
                    }
                    else if (event.type === 'content_block_stop' && currentToolUse) {
                        // Tool use block complete — will process after stream ends
                    }
                }
                const finalMessage = await stream.finalMessage();
                totalInputTokens += finalMessage.usage.input_tokens;
                totalOutputTokens += finalMessage.usage.output_tokens;
                // Separate text and tool_use blocks
                const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use');
                if (toolUseBlocks.length > 0) {
                    // Execute ALL tool calls in parallel
                    const toolResults = await Promise.all(toolUseBlocks.map(async (block) => {
                        const result = await callbacks.onToolCall({
                            id: block.id,
                            name: block.name,
                            input: block.input,
                        });
                        return { tool_use_id: block.id, content: result };
                    }));
                    // Add assistant message with all content blocks (text + tool_use)
                    conversationMessages.push({ role: 'assistant', content: finalMessage.content });
                    // Add all tool results in a single user message
                    conversationMessages.push({
                        role: 'user',
                        content: toolResults.map(r => ({
                            type: 'tool_result',
                            tool_use_id: r.tool_use_id,
                            content: r.content,
                        })),
                    });
                    continueLoop = true;
                }
                else {
                    callbacks.onComplete(fullText, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
                }
            }
        }
        catch (err) {
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
    }
}
//# sourceMappingURL=anthropic.js.map