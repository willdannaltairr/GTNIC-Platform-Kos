import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { isProduction } from '../config/env'
import { logger } from '../config/logger'
import { AppError, type ErrorDetail } from '../utils/errors'

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} was not found`,
    code: 'NOT_FOUND',
  })
}

function prismaError(error: Prisma.PrismaClientKnownRequestError): {
  status: number
  message: string
  code: string
  details?: ErrorDetail[]
} | null {
  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unique field'
    return { status: 409, message: `A record with this ${target} already exists`, code: 'DUPLICATE_RECORD' }
  }
  if (error.code === 'P2003') {
    return { status: 409, message: 'This action conflicts with related data', code: 'RELATION_CONFLICT' }
  }
  if (error.code === 'P2025') {
    return { status: 404, message: 'The requested record was not found', code: 'NOT_FOUND' }
  }
  return null
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.details ? { errors: error.details } : {}),
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'The uploaded file is too large'
        : error.code === 'LIMIT_FILE_COUNT'
          ? 'Too many files were uploaded'
          : 'The upload could not be processed'
    res.status(400).json({ success: false, message, code: 'UPLOAD_ERROR' })
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaError(error)
    if (mapped) {
      res.status(mapped.status).json({ success: false, message: mapped.message, code: mapped.code })
      return
    }
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ success: false, message: 'The request body contains invalid JSON', code: 'INVALID_JSON' })
    return
  }

  const requestId = req.requestId
  logger.error({ error, requestId, method: req.method, url: req.originalUrl }, 'unhandled request error')

  res.status(500).json({
    success: false,
    message: isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    ...(requestId ? { requestId } : {}),
  })
}
