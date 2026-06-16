import { Request, Response, NextFunction } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../auth'

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.locals.session = session
  next()
}

export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  const session = res.locals.session
  if (session?.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

export function requireStaff(_req: Request, res: Response, next: NextFunction): void {
  const role = res.locals.session?.user?.role
  if (role !== 'ADMIN' && role !== 'AGENT') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
