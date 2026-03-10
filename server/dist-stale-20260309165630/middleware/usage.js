import { checkCredits } from '../services/credit-tracker.js';
export async function usageMiddleware(req, res, next) {
    if (!req.auth) {
        next();
        return;
    }
    const result = await checkCredits(req.auth.userId);
    if (!result.allowed) {
        res.status(429).json({
            error: 'Créditos agotados',
            balance: result.balance,
            plan: result.planId,
        });
        return;
    }
    next();
}
//# sourceMappingURL=usage.js.map