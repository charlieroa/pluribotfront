import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import { broadcast } from './sse.js';
import { getProvider } from './llm/router.js';
import { orchestratorConfig } from '../config/agents.js';
import { trackUsage } from './token-tracker.js';
import { checkCredits, consumeCredits } from './credit-tracker.js';
import { setPendingPlan } from './plan-cache.js';
import { agentConfigs } from '../config/agents.js';
import { readAndEncodeImage } from './image-utils.js';
import { handleAnonymousMessage } from './anonymous-handler.js';
import { resolveModelConfig, resolveAvailableConfig } from './model-resolver.js';
import { startParallelExecution } from './execution-engine.js';
import { getToolDefinitions, executeToolCall } from './tools/executor.js';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function stripCodeFences(text) {
    return text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
}
function tryParseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function extractJsonStringField(text, fieldName) {
    const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 's');
    const match = text.match(pattern);
    if (!match)
        return null;
    try {
        return JSON.parse(`"${match[1]}"`);
    }
    catch {
        return match[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');
    }
}
function salvageJsonLikeOutput(text) {
    if (!text.includes('"directResponse"') && !text.includes('"quickReplies"') && !text.includes('"steps"')) {
        return null;
    }
    const directResponse = extractJsonStringField(text, 'directResponse') ?? undefined;
    const quickReplyMatches = [...text.matchAll(/"label"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"value"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
    const quickReplies = quickReplyMatches.map(([, rawLabel, rawValue]) => ({
        label: (() => {
            try {
                return JSON.parse(`"${rawLabel}"`);
            }
            catch {
                return rawLabel;
            }
        })(),
        value: (() => {
            try {
                return JSON.parse(`"${rawValue}"`);
            }
            catch {
                return rawValue;
            }
        })(),
    }));
    if (!directResponse && quickReplies.length === 0) {
        return null;
    }
    return {
        directResponse,
        quickReplies,
        steps: [],
    };
}
function normalizeOrchestratorOutput(output, fallbackText) {
    const quickReplies = Array.isArray(output.quickReplies)
        ? output.quickReplies
            .filter((item) => {
            return !!item && typeof item.label === 'string' && typeof item.value === 'string';
        })
            .map(item => ({
            label: item.label.trim(),
            value: item.value.trim(),
            ...(item.icon ? { icon: item.icon } : {}),
        }))
            .filter(item => item.label && item.value)
        : [];
    const steps = Array.isArray(output.steps)
        ? output.steps
            .filter((step) => {
            return !!step && typeof step.agentId === 'string' && typeof step.task === 'string';
        })
            .map(step => ({
            agentId: step.agentId,
            task: step.task,
            ...(step.instanceId ? { instanceId: step.instanceId } : {}),
            ...(step.userDescription ? { userDescription: step.userDescription } : {}),
            ...(Array.isArray(step.dependsOn) ? { dependsOn: step.dependsOn.filter(dep => typeof dep === 'string') } : {}),
        }))
        : [];
    const directResponse = typeof output.directResponse === 'string'
        ? output.directResponse.trim()
        : '';
    return {
        directResponse: directResponse || (steps.length === 0 ? (quickReplies.length > 0 ? '¿Qué tipo de proyecto prefieres?' : stripCodeFences(fallbackText)) : undefined),
        quickReplies,
        steps,
    };
}
function parseOrchestratorOutput(fullText) {
    const cleaned = stripCodeFences(fullText);
    const directParse = tryParseJson(cleaned);
    if (directParse)
        return normalizeOrchestratorOutput(directParse, fullText);
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const candidate = cleaned.slice(firstBrace, lastBrace + 1);
        const substringParse = tryParseJson(candidate);
        if (substringParse)
            return normalizeOrchestratorOutput(substringParse, fullText);
        const repairedParse = tryParseJson(candidate.replace(/,\s*([}\]])/g, '$1'));
        if (repairedParse)
            return normalizeOrchestratorOutput(repairedParse, fullText);
    }
    const salvaged = salvageJsonLikeOutput(cleaned);
    if (salvaged)
        return normalizeOrchestratorOutput(salvaged, fullText);
    return {
        directResponse: cleaned || fullText,
        quickReplies: [],
        steps: [],
    };
}
export async function processMessage(conversationId, text, userId, modelOverride, imageUrl) {
    console.log('[processMessage] Start for:', conversationId);
    if (userId === 'anonymous') {
        await handleAnonymousMessage(conversationId, text);
        return;
    }
    const creditCheck = await checkCredits(userId);
    if (!creditCheck.allowed) {
        broadcast(conversationId, {
            type: 'credits_exhausted',
            balance: creditCheck.balance,
            planId: creditCheck.planId,
        });
        const exhaustedMsg = await prisma.message.create({
            data: {
                id: uuid(),
                conversationId,
                sender: 'Sistema',
                text: 'Tus creditos se han agotado. Actualiza tu plan para seguir usando los agentes.',
                type: 'agent',
                botType: 'system',
            },
        });
        broadcast(conversationId, {
            type: 'agent_end',
            agentId: 'system',
            messageId: exhaustedMsg.id,
            fullText: exhaustedMsg.text,
        });
        return;
    }
    broadcast(conversationId, {
        type: 'agent_thinking',
        agentId: 'base',
        agentName: 'Pluria',
        step: 'Analizando tu solicitud...',
    });
    const history = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 20,
    });
    const messages = history.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text,
    }));
    if (imageUrl) {
        const encoded = await readAndEncodeImage(imageUrl);
        if (encoded) {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
                lastUserMsg.images = [{ type: 'image', source: encoded.source, mediaType: encoded.mediaType }];
                // Append the image URL to the text so the orchestrator can pass it to agents (e.g. for remove_background tool)
                lastUserMsg.content += `\n\n[Imagen adjunta por el usuario: ${imageUrl}]`;
            }
        }
    }
    broadcast(conversationId, {
        type: 'agent_thinking',
        agentId: 'base',
        agentName: 'Pluria',
        step: 'Decidiendo que agentes activar...',
    });
    console.log('[processMessage] Calling orchestrator LLM...');
    const orchConfig = modelOverride
        ? resolveModelConfig(modelOverride, orchestratorConfig.modelConfig) ?? orchestratorConfig.modelConfig
        : orchestratorConfig.modelConfig;
    const resolvedOrchConfig = await resolveAvailableConfig(orchConfig);
    if (!resolvedOrchConfig) {
        broadcast(conversationId, {
            type: 'error',
            message: 'Ningun proveedor de IA esta disponible en este momento. Verifica las API keys en el panel de administracion.',
        });
        return;
    }
    const provider = getProvider(resolvedOrchConfig);
    let orchestratorOutput = null;
    const orchTools = orchestratorConfig.tools;
    if (orchTools.length > 0) {
        const toolDefs = await getToolDefinitions(orchTools, userId);
        await provider.streamWithTools(orchestratorConfig.systemPrompt, messages, toolDefs, {
            onToken: () => { },
            onToolCall: async (toolCall) => {
                broadcast(conversationId, {
                    type: 'agent_thinking',
                    agentId: 'base',
                    agentName: 'Pluria',
                    step: toolCall.name === 'web_fetch' ? 'Visitando sitio web de referencia...' : `Usando ${toolCall.name}...`,
                });
                return await executeToolCall(toolCall, conversationId, orchestratorConfig, userId);
            },
            onComplete: (fullText, usage) => {
                console.log('[processMessage] LLM complete:', fullText.substring(0, 100));
                orchestratorOutput = parseOrchestratorOutput(fullText);
                trackUsage(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error);
                consumeCredits(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens).catch(console.error);
            },
            onError: (err) => {
                console.error('[Orchestrator] Error:', err);
                broadcast(conversationId, { type: 'error', message: 'Error al analizar el mensaje' });
            },
        });
    }
    else {
        await provider.stream(orchestratorConfig.systemPrompt, messages, {
            onToken: () => { },
            onComplete: (fullText, usage) => {
                console.log('[processMessage] LLM complete:', fullText.substring(0, 100));
                orchestratorOutput = parseOrchestratorOutput(fullText);
                trackUsage(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens).catch(console.error);
                consumeCredits(userId, 'base', resolvedOrchConfig.model, usage.inputTokens, usage.outputTokens, usage.cacheCreationInputTokens, usage.cacheReadInputTokens).catch(console.error);
            },
            onError: (err) => {
                console.error('[Orchestrator] Error:', err);
                broadcast(conversationId, { type: 'error', message: 'Error al analizar el mensaje' });
            },
        });
    }
    console.log('[processMessage] Output:', orchestratorOutput ? 'ready' : 'null');
    if (!orchestratorOutput)
        return;
    broadcast(conversationId, {
        type: 'agent_thinking',
        agentId: 'base',
        agentName: 'Pluria',
        step: 'Preparando plan de ejecucion...',
    });
    const output = orchestratorOutput;
    if (!Array.isArray(output.steps))
        output.steps = [];
    const instanceCounts = {};
    for (const s of output.steps) {
        if (!s.instanceId) {
            instanceCounts[s.agentId] = (instanceCounts[s.agentId] || 0) + 1;
            s.instanceId = `${s.agentId}-${instanceCounts[s.agentId]}`;
        }
        if (!s.userDescription) {
            s.userDescription = s.task;
        }
    }
    if (output.steps.length > 0) {
        const stepsForExec = output.steps.map(s => ({
            agentId: s.agentId,
            instanceId: s.instanceId,
            task: s.task,
            userDescription: s.userDescription,
            dependsOn: s.dependsOn,
        }));
        const getAgentName = (agentId) => agentConfigs.find(a => a.id === agentId)?.name ?? agentId;
        if (stepsForExec.length >= 2) {
            // 2+ steps → show plan proposal for user approval
            const approvalMsg = await prisma.message.create({
                data: {
                    id: uuid(),
                    conversationId,
                    sender: 'Pluria',
                    text: 'He preparado un plan de trabajo para tu proyecto. Revisa los pasos y aprueba para comenzar.',
                    type: 'approval',
                    botType: 'base',
                },
            });
            await setPendingPlan(approvalMsg.id, { steps: stepsForExec });
            broadcast(conversationId, {
                type: 'plan_proposal',
                messageId: approvalMsg.id,
                text: approvalMsg.text,
                steps: stepsForExec.map(s => ({
                    agentId: s.agentId,
                    agentName: getAgentName(s.agentId),
                    instanceId: s.instanceId,
                    task: s.task,
                    userDescription: s.userDescription,
                    dependsOn: s.dependsOn,
                })),
            });
        }
        else {
            // Single step → execute directly (builder mode)
            await startParallelExecution(conversationId, stepsForExec, userId, modelOverride, imageUrl);
        }
    }
    else if (output.directResponse) {
        const directMsg = await prisma.message.create({
            data: {
                id: uuid(),
                conversationId,
                sender: 'Pluria',
                text: output.directResponse,
                type: 'agent',
                botType: 'base',
            },
        });
        broadcast(conversationId, {
            type: 'agent_thinking',
            agentId: 'base',
            agentName: 'Pluria',
            step: 'Escribiendo respuesta...',
        });
        await sleep(150);
        broadcast(conversationId, { type: 'agent_start', agentId: 'base', agentName: 'Pluria' });
        const words = output.directResponse.split(' ');
        const chunkSize = 5;
        for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            const prefix = i === 0 ? '' : ' ';
            broadcast(conversationId, { type: 'token', content: prefix + chunk, agentId: 'base' });
            await sleep(10);
        }
        broadcast(conversationId, {
            type: 'agent_end',
            agentId: 'base',
            messageId: directMsg.id,
            fullText: output.directResponse,
        });
        // Send quick replies if the orchestrator provided them
        if (output.quickReplies && output.quickReplies.length > 0) {
            broadcast(conversationId, {
                type: 'quick_replies',
                options: output.quickReplies,
            });
        }
    }
}
//# sourceMappingURL=orchestrator.js.map