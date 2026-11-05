import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { PaginationMeta } from '@nestari/shared'

export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Request completed successfully',
  statusCode = 200,
  meta?: PaginationMeta,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  })
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}
