import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../lib/httpError'

/**
 * Error handler terpusat.
 *
 * - ZodError -> 400 dengan daftar field yang gagal validasi.
 * - HttpError / 4xx -> pesan asli (aman ditampilkan ke pengguna).
 * - 5xx tak terduga -> pesan generik; detail hanya masuk log server,
 *   stack trace tidak pernah dikirim ke klien.
 */
export const errorHandler = (
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
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

  const statusCode = err.statusCode ?? 500
  const isOperational = err instanceof HttpError || statusCode < 500

  if (!isOperational) {
    console.error('[api:error]', err)
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'Terjadi kesalahan pada server',
    errors: [],
  })
}
