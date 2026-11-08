import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { bookingsController } from './bookings.controller'

const router = Router()

// Booking selalu melibatkan akun. Penghuni memakai rute ini untuk mengajukan
// dan membatalkan, pemilik properti untuk memutuskan; siapa yang boleh apa
// diperiksa di service, karena hanya di sana id pemilik properti tersedia.
router.use(authenticate)

router.get('/', asyncHandler(bookingsController.list))
router.post('/', asyncHandler(bookingsController.create))
router.get('/:id', asyncHandler(bookingsController.detail))
router.patch('/:id/status', asyncHandler(bookingsController.updateStatus))

export default router
