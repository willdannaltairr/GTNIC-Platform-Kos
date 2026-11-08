import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate, authorize } from '../../middleware/auth'
import { propertiesController } from './properties.controller'

const router = Router()

/**
 * Endpoint pengelolaan milik pemilik.
 *
 * Didaftarkan SEBELUM `/:slug`, karena Express mencocokkan rute sesuai urutan
 * pendaftaran: kalau `/:slug` lebih dulu, permintaan ke `/mine` akan dibaca
 * sebagai permintaan detail properti dengan slug "mine" dan jawabannya 404
 * yang membingungkan, bukan daftar properti pemilik.
 *
 * Kepemilikan yang sebenarnya diperiksa di service, karena hanya di sana id
 * properti sudah diterjemahkan menjadi id pemiliknya.
 */
router.get('/mine', authenticate, authorize('OWNER', 'ADMIN'), asyncHandler(propertiesController.listMine))
router.get(
  '/mine/:id',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  asyncHandler(propertiesController.detailMine),
)
router.post('/', authenticate, authorize('OWNER', 'ADMIN'), asyncHandler(propertiesController.create))
router.patch(
  '/mine/:id',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  asyncHandler(propertiesController.update),
)
router.post(
  '/mine/:id/submit',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  asyncHandler(propertiesController.submitForReview),
)
router.post(
  '/mine/:id/publication',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  asyncHandler(propertiesController.setPublication),
)

// Endpoint publik: hanya properti yang sudah terverifikasi dan dipublikasikan
// yang pernah keluar dari service ini. Didaftarkan paling akhir supaya tidak
// menelan rute pengelolaan di atas.
router.get('/', asyncHandler(propertiesController.list))
router.get('/:slug', asyncHandler(propertiesController.detail))

export default router
