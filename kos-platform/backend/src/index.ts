import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import { env } from './config/env'
import { errorHandler } from './middleware/error'
import { notFound } from './middleware/notFound'
import { requestLogger } from './middleware/logger'
import { apiLimiter } from './middleware/rateLimit'
import { apiRouter } from './routes'

const app = express()

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE GLOBAL
// ════════════════════════════════════════════════════════════════════════════

app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(requestLogger)

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API kos-platform siap', time: new Date().toISOString() })
})

// Rate limit dipasang sebelum router supaya berlaku untuk semua endpoint
// di bawah /api/v1 (Express mengeksekusi middleware sesuai urutan daftar).
app.use(env.API_PREFIX, apiLimiter, apiRouter)

// ════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════════════════

app.use(notFound)
app.use(errorHandler)

const port = env.PORT

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}${env.API_PREFIX}`)
})

export default app
