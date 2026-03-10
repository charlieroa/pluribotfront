import { prisma } from '../db/client.js';
/**
 * Get the next version number and parent ID for a deliverable chain.
 * Chains are identified by conversationId + instanceId.
 */
export async function getNextVersionInfo(conversationId, instanceId) {
    if (!instanceId) {
        return { version: 1, parentId: null };
    }
    const latest = await prisma.deliverable.findFirst({
        where: { conversationId, instanceId },
        orderBy: { version: 'desc' },
        select: { id: true, version: true },
    });
    if (!latest) {
        return { version: 1, parentId: null };
    }
    return { version: latest.version + 1, parentId: latest.id };
}
/**
 * Count total versions for a deliverable chain (by conversationId + instanceId).
 */
export async function getVersionCount(conversationId, instanceId) {
    if (!instanceId)
        return 1;
    return prisma.deliverable.count({
        where: { conversationId, instanceId },
    });
}
//# sourceMappingURL=deliverable-versioning.js.map