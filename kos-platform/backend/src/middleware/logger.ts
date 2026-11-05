import { NextFunction, Request, Response } from 'express'

/**
 * Log ringkas setiap request: method, path, status, durasi.
 * Body dan header sengaja tidak dicatat agar token maupun password
 * tidak pernah masuk ke log server.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now()

  res.on('finish', () => {
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`)
  })

  next()
}
