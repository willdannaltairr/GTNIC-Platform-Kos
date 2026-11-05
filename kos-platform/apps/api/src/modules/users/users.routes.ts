import { Router } from 'express'
import { z } from 'zod'
import {
  notificationListQuerySchema,
  notificationPreferenceSchema,
  updateOwnerProfileSchema,
  updateProfileSchema,
  updateTenantProfileSchema,
  uuidSchema,
} from '@nestari/shared'
import { asyncHandler } from '../../utils/http'
import { requireAuth, requireRole } from '../../middlewares/auth'
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate'
import { writeLimiter } from '../../middlewares/security'
import { uploadAvatar, verifyUploadSignatures } from '../../middlewares/upload'
import * as controller from './users.controller'

export const usersRoutes = Router()

usersRoutes.use(requireAuth)

usersRoutes.patch('/me', writeLimiter, validateBody(updateProfileSchema), asyncHandler(controller.updateMe))
usersRoutes.post(
  '/me/avatar',
  writeLimiter,
  uploadAvatar,
  verifyUploadSignatures,
  asyncHandler(controller.uploadAvatar),
)
usersRoutes.patch(
  '/me/owner-profile',
  writeLimiter,
  requireRole('OWNER'),
  validateBody(updateOwnerProfileSchema),
  asyncHandler(controller.updateOwnerProfile),
)
usersRoutes.patch(
  '/me/tenant-profile',
  writeLimiter,
  requireRole('TENANT'),
  validateBody(updateTenantProfileSchema),
  asyncHandler(controller.updateTenantProfile),
)

usersRoutes.get(
  '/me/notification-preferences',
  asyncHandler(controller.getNotificationPreferences),
)
usersRoutes.patch(
  '/me/notification-preferences',
  writeLimiter,
  validateBody(notificationPreferenceSchema),
  asyncHandler(controller.updateNotificationPreferences),
)

usersRoutes.get(
  '/me/notifications',
  validateQuery(notificationListQuerySchema),
  asyncHandler(controller.listNotifications),
)
usersRoutes.post(
  '/me/notifications/read-all',
  writeLimiter,
  asyncHandler(controller.markAllNotificationsRead),
)
usersRoutes.post(
  '/me/notifications/:id/read',
  writeLimiter,
  validateParams(z.object({ id: uuidSchema })),
  asyncHandler(controller.markNotificationRead),
)
