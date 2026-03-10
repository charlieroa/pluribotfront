import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { getPlan } from '../config/plans.js';
// In-memory rate limit tracking: keyId -> { count, windowStart }
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}
/**
 * Middleware that authenticates via API key in X-API-Key header or Bearer token with pk_ prefix.
 * Also enforces rate limiting and plan checks.
 */
export function apiKeyAuth(req, res, next) {
    const key = extractApiKey(req);
    if (!key) {
        res.status(401).json({ error: 'API key required. Pass it via X-API-Key header or Authorization: Bearer pk_...' });
        return;
    }
    const hash = hashKey(key);
    prisma.userApiKey.findUnique({
        where: { keyHash: hash },
        include: { user: { select: { id: true, email: true, planId: true, creditBalance: true } } },
    }).then(async (apiKeyRecord) => {
        if (!apiKeyRecord || !apiKeyRecord.isActive) {
            res.status(401).json({ error: 'Invalid or deactivated API key' });
            return;
        }
        const { user } = apiKeyRecord;
        const plan = getPlan(user.planId);
        // Plan check: only agency and enterprise have API access
        if (!['agency', 'enterprise'].includes(user.planId)) {
            res.status(403).json({
                error: 'API access requires Agency or Enterprise plan',
                currentPlan: user.planId,
                upgrade_url: 'https://plury.co/#pricing',
            });
            return;
        }
        // Credit check
        if (user.creditBalance <= 0) {
            res.status(402).json({
                error: 'Insufficient credits',
                balance: user.creditBalance,
                planCredits: plan.monthlyCredits,
            });
            return;
        }
        // Rate limiting
        const now = Date.now();
        const rateKey = apiKeyRecord.id;
        const limit = apiKeyRecord.rateLimit;
        let entry = rateLimitMap.get(rateKey);
        if (!entry || now - entry.windowStart > WINDOW_MS) {
            entry = { count: 0, windowStart: now };
            rateLimitMap.set(rateKey, entry);
        }
        entry.count++;
        if (entry.count > limit) {
            const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('Retry-After', retryAfter);
            res.status(429).json({
                error: 'Rate limit exceeded',
                limit,
                retryAfterSeconds: retryAfter,
            });
            return;
        }
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
        // Update last used (non-blocking)
        prisma.userApiKey.update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: new Date() },
        }).catch(() => { });
        // Attach to request
        req.apiKey = {
            userId: user.id,
            email: user.email,
            apiKeyId: apiKeyRecord.id,
            planId: user.planId,
        };
        next();
    }).catch((err) => {
        console.error('[ApiKeyAuth] Error:', err);
        res.status(500).json({ error: 'Internal authentication error' });
    });
}
function extractApiKey(req) {
    // Check X-API-Key header first
    const xApiKey = req.headers['x-api-key'];
    if (typeof xApiKey === 'string' && xApiKey.startsWith('pk_'))
        return xApiKey;
    // Check Authorization: Bearer pk_...
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer pk_'))
        return auth.slice(7);
    return null;
}
/**
 * Generate a new API key for a user. Returns the raw key (only shown once).
 */
export async function generateApiKey(userId, name = 'Default') {
    const raw = 'pk_live_' + crypto.randomBytes(24).toString('hex');
    const hash = hashKey(raw);
    const prefix = raw.slice(0, 16) + '...';
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { planId: true } });
    const rateLimit = user?.planId === 'enterprise' ? 500 : 100;
    const record = await prisma.userApiKey.create({
        data: {
            userId,
            name,
            keyHash: hash,
            keyPrefix: prefix,
            rateLimit,
        },
    });
    return { key: raw, id: record.id, keyPrefix: prefix };
}
//# sourceMappingURL=api-key.js.map