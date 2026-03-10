import type { Request, Response, NextFunction } from 'express';
export interface ApiKeyPayload {
    userId: string;
    email: string;
    apiKeyId: string;
    planId: string;
}
declare global {
    namespace Express {
        interface Request {
            apiKey?: ApiKeyPayload;
        }
    }
}
/**
 * Middleware that authenticates via API key in X-API-Key header or Bearer token with pk_ prefix.
 * Also enforces rate limiting and plan checks.
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Generate a new API key for a user. Returns the raw key (only shown once).
 */
export declare function generateApiKey(userId: string, name?: string): Promise<{
    key: string;
    id: string;
    keyPrefix: string;
}>;
//# sourceMappingURL=api-key.d.ts.map