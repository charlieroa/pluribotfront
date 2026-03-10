const pendingPlans = new Map();
const executingPlans = new Map();
// Clean up plans older than 30 minutes
const PLAN_TTL = 30 * 60 * 1000;
export function setPendingPlan(messageId, plan) {
    pendingPlans.set(messageId, { ...plan, createdAt: Date.now() });
    cleanupOldPlans();
}
export function getPendingPlan(messageId) {
    return pendingPlans.get(messageId);
}
export function removePendingPlan(messageId) {
    pendingPlans.delete(messageId);
}
// Executing plan management (parallel groups)
export function setExecutingPlan(conversationId, plan) {
    executingPlans.set(conversationId, plan);
}
export function getExecutingPlan(conversationId) {
    return executingPlans.get(conversationId);
}
export function removeExecutingPlan(conversationId) {
    executingPlans.delete(conversationId);
}
function cleanupOldPlans() {
    const now = Date.now();
    for (const [id, plan] of pendingPlans) {
        if (now - plan.createdAt > PLAN_TTL) {
            pendingPlans.delete(id);
        }
    }
}
//# sourceMappingURL=plan-cache.js.map