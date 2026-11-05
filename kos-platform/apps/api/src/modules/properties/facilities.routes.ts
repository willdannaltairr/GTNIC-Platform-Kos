import { Router } from 'express'
import { facilityListQuerySchema } from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { validateQuery } from '../../middlewares/validate'
import * as controller from './properties.controller'

export const facilitiesRoutes = Router()

facilitiesRoutes.get(
  '/',
  validateQuery(facilityListQuerySchema),
  asyncHandler(controller.listFacilities),
)
