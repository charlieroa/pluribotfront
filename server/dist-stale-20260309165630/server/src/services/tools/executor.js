import { seoTools } from './seo.js';
import { codegenTools } from './codegen.js';
import { adsTools } from './ads.js';
import { deployTools } from './deploy.js';
import { imagenTools } from './imagen.js';
import { videoTools } from './video.js';
import { unsplashTools } from './unsplash.js';
import { codeEditTools } from './code-edit.js';
import { metaAdsTools } from './meta-ads.js';
import { removeBgTools } from './remove-bg.js';
import { webFetchTools } from './web-fetch.js';
import { consumeToolCredits } from '../credit-tracker.js';
import { prisma } from '../../db/client.js';
const allTools = [
    ...seoTools,
    ...codegenTools,
    ...adsTools,
    ...deployTools,
    ...imagenTools,
    ...videoTools,
    ...unsplashTools,
    ...codeEditTools,
    ...metaAdsTools,
    ...removeBgTools,
    ...webFetchTools,
];
const META_TOOL_PREFIX = 'meta_';
export async function getToolDefinitions(toolNames, userId) {
    // Check if user has Meta connected — if not, filter out meta tools
    let hasMetaConnected = false;
    if (userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { metaAccessToken: true },
        });
        hasMetaConnected = !!user?.metaAccessToken;
    }
    return allTools
        .filter(t => toolNames.includes(t.name))
        .filter(t => hasMetaConnected || !t.name.startsWith(META_TOOL_PREFIX))
        .map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
    }));
}
export async function executeToolCall(toolCall, conversationId, agentConfig, userId, instanceId) {
    const tool = allTools.find(t => t.name === toolCall.name);
    if (!tool) {
        return `Error: herramienta "${toolCall.name}" no encontrada`;
    }
    const context = {
        conversationId,
        agentId: agentConfig.id,
        agentName: agentConfig.name,
        userId,
        instanceId,
    };
    try {
        const result = await tool.execute(toolCall.input, context);
        // Charge tool credits for image/video generation after successful execution
        const chargeableTools = ['generate_image', 'generate_video'];
        if (chargeableTools.includes(toolCall.name) && !result.startsWith('Error')) {
            consumeToolCredits(userId, context.agentId, toolCall.name).catch(err => console.error(`[Tool] Error charging credits for ${toolCall.name}:`, err));
        }
        return result;
    }
    catch (err) {
        console.error(`[Tool] Error executing ${toolCall.name}:`, err);
        return `Error ejecutando herramienta: ${err instanceof Error ? err.message : String(err)}`;
    }
}
//# sourceMappingURL=executor.js.map