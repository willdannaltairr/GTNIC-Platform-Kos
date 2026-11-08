import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { visitsController } from './visits.controller'

const router = Router()

// Kunjungan selalu milik seseorang, jadi tidak ada endpoint tamu di sini.
// Pemilik properti juga memakai rute yang sama untuk melihat jadwal kunjungan
// ke propertinya, dan penyaring perannya ada di service.
router.use(authenticate)

router.get('/', asyncHandler(visitsController.list))
router.post('/', asyncHandler(visitsController.create))
router.get('/:id', asyncHandler(visitsController.detail))
router.patch('/:id', asyncHandler(visitsController.update))
router.delete('/:id', asyncHandler(visitsController.remove))

router.post('/:id/checklist', asyncHandler(visitsController.addChecklist))
router.patch('/:id/checklist/:itemId', asyncHandler(visitsController.toggleChecklist))
router.post('/:id/notes', asyncHandler(visitsController.addNote))

export default router
