import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate, authorize } from '../../middleware/auth'
import { dashboardController } from './dashboard.controller'

const router = Router()

// Kedua endpoint hanya membaca dan selalu menyaring dengan id pengguna dari
// token, jadi tidak ada pemeriksaan kepemilikan tambahan yang diperlukan.
router.get('/tenant', authenticate, asyncHandler(dashboardController.tenant))
router.get('/owner', authenticate, authorize('OWNER', 'ADMIN'), asyncHandler(dashboardController.owner))

export default router
