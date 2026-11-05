import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate, authorize } from '../../middleware/auth'
import { usersController } from './users.controller'

const router = Router()

router.patch('/me', authenticate, asyncHandler(usersController.updateMe))
router.get('/', authenticate, authorize('ADMIN'), asyncHandler(usersController.list))

export default router
