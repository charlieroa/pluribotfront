import type { Request, Response, NextFunction } from 'express';
/**
 * Subdomain middleware — intercepts requests to {slug}.plury.co
 * and custom domains, serving the published project HTML.
 * Must be registered BEFORE all routes.
 */
export declare function subdomainMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=subdomain.d.ts.map