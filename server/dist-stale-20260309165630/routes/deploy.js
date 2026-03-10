import { Router } from 'express';
import { prisma } from '../db/client.js';
import { optionalAuth } from '../middleware/auth.js';
import { deployProject, getDeployStatus, removeDeploy } from '../services/deploy.js';
const router = Router();
/**
 * POST /api/deploy — Deploy a deliverable as a static site
 * Body: { deliverableId: string }
 * Response: { url: string, deployId: string }
 */
router.post('/', optionalAuth, async (req, res) => {
    const { deliverableId } = req.body;
    if (!deliverableId) {
        res.status(400).json({ error: 'deliverableId requerido' });
        return;
    }
    try {
        const deliverable = await prisma.deliverable.findUnique({
            where: { id: deliverableId },
        });
        if (!deliverable) {
            res.status(404).json({ error: 'Deliverable no encontrado' });
            return;
        }
        if (!deliverable.content) {
            res.status(400).json({ error: 'El deliverable no tiene contenido para desplegar' });
            return;
        }
        // Use the deliverable ID as the deploy ID for simplicity
        const deployId = deliverableId;
        const url = await deployProject(deployId, deliverable.content);
        console.log(`[Deploy] Project deployed: ${url}`);
        res.json({ url, deployId });
    }
    catch (err) {
        console.error('[Deploy] Error:', err);
        res.status(500).json({ error: 'Error al desplegar el proyecto' });
    }
});
/**
 * GET /api/deploy/:deployId — Check deploy status
 */
router.get('/:deployId', async (req, res) => {
    const deployId = req.params.deployId;
    const status = getDeployStatus(deployId);
    if (status.exists) {
        res.json({ status: 'ready', url: status.url });
    }
    else {
        res.json({ status: 'not_found' });
    }
});
/**
 * DELETE /api/deploy/:deployId — Remove a deploy
 */
router.delete('/:deployId', optionalAuth, async (req, res) => {
    const deployId = req.params.deployId;
    try {
        removeDeploy(deployId);
        res.json({ ok: true });
    }
    catch (err) {
        console.error('[Deploy] Remove error:', err);
        res.status(500).json({ error: 'Error al eliminar deploy' });
    }
});
export default router;
//# sourceMappingURL=deploy.js.map