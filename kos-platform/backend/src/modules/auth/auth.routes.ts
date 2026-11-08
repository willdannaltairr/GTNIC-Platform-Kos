import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authLimiter } from '../../middleware/rateLimit'
import { authenticate } from '../../middleware/auth'
import { authController } from './auth.controller'

const router = Router()

router.post('/register', authLimiter, asyncHandler(authController.register))
router.post('/login', authLimiter, asyncHandler(authController.login))
/**
 * Perpanjangan sesi tidak dibatasi `authLimiter`.
 *
 * Endpoint ini dipanggil otomatis setiap halaman dimuat saat access token
 * sudah habis, jauh lebih sering daripada login, tetapi tidak pernah
 * diketik manusia, jadi tidak perlu dibatasi seketat percobaan login.
 */
router.post('/refresh', asyncHandler(authController.refresh))
router.post('/logout', asyncHandler(authController.logout))
router.get('/me', authenticate, asyncHandler(authController.me))

export default router
