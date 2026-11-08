import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { notificationsController } from './notifications.controller'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(notificationsController.list))
// Dua aksi massal diletakkan sebelum rute berparameter supaya "read-all" tidak
// pernah terbaca sebagai sebuah id.
router.post('/read-all', asyncHandler(notificationsController.markAllRead))
router.patch('/:id/read', asyncHandler(notificationsController.markRead))
router.delete('/:id', asyncHandler(notificationsController.remove))

export default router
