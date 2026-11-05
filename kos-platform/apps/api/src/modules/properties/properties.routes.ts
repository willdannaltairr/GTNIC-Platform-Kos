import { Router } from 'express'
import { z } from 'zod'
import {
  createPropertySchema,
  createRoomSchema,
  ownerPropertyListQuerySchema,
  propertyRoutesQuerySchema,
  propertySearchSchema,
  updateAvailabilitySchema,
  updatePropertySchema,
  updateRoomSchema,
  uuidSchema,
} from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { optionalAuth, requireAuth, requireRole } from '../../middlewares/auth'
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate'
import { writeLimiter } from '../../middlewares/security'
import {
  uploadPropertyImages,
  uploadRoomImages,
  verifyUploadSignatures,
} from '../../middlewares/upload'
import * as controller from './properties.controller'
import * as discoveryController from '../discovery/discovery.controller'

export const propertiesRoutes = Router()

const propertyParams = z.object({ id: uuidSchema })
const publicPropertyParams = z.object({ slug: z.string().trim().min(1).max(220) })
const propertyImageParams = z.object({ id: uuidSchema, imageId: uuidSchema })
const roomParams = z.object({ propertyId: uuidSchema, roomId: uuidSchema })
const roomImageParams = z.object({
  propertyId: uuidSchema,
  roomId: uuidSchema,
  imageId: uuidSchema,
})

propertiesRoutes.get(
  '/',
  optionalAuth,
  validateQuery(propertySearchSchema),
  asyncHandler(discoveryController.searchProperties),
)
propertiesRoutes.get(
  '/mine',
  requireAuth,
  requireRole('OWNER'),
  validateQuery(ownerPropertyListQuerySchema),
  asyncHandler(controller.listMyProperties),
)
propertiesRoutes.get(
  '/mine/:id',
  requireAuth,
  requireRole('OWNER'),
  validateParams(propertyParams),
  asyncHandler(controller.getMyProperty),
)

propertiesRoutes.post(
  '/',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateBody(createPropertySchema),
  asyncHandler(controller.createProperty),
)

propertiesRoutes.patch(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  validateBody(updatePropertySchema),
  asyncHandler(controller.updateProperty),
)
propertiesRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  asyncHandler(controller.deleteProperty),
)
propertiesRoutes.post(
  '/:id/publish',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  asyncHandler(controller.publishProperty),
)
propertiesRoutes.post(
  '/:id/unpublish',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  asyncHandler(controller.unpublishProperty),
)
propertiesRoutes.post(
  '/:id/submit-verification',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  asyncHandler(controller.submitVerification),
)

propertiesRoutes.post(
  '/:id/images',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  uploadPropertyImages,
  verifyUploadSignatures,
  asyncHandler(controller.addPropertyImages),
)
propertiesRoutes.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyImageParams),
  asyncHandler(controller.deletePropertyImage),
)

propertiesRoutes.post(
  '/:id/rooms',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(propertyParams),
  validateBody(createRoomSchema),
  asyncHandler(controller.createRoom),
)
propertiesRoutes.patch(
  '/:propertyId/rooms/:roomId',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(roomParams),
  validateBody(updateRoomSchema),
  asyncHandler(controller.updateRoom),
)
propertiesRoutes.patch(
  '/:propertyId/rooms/:roomId/availability',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(roomParams),
  validateBody(updateAvailabilitySchema),
  asyncHandler(controller.updateRoomAvailability),
)
propertiesRoutes.delete(
  '/:propertyId/rooms/:roomId',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(roomParams),
  asyncHandler(controller.deleteRoom),
)
propertiesRoutes.post(
  '/:propertyId/rooms/:roomId/images',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(roomParams),
  uploadRoomImages,
  verifyUploadSignatures,
  asyncHandler(controller.addRoomImages),
)
propertiesRoutes.delete(
  '/:propertyId/rooms/:roomId/images/:imageId',
  requireAuth,
  requireRole('OWNER'),
  writeLimiter,
  validateParams(roomImageParams),
  asyncHandler(controller.deleteRoomImage),
)

propertiesRoutes.get(
  '/:slug/routes',
  validateParams(publicPropertyParams),
  validateQuery(propertyRoutesQuerySchema),
  asyncHandler(discoveryController.propertyTravelEstimate),
)

propertiesRoutes.get(
  '/:slug',
  optionalAuth,
  validateParams(publicPropertyParams),
  asyncHandler(controller.getPublicProperty),
)
