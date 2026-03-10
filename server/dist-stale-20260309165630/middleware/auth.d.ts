import type { Request, Response, NextFunction } from 'express';
export interface AuthPayload {
    userId: string;
    email: string;
}
declare global {
    namespace Express {
        interface Request {
            auth?: AuthPayload;
            userRole?: string;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map