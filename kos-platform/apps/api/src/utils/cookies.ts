import type { CookieOptions } from 'express'
import { env, isProduction } from '../config/env'

export const sessionCookieName = env.SESSION_COOKIE_NAME

export function sessionCookieOptions(expiresAt: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  }
}

export function clearSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  }
}
