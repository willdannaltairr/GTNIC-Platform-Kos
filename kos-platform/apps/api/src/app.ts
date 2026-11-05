import { randomUUID } from 'node:crypto'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { env, isProduction } from './config/env'
import { logger } from './config/logger'
import { prisma } from './config/prisma'
import { globalLimiter, originGuard } from './middlewares/security'
import { errorHandler, notFoundHandler } from './middlewares/error'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { propertiesRoutes } from './modules/properties/properties.routes'
import { facilitiesRoutes } from './modules/properties/facilities.routes'
import { discoveryRoutes } from './modules/discovery/discovery.routes'
import { destinationsRoutes } from './modules/discovery/destinations.routes'
import { favoritesRoutes } from './modules/discovery/favorites.routes'
import { publicRoot } from './utils/storage'
import { sendSuccess } from './utils/http'

export function createApp() {
  const app = express()

  if (isProduction) app.set('trust proxy', 1)

  app.disable('x-powered-by')
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  )
  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((value) => value.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  app.use((req, res, next) => {
    req.requestId = randomUUID()
    res.setHeader('X-Request-Id', req.requestId)
    next()
  })
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId ?? randomUUID(),
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))
  app.use(cookieParser())
  app.use(originGuard)
  app.use(globalLimiter)

  app.use('/uploads', express.static(publicRoot, { maxAge: '7d', immutable: false }))

  app.get('/api/v1/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return sendSuccess(
        res,
        { status: 'ok', database: 'connected', uptimeSeconds: Math.round(process.uptime()) },
        'Service healthy',
      )
    } catch {
      return res.status(503).json({
        success: false,
        message: 'Database health check failed',
        code: 'DATABASE_UNAVAILABLE',
      })
    }
  })

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/users', usersRoutes)
  app.use('/api/v1/properties', propertiesRoutes)
  app.use('/api/v1/facilities', facilitiesRoutes)
  app.use('/api/v1/discovery', discoveryRoutes)
  app.use('/api/v1/destinations', destinationsRoutes)
  app.use('/api/v1/favorites', favoritesRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
