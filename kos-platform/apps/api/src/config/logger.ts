import pino from 'pino'
import { env, isTest } from './env'

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
      'tokenHash',
    ],
    censor: '[REDACTED]',
  },
})
