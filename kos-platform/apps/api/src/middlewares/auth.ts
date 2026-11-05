import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { AccountStatus, UserRole } from '@nestari/shared'
import { prisma } from '../config/prisma'
import { ForbiddenError, UnauthorizedError } from '../utils/errors'
import { hashToken } from '../utils/tokens'
import { sessionCookieName } from '../utils/cookies'

interface LoadedSession {
  sessionId: string
  user: NonNullable<Request['user']>
}

async function loadSession(token: string): Promise<LoadedSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          emailVerifiedAt: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null
  if (session.user.deletedAt) return null
  if (session.user.accountStatus === 'SUSPENDED' || session.user.accountStatus === 'BANNED') return null

  if (Date.now() - session.lastUsedAt.getTime() > 15 * 60_000) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined)
  }

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      avatarUrl: session.user.avatarUrl,
      role: session.user.role as UserRole,
      accountStatus: session.user.accountStatus as AccountStatus,
      emailVerifiedAt: session.user.emailVerifiedAt,
    },
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[sessionCookieName]
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Please sign in to continue')
    }
    const loaded = await loadSession(token)
    if (!loaded) {
      throw new UnauthorizedError('Your session has expired. Please sign in again.')
    }
    req.user = loaded.user
    req.sessionId = loaded.sessionId
    next()
  } catch (error) {
    next(error)
  }
}

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[sessionCookieName]
    if (!token || typeof token !== 'string') {
      next()
      return
    }
    const loaded = await loadSession(token)
    if (loaded) {
      req.user = loaded.user
      req.sessionId = loaded.sessionId
    }
  } catch {
    // Public endpoints stay public even if a stale cookie is present.
  }
  next()
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError('Please sign in to continue'))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Your account does not have access to this resource'))
      return
    }
    next()
  }
}

export function requireAccountStatus(...statuses: AccountStatus[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !statuses.includes(req.user.accountStatus)) {
      next(new ForbiddenError('Your account status does not allow this action'))
      return
    }
    next()
  }
}
