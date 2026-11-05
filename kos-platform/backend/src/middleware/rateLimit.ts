import rateLimit from 'express-rate-limit'

/** Batas umum seluruh endpoint API: 200 request per 15 menit per IP. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti' },
})

/** Batas khusus endpoint autentikasi: menekan percobaan login berulang. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi dalam 15 menit' },
})
