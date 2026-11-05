import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { propertiesController } from './properties.controller'

const router = Router()

// Endpoint publik: hanya properti yang sudah terverifikasi dan dipublikasikan
// yang pernah keluar dari service ini.
router.get('/', asyncHandler(propertiesController.list))
router.get('/:slug', asyncHandler(propertiesController.detail))

export default router
