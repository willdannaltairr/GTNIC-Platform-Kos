import { Router } from 'express'
import { destinationSearchSchema } from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { validateQuery } from '../../middlewares/validate'
import * as controller from './discovery.controller'

export const destinationsRoutes = Router()

destinationsRoutes.get(
  '/',
  validateQuery(destinationSearchSchema),
  asyncHandler(controller.listDestinations),
)
