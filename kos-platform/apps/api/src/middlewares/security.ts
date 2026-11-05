import type { NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { env, isTest } from '../config/env'
import { ForbiddenError } from '../utils/errors'

const jsonRateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait and try again.',
    code: 'TOO_MANY_REQUESTS',
  })
}

const makeLimiter = (windowMinutes: number, limit: number) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: jsonRateLimitHandler,
    skip: () => isTest,
  })

export const globalLimiter = makeLimiter(15, 600)
export const authLimiter = makeLimiter(15, 30)
export const loginLimiter = makeLimiter(15, 12)
export const passwordResetLimiter = makeLimiter(60, 6)
export const writeLimiter = makeLimiter(15, 240)

export function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }

  const origin = req.headers.origin
  if (!origin) {
    next()
    return
  }

  const allowed = env.WEB_ORIGIN.split(',').map((value) => value.trim().replace(/\/$/, ''))
  const normalised = origin.replace(/\/$/, '')
  if (!allowed.includes(normalised)) {
    next(new ForbiddenError('Request origin is not allowed'))
    return
  }
  next()
}
