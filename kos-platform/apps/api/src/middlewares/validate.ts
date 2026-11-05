import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError, type ZodTypeAny } from 'zod'
import { UnprocessableEntityError } from '../utils/errors'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message,
  }))
}

export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      next(new UnprocessableEntityError('Validation failed', 'VALIDATION_ERROR', formatZodError(result.error)))
      return
    }
    req.body = result.data
    next()
  }

export const validateQuery =
  (schema: ZodTypeAny): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      next(new UnprocessableEntityError('Invalid query parameters', 'VALIDATION_ERROR', formatZodError(result.error)))
      return
    }
    res.locals.query = result.data
    next()
  }

export const validateParams =
  (schema: ZodTypeAny): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      next(new UnprocessableEntityError('Invalid route parameters', 'VALIDATION_ERROR', formatZodError(result.error)))
      return
    }
    res.locals.params = result.data
    next()
  }

export function validatedQuery<T>(res: Response): T {
  return res.locals.query as T
}

export function validatedParams<T>(res: Response): T {
  return res.locals.params as T
}
