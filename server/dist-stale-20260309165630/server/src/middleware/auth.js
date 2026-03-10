import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
export function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token requerido' });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.auth = payload;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token inválido' });
    }
}
// Role-based access control - must be used after authMiddleware
export function requireRole(...roles) {
    return async (req, res, next) => {
        // First run authMiddleware logic
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token requerido' });
            return;
        }
        const token = header.slice(7);
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            req.auth = payload;
        }
        catch {
            res.status(401).json({ error: 'Token inválido' });
            return;
        }
        // Check role in DB
        const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({ error: 'Sin permisos' });
            return;
        }
        req.userRole = user.role;
        next();
    };
}
// Optional auth - doesn't block if no token, but attaches user if present
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        const token = header.slice(7);
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            req.auth = payload;
        }
        catch {
            // Ignore invalid tokens in optional mode
        }
    }
    next();
}
//# sourceMappingURL=auth.js.map