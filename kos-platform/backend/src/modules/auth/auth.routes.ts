import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authLimiter } from '../../middleware/rateLimit'
import { authenticate } from '../../middleware/auth'
import { authController } from './auth.controller'

const router = Router()

router.post('/register', authLimiter, asyncHandler(authController.register))
router.post('/login', authLimiter, asyncHandler(authController.login))
/**
 * Alur atur ulang sandi dibatasi `authLimiter` dengan alasan yang berbeda dari
 * login: di sini yang dicegah bukan penebakan sandi, melainkan penebakan token
 * dan pengiriman email bertubi-tubi ke alamat orang lain.
 */
router.post('/forgot-password', authLimiter, asyncHandler(authController.forgotPassword))
router.post('/reset-password', authLimiter, asyncHandler(authController.resetPassword))
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
