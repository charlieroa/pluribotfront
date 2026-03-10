/**
 * Get the next version number and parent ID for a deliverable chain.
 * Chains are identified by conversationId + instanceId.
 */
export declare function getNextVersionInfo(conversationId: string, instanceId: string | undefined | null): Promise<{
    version: number;
    parentId: string | null;
}>;
/**
 * Count total versions for a deliverable chain (by conversationId + instanceId).
 */
export declare function getVersionCount(conversationId: string, instanceId: string | undefined | null): Promise<number>;
//# sourceMappingURL=deliverable-versioning.d.ts.map