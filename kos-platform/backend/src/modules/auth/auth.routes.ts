import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authLimiter } from '../../middleware/rateLimit'
import { authenticate } from '../../middleware/auth'
import { authController } from './auth.controller'

const router = Router()

router.post('/register', authLimiter, asyncHandler(authController.register))
router.post('/login', authLimiter, asyncHandler(authController.login))
router.post('/logout', asyncHandler(authController.logout))
router.get('/me', authenticate, asyncHandler(authController.me))

export default router
