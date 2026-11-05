import { Router } from 'express'
import { favoriteParamSchema } from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { requireAuth } from '../../middlewares/auth'
import { validateParams } from '../../middlewares/validate'
import { writeLimiter } from '../../middlewares/security'
import * as controller from './discovery.controller'

export const favoritesRoutes = Router()

favoritesRoutes.use(requireAuth)

favoritesRoutes.get('/', asyncHandler(controller.listFavorites))
favoritesRoutes.post(
  '/:propertyId',
  writeLimiter,
  validateParams(favoriteParamSchema),
  asyncHandler(controller.addFavorite),
)
favoritesRoutes.delete(
  '/:propertyId',
  writeLimiter,
  validateParams(favoriteParamSchema),
  asyncHandler(controller.removeFavorite),
)
