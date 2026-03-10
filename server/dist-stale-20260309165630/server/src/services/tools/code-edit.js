import { v4 as uuid } from 'uuid';
import { prisma } from '../../db/client.js';
import { broadcast } from '../sse.js';
import { VISUAL_EDITOR_SCRIPT } from '../html-utils.js';
export const codeEditTools = [
    {
        name: 'code_edit',
        description: 'Edita el HTML del deliverable actual usando search-replace. Busca un bloque de texto exacto y lo reemplaza. Mucho mas eficiente que regenerar todo el HTML. Usa esta herramienta para cambios pequenos o medianos.',
        parameters: {
            type: 'object',
            properties: {
                search: {
                    type: 'string',
                    description: 'Texto exacto a buscar en el HTML actual del deliverable. Debe ser unico.',
                },
                replace: {
                    type: 'string',
                    description: 'Texto de reemplazo.',
                },
                description: {
                    type: 'string',
                    description: 'Descripcion breve del cambio realizado.',
                },
            },
            required: ['search', 'replace', 'description'],
        },
        execute: async (input, context) => {
            const search = input.search;
            const replace = input.replace;
            const description = input.description;
            // Find the latest deliverable for this conversation from the dev agent
            // Prefer filtering by instanceId if available (handles multi-step dev-1, dev-2, etc.)
            const deliverable = await prisma.deliverable.findFirst({
                where: {
                    conversationId: context.conversationId,
                    botType: 'dev',
                    ...(context.instanceId ? { instanceId: context.instanceId } : {}),
                },
                orderBy: { createdAt: 'desc' },
            });
            if (!deliverable) {
                return 'Error: No se encontro un deliverable del agente dev en esta conversacion. Genera primero el HTML completo.';
            }
            const currentContent = deliverable.content;
            // Check the search string exists in the content
            if (!currentContent.includes(search)) {
                return `Error: El texto a buscar no se encontro en el deliverable actual. Verifica que el texto sea exacto. Primeros 200 chars del deliverable:\n${currentContent.substring(0, 200)}`;
            }
            // Check uniqueness
            const occurrences = currentContent.split(search).length - 1;
            if (occurrences > 1) {
                return `Error: El texto a buscar aparece ${occurrences} veces. Proporciona un fragmento mas largo y unico para evitar reemplazos ambiguos.`;
            }
            // Apply the replacement
            const newContent = currentContent.replace(search, replace);
            // Inject visual editor script if not present
            let finalContent = newContent;
            if (!finalContent.includes('toggle-edit-mode') && finalContent.includes('</body>')) {
                const errorScript = `<script>window.onerror=function(msg,url,line,col){window.parent.postMessage({type:'iframe-error',error:String(msg),line:line},'*');}</script>`;
                finalContent = finalContent.replace('</head>', `${errorScript}\n</head>`);
                finalContent = finalContent.replace('</body>', `${VISUAL_EDITOR_SCRIPT}\n</body>`);
            }
            // CDN base for uploads
            const cdnBase = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`;
            finalContent = finalContent
                .replace(/src="\/uploads\//g, `src="${cdnBase}/uploads/`)
                .replace(/src='\/uploads\//g, `src='${cdnBase}/uploads/`);
            // Create new version
            const existingVersions = await prisma.deliverable.count({
                where: {
                    conversationId: context.conversationId,
                    instanceId: deliverable.instanceId,
                },
            });
            const newVersion = existingVersions + 1;
            const newDeliverableId = uuid();
            const newDeliverable = await prisma.deliverable.create({
                data: {
                    id: newDeliverableId,
                    conversationId: context.conversationId,
                    title: `${deliverable.title.replace(/ \(editado\)$/, '')} (editado)`,
                    type: deliverable.type,
                    content: finalContent,
                    agent: deliverable.agent,
                    botType: deliverable.botType,
                    instanceId: deliverable.instanceId,
                    version: newVersion,
                    parentId: deliverable.id,
                },
            });
            // Update kanban task if exists
            const kanbanTask = await prisma.kanbanTask.findFirst({
                where: {
                    conversationId: context.conversationId,
                    instanceId: deliverable.instanceId,
                },
            });
            if (kanbanTask) {
                await prisma.kanbanTask.update({
                    where: { id: kanbanTask.id },
                    data: { deliverableId: newDeliverableId },
                });
            }
            // Broadcast updated deliverable
            broadcast(context.conversationId, {
                type: 'deliverable',
                deliverable: {
                    id: newDeliverable.id,
                    title: newDeliverable.title,
                    type: newDeliverable.type,
                    content: newDeliverable.content,
                    agent: newDeliverable.agent,
                    botType: newDeliverable.botType,
                    version: newVersion,
                    versionCount: newVersion,
                },
            });
            return `Edicion aplicada: ${description}. Version ${newVersion} creada.`;
        },
    },
];
//# sourceMappingURL=code-edit.js.map