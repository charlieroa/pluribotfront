import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import { optionalAuth } from '../middleware/auth.js';
import { addConnection, broadcast } from '../services/sse.js';
import { REFINE_AGENT_IDS } from '../config/agents.js';
import { getPendingPlan, removePendingPlan, getExecutingPlan, setExecutingPlan, removeExecutingPlan, } from '../services/plan-cache.js';
import { createTodoKanbanTask, startParallelExecution, executeCurrentGroup, executeSingleStep } from '../services/execution-engine.js';
import { refineStep } from '../services/refinement.js';
import { processMessage } from '../services/orchestrator.js';
const router = Router();
// Create a new conversation (client calls this first, then connects SSE)
router.post('/conversation', optionalAuth, async (req, res) => {
    const userId = req.auth?.userId ?? 'anonymous';
    const { title } = req.body;
    try {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            user = await prisma.user.create({
                data: { id: userId, email: `${userId}@anonymous`, passwordHash: '', name: 'Anonimo' },
            });
        }
        const conversation = await prisma.conversation.create({
            data: { userId: user.id, title: title ?? 'Nueva conversacion' },
        });
        res.json({ conversationId: conversation.id });
    }
    catch (err) {
        console.error('[Chat] Error creating conversation:', err);
        res.status(500).json({ error: 'Error al crear conversacion' });
    }
});
// SSE stream for a conversation
router.get('/:conversationId/stream', optionalAuth, (req, res) => {
    const conversationId = req.params.conversationId;
    const userId = req.auth?.userId ?? 'anonymous';
    addConnection(conversationId, res, userId);
});
// Send a message — SSE must be connected BEFORE calling this
router.post('/send', optionalAuth, async (req, res) => {
    const { conversationId, text, modelOverride, imageUrl } = req.body;
    const userId = req.auth?.userId ?? 'anonymous';
    if (!conversationId) {
        res.status(400).json({ error: 'conversationId requerido. Crea conversacion primero con POST /conversation' });
        return;
    }
    try {
        // Check if user is an assigned agent on this conversation
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { assignedAgentId: true, needsHumanReview: true, userId: true },
        });
        if (!conversation) {
            res.status(404).json({ error: 'Conversacion no encontrada. Inicia una nueva.' });
            return;
        }
        const senderFull = userId !== 'anonymous'
            ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, specialty: true, specialtyColor: true, avatarUrl: true } })
            : null;
        const isAssignedAgent = conversation?.assignedAgentId === userId && senderFull && ['superadmin', 'org_admin', 'agent'].includes(senderFull.role);
        const isHumanConversation = conversation?.needsHumanReview;
        // ─── Case 1: Admin/agent writes in assigned conversation → human agent message, no AI ───
        if (isAssignedAgent && senderFull) {
            const message = await prisma.message.create({
                data: {
                    id: uuid(),
                    conversationId,
                    sender: 'human_agent',
                    text,
                    type: 'agent',
                    botType: userId,
                },
            });
            broadcast(conversationId, {
                type: 'human_message',
                agentName: senderFull.name,
                agentRole: senderFull.specialty || (senderFull.role === 'superadmin' ? 'Supervisor' : senderFull.role === 'org_admin' ? 'Administrador' : 'Agente'),
                text,
                messageId: message.id,
                specialty: senderFull.specialty ?? undefined,
                specialtyColor: senderFull.specialtyColor ?? undefined,
                avatarUrl: senderFull.avatarUrl ?? undefined,
            });
            res.json({ conversationId, messageId: message.id });
            return;
        }
        // ─── Normal user message ───
        const userMessage = await prisma.message.create({
            data: {
                id: uuid(),
                conversationId,
                sender: 'Tu',
                text,
                type: 'user',
            },
        });
        // Update conversation title from first message
        const msgCount = await prisma.message.count({ where: { conversationId } });
        if (msgCount === 1) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { title: text.slice(0, 50) },
            });
        }
        const response = {
            conversationId,
            messageId: userMessage.id,
        };
        res.json(response);
        // Detect human assistance requests
        const HUMAN_PATTERNS = [/asistencia humana/i, /ayuda humana/i, /hablar con.*(persona|humano|agente)/i, /soporte humano/i, /necesito.*humano/i, /agente humano/i];
        const needsHuman = HUMAN_PATTERNS.some(p => p.test(text));
        if (needsHuman) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { needsHumanReview: true },
            });
            const sysMsg = await prisma.message.create({
                data: {
                    id: uuid(),
                    conversationId,
                    sender: 'Sistema',
                    text: 'Tu solicitud de asistencia humana ha sido registrada. Un agente se pondrá en contacto pronto.',
                    type: 'agent',
                    botType: 'system',
                },
            });
            broadcast(conversationId, { type: 'human_review_requested', conversationId });
            broadcast(conversationId, {
                type: 'agent_end',
                agentId: 'system',
                messageId: sysMsg.id,
                fullText: sysMsg.text,
            });
            // Auto-assign specialist by keywords
            try {
                const chatUser = await prisma.user.findUnique({ where: { id: userId !== 'anonymous' ? userId : '' } });
                const orgId = chatUser?.organizationId;
                const specialists = await prisma.user.findMany({
                    where: {
                        role: 'agent',
                        specialty: { not: null },
                        ...(orgId ? { organizationId: orgId } : {}),
                    },
                });
                if (specialists.length > 0) {
                    const lowerText = text.toLowerCase();
                    const allMessages = await prisma.message.findMany({ where: { conversationId }, take: 10 });
                    const conversationContext = allMessages.map((m) => m.text).join(' ').toLowerCase();
                    let bestMatch = null;
                    for (const spec of specialists) {
                        const keywords = (spec.specialtyKeywords || spec.specialty || '').toLowerCase().split(',').map((k) => k.trim());
                        const matchScore = keywords.filter((k) => k && (lowerText.includes(k) || conversationContext.includes(k))).length;
                        if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
                            bestMatch = { specialist: spec, score: matchScore };
                        }
                    }
                    if (bestMatch) {
                        await prisma.conversation.update({
                            where: { id: conversationId },
                            data: { assignedAgentId: bestMatch.specialist.id },
                        });
                        broadcast(conversationId, {
                            type: 'human_agent_joined',
                            agentName: bestMatch.specialist.name,
                            agentRole: bestMatch.specialist.specialty || 'Especialista',
                            specialty: bestMatch.specialist.specialty ?? undefined,
                            specialtyColor: bestMatch.specialist.specialtyColor ?? undefined,
                            avatarUrl: bestMatch.specialist.avatarUrl ?? undefined,
                        });
                    }
                }
            }
            catch (autoErr) {
                console.error('[Chat] Auto-assign specialist error:', autoErr);
            }
        }
        // ─── Case 2: Client replies in a human-supervised conversation → no AI ───
        if (isHumanConversation || needsHuman) {
            if (!needsHuman) {
                // Only broadcast user echo for already-flagged conversations (not freshly detected)
                broadcast(conversationId, {
                    type: 'agent_end',
                    agentId: 'system',
                    messageId: userMessage.id,
                    fullText: text,
                });
            }
            return;
        }
        // ─── Case 3: Normal flow → trigger AI ───
        processMessage(conversationId, text, userId, modelOverride, imageUrl).catch(err => {
            console.error('[Chat] Error processing message:', err);
            broadcast(conversationId, { type: 'error', message: 'Error procesando mensaje' });
        });
    }
    catch (err) {
        console.error('[Chat] Error:', err);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});
