import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { env } from './config/env'
import { errorHandler } from './middleware/error'
import { notFound } from './middleware/notFound'
import { requestLogger } from './middleware/logger'
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 200, // maksimal 200 request per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti' },
})
app.use(env.API_PREFIX, apiLimiter)

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API kos-platform siap', time: new Date().toISOString() })
})

app.use(env.API_PREFIX, apiRouter)

// ════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════════════════

app.use(notFound)
app.use(errorHandler)

const port = env.PORT

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}${env.API_PREFIX}`)
})

export default app
