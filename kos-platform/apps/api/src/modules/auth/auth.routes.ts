import { Router } from 'express'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { validateBody } from '../../middlewares/validate'
import { authLimiter, loginLimiter, passwordResetLimiter } from '../../middlewares/security'
import { requireAuth } from '../../middlewares/auth'
import * as controller from './auth.controller'

export const authRoutes = Router()

authRoutes.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(controller.register))
authRoutes.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(controller.login))
authRoutes.post('/logout', asyncHandler(controller.logout))
authRoutes.get('/me', requireAuth, asyncHandler(controller.me))
authRoutes.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), asyncHandler(controller.forgotPassword))
authRoutes.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), asyncHandler(controller.resetPassword))
authRoutes.post('/verify-email', authLimiter, validateBody(verifyEmailSchema), asyncHandler(controller.verifyEmail))
authRoutes.post('/resend-verification', requireAuth, authLimiter, asyncHandler(controller.resendVerification))
authRoutes.patch('/password', requireAuth, authLimiter, validateBody(changePasswordSchema), asyncHandler(controller.changePassword))