// Approve or reject a plan (with optional instance selection)
router.post('/approve', optionalAuth, async (req, res) => {
    const { messageId, approved, selectedAgents } = req.body;
    const userId = req.auth?.userId ?? 'anonymous';
    try {
        const message = await prisma.message.update({
            where: { id: messageId },
            data: { approved },
        });
        const conversationId = message.conversationId;
        if (approved) {
            const plan = await getPendingPlan(messageId);
            if (plan) {
                await removePendingPlan(messageId);
                // selectedAgents now contains instanceIds
                let steps = plan.steps;
                if (selectedAgents && selectedAgents.length > 0) {
                    const selectedSet = new Set(selectedAgents);
                    steps = steps.filter(s => selectedSet.has(s.instanceId));
                    // Clean up dependsOn references to removed instances
                    steps = steps.map(s => ({
                        ...s,
                        dependsOn: s.dependsOn?.filter(dep => selectedSet.has(dep)),
                    }));
                }
                // Create 'todo' kanban tasks for each step
                for (const step of steps) {
                    await createTodoKanbanTask(conversationId, step);
                }
                // Start parallel execution
                startParallelExecution(conversationId, steps, userId).catch(err => {
                    console.error('[Chat] Error executing plan:', err);
                    broadcast(conversationId, { type: 'error', message: 'Error ejecutando el plan' });
                });
            }
        }
        else {
            const rejectMsg = await prisma.message.create({
                data: {
                    id: uuid(),
                    conversationId,
                    sender: 'Pluria',
                    text: 'Proceso cancelado. En que mas puedo ayudarte?',
                    type: 'agent',
                    botType: 'base',
                },
            });
            broadcast(conversationId, {
                type: 'agent_end',
                agentId: 'base',
                messageId: rejectMsg.id,
                fullText: rejectMsg.text,
            });
        }
        res.json({ ok: true });
    }
    catch (err) {
        console.error('[Chat] Approve error:', err);
        res.status(500).json({ error: 'Error al procesar aprobacion' });
    }
});
// Approve or stop — advances to next execution group
router.post('/approve-step', optionalAuth, async (req, res) => {
    const { conversationId, approved } = req.body;
    try {
        if (!approved) {
            // User stopped the plan
            await removeExecutingPlan(conversationId);
            broadcast(conversationId, { type: 'coordination_end' });
            const stopMsg = await prisma.message.create({
                data: {
                    id: uuid(),
                    conversationId,
                    sender: 'Pluria',
                    text: 'Ejecucion detenida por el usuario. Los resultados generados hasta ahora se conservan.',
                    type: 'agent',
                    botType: 'base',
                },
            });
            broadcast(conversationId, {
                type: 'agent_end',
                agentId: 'base',
                messageId: stopMsg.id,
                fullText: stopMsg.text,
            });
            res.json({ ok: true });
            return;
        }
        // Continue to next group
        const plan = await getExecutingPlan(conversationId);
        if (!plan) {
            res.status(404).json({ error: 'No hay plan en ejecucion para esta conversacion' });
            return;
        }
        // Advance to next group
        plan.currentGroupIndex++;
        await setExecutingPlan(conversationId, plan);
        if (plan.currentGroupIndex >= plan.executionGroups.length) {
            // All groups done — user clicked "Finalizar" after refining
            await removeExecutingPlan(conversationId);
            broadcast(conversationId, { type: 'coordination_end' });
            res.json({ ok: true });
            return;
        }
        res.json({ ok: true });
        // Execute next group
        executeCurrentGroup(plan).catch(err => {
            console.error('[Chat] Error executing next group:', err);
            broadcast(conversationId, { type: 'error', message: 'Error ejecutando el siguiente paso' });
        });
    }
    catch (err) {
        console.error('[Chat] Approve-step error:', err);
        res.status(500).json({ error: 'Error al procesar aprobacion de paso' });
    }
});
// Refine a visual agent's output with user feedback
router.post('/refine-step', optionalAuth, async (req, res) => {
    const { conversationId, text, instanceId, selectedLogoIndex, selectedLogoSrc } = req.body;
    const userId = req.auth?.userId ?? 'anonymous';
    try {
        const plan = await getExecutingPlan(conversationId);
        if (!plan) {
            res.status(404).json({ error: 'No hay plan en ejecucion' });
            return;
        }
        // Find the step to refine — by instanceId or fallback to last completed visual agent
        let stepToRefine;
        if (instanceId) {
            stepToRefine = plan.steps.find(s => s.instanceId === instanceId);
        }
        else {
            // Fallback: find the last completed refine-capable agent in the current group
            const currentGroup = plan.executionGroups[plan.currentGroupIndex];
            if (currentGroup) {
                for (let i = currentGroup.instanceIds.length - 1; i >= 0; i--) {
                    const iid = currentGroup.instanceIds[i];
                    const step = plan.steps.find(s => s.instanceId === iid);
                    if (step && REFINE_AGENT_IDS.includes(step.agentId) && plan.completedInstances.includes(iid)) {
                        stepToRefine = step;
                        break;
                    }
                }
            }
        }
        if (!stepToRefine) {
            res.status(400).json({ error: 'No hay paso para refinar' });
            return;
        }
        // Save user message
        const userMessage = await prisma.message.create({
            data: {
                id: uuid(),
                conversationId,
                sender: 'Tu',
                text,
                type: 'user',
            },
        });
        res.json({ ok: true, messageId: userMessage.id });
        // Build feedback text with logo context if selected
        let feedbackText = text;
        if (selectedLogoIndex !== undefined && selectedLogoSrc) {
            feedbackText = `El cliente selecciono la OPCION ${selectedLogoIndex + 1}. URL: ${selectedLogoSrc}. Genera una nueva version SOLO de este logo, manteniendo su estilo base. Cambios solicitados: ${text}`;
        }
        // Execute refinement async
        refineStep(plan, stepToRefine, feedbackText, userId).catch(err => {
            console.error('[Chat] Error refining step:', err);
            broadcast(conversationId, { type: 'error', message: 'Error al refinar el paso' });
        });
    }
    catch (err) {
        console.error('[Chat] Refine-step error:', err);
        res.status(500).json({ error: 'Error al refinar paso' });
    }
});
// Abort current execution — user clicked "Stop"
router.post('/abort', optionalAuth, async (req, res) => {
    const { conversationId } = req.body;
    try {
        const plan = await getExecutingPlan(conversationId);
        if (plan) {
            await removeExecutingPlan(conversationId);
        }
        broadcast(conversationId, { type: 'coordination_end' });
        const stopMsg = await prisma.message.create({
            data: {
                id: uuid(),
                conversationId,
                sender: 'Sistema',
                text: 'Ejecucion detenida por el usuario.',
                type: 'agent',
                botType: 'system',
            },
        });
        broadcast(conversationId, {
            type: 'agent_end',
            agentId: 'system',
            messageId: stopMsg.id,
            fullText: stopMsg.text,
        });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('[Chat] Abort error:', err);
        res.status(500).json({ error: 'Error al detener ejecucion' });
    }
});
// Activate a bot and continue execution
router.post('/activate-and-continue', optionalAuth, async (req, res) => {
    const { conversationId, botId } = req.body;
    const userId = req.auth?.userId ?? 'anonymous';
    try {
        // Activate the bot
        if (userId !== 'anonymous') {
            await prisma.userBot.upsert({
                where: { userId_botId: { userId, botId } },
                update: { isActive: true },
                create: { userId, botId, isActive: true },
            });
        }
        // Re-execute the current plan if available
        const plan = await getExecutingPlan(conversationId);
        if (plan) {
            const step = plan.steps.find(s => s.agentId === botId && !plan.completedInstances.includes(s.instanceId));
            if (step) {
                res.json({ ok: true });
                executeSingleStep(plan, step).catch(err => {
                    console.error('[Chat] Error re-executing step:', err);
                    broadcast(conversationId, { type: 'error', message: `Error al ejecutar ${botId}` });
                });
                return;
            }
        }
        res.json({ ok: true });
    }
    catch (err) {
        console.error('[Chat] Activate-and-continue error:', err);
        res.status(500).json({ error: 'Error al activar bot' });
    }
});
export default router;
//# sourceMappingURL=chat.js.map