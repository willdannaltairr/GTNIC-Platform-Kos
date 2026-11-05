import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

interface OperationalError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: OperationalError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500

  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  // Jangan kirim stack trace ke klien
  res.status(statusCode).json({
    success: false,
    message: err.message ?? 'Terjadi kesalahan pada server',
    errors: [],
  })
}
