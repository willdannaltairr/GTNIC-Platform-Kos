import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { invoicesController } from './invoices.controller'

const router = Router()

// Tagihan selalu melibatkan akun. Penghuni melihat yang ditagihkan kepadanya,
// pemilik melihat yang ia tagihkan; siapa yang boleh apa diperiksa di service,
// karena hanya di sana id pemilik dan penghuninya tersedia.
router.use(authenticate)

router.get('/', asyncHandler(invoicesController.list))
router.post('/', asyncHandler(invoicesController.create))
router.get('/:id', asyncHandler(invoicesController.detail))
router.post('/:id/kirim', asyncHandler(invoicesController.kirim))
router.post('/:id/batalkan', asyncHandler(invoicesController.batalkan))

export default router
