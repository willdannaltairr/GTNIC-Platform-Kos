import type { Request, Response } from 'express'
import * as authService from './auth.service'
import { sendSuccess } from '../../utils/http'
import { clearSessionCookieOptions, sessionCookieName, sessionCookieOptions } from '../../utils/cookies'

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] }
}

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body, meta(req), req)
  res.cookie(sessionCookieName, result.session.token, sessionCookieOptions(result.session.expiresAt))
  return sendSuccess(res, { user: result.user }, 'Account created successfully', 201)
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body, meta(req), req)
  res.cookie(sessionCookieName, result.session.token, sessionCookieOptions(result.session.expiresAt))
  return sendSuccess(res, { user: result.user }, 'Signed in successfully')
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[sessionCookieName]
  await authService.logout(typeof token === 'string' ? token : undefined)
  res.clearCookie(sessionCookieName, clearSessionCookieOptions())
  return sendSuccess(res, null, 'Signed out successfully')
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id)
  return sendSuccess(res, user, 'Current user retrieved')
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body)
  return sendSuccess(res, result, result.message)
}

export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body, req)
  res.clearCookie(sessionCookieName, clearSessionCookieOptions())
  return sendSuccess(res, result, result.message)
}

export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(req.body.token, req)
  return sendSuccess(res, result, result.message)
}

export async function resendVerification(req: Request, res: Response) {
  const result = await authService.resendVerification(req.user!.id)
  return sendSuccess(res, result, result.message)
}

export async function changePassword(req: Request, res: Response) {
  const result = await authService.changePassword(req.user!.id, req.body, req.sessionId, req)
  return sendSuccess(res, result, result.message)
}
