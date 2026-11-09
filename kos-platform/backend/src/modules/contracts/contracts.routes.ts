import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { contractsController } from './contracts.controller'

const router = Router()

// Kontrak selalu melibatkan akun, dan siapa yang boleh apa diperiksa di
// service: hanya di sana id pemilik propertinya tersedia.
router.use(authenticate)

router.get('/', asyncHandler(contractsController.list))
/**
 * Pembuatan kontrak hanya untuk pemilik propertinya.
 *
 * Batasnya tidak ditulis sebagai `authorize('OWNER')` karena admin juga perlu
 * bisa membuatkannya saat menengahi masalah, dan pemeriksaan yang sebenarnya
 * adalah kepemilikan atas bookingnya, bukan perannya.
 */
router.post('/', asyncHandler(contractsController.create))
router.get('/:id', asyncHandler(contractsController.detail))
router.patch('/:id/status', asyncHandler(contractsController.updateStatus))

export default router
