import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/client.js'

export interface AuthPayload {
  userId: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
      userRole?: string
    }
  }
}

function getRequestToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    return header.slice(7)
  }

  return typeof req.query.token === 'string' ? req.query.token : null
}

export function resolveAuthFromRequest(req: Request): AuthPayload | null {
  const token = getRequestToken(req)
  if (!token) return null

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const payload = resolveAuthFromRequest(req)
  if (!payload) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  req.auth = payload
  next()
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const payload = resolveAuthFromRequest(req)
    if (!payload) {
      res.status(401).json({ error: 'Token requerido' })
      return
    }

    req.auth = payload

    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } })
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Sin permisos' })
      return
    }

    req.userRole = user.role
    next()
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const payload = resolveAuthFromRequest(req)
  if (payload) {
    req.auth = payload
  }
  next()
}
