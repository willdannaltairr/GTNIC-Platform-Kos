import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { favoritesController } from './favorites.controller'

const router = Router()

// Seluruh endpoint favorit menuntut sesi. Daftar favorit adalah data pribadi,
// dan tamu tidak punya tempat menyimpannya.
router.use(authenticate)

router.get('/', asyncHandler(favoritesController.list))
router.post('/', asyncHandler(favoritesController.add))
router.delete('/:propertyId', asyncHandler(favoritesController.remove))

export default router
