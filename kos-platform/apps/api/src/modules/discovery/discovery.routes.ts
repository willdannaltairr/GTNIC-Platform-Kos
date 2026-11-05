import { Router } from 'express'
import {
  compareQuerySchema,
  costSimulatorSchema,
  kosMatchSchema,
} from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { optionalAuth } from '../../middlewares/auth'
import { validateBody, validateQuery } from '../../middlewares/validate'
import * as controller from './discovery.controller'

export const discoveryRoutes = Router()

discoveryRoutes.post(
  '/match',
  optionalAuth,
  validateBody(kosMatchSchema),
  asyncHandler(controller.matchProperties),
)
discoveryRoutes.post(
  '/cost',
  optionalAuth,
  validateBody(costSimulatorSchema),
  asyncHandler(controller.simulateCost),
)
discoveryRoutes.get(
  '/compare',
  validateQuery(compareQuerySchema),
  asyncHandler(controller.compareProperties),
)
