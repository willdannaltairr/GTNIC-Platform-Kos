import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate, authorize } from '../../middleware/auth'
import { adminController } from './admin.controller'

const router = Router()

/**
 * Seluruh endpoint panel admin.
 *
 * Dua batas dipasang di setiap rute, bukan diwariskan dari router induk:
 * `authenticate` memastikan pemanggilnya punya sesi yang sah, dan
 * `authorize('ADMIN')` memastikan perannya admin. Perannya dibaca dari token
 * yang sudah diverifikasi, jadi tidak ada satu pun endpoint di sini yang bisa
 * dibuka dengan mengirim peran dari klien.
 *
 * Batas kedua dipasang per rute meski seluruh berkas ini memang untuk admin,
 * supaya rute yang ditambahkan nanti tidak ikut terbuka hanya karena berada di
 * berkas yang sama.
 */
router.use(authenticate, authorize('ADMIN'))

router.get('/ringkasan', asyncHandler(adminController.ringkasan))
router.get('/properti', asyncHandler(adminController.listProperties))
router.post('/properti/:id/verifikasi', asyncHandler(adminController.verifyProperty))
router.get('/pengguna', asyncHandler(adminController.listUsers))
router.patch('/pengguna/:id/status', asyncHandler(adminController.setUserStatus))
router.get('/aktivitas', asyncHandler(adminController.listActivity))

export default router
