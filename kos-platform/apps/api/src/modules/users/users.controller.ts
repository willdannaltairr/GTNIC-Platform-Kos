import type { Request, Response } from 'express'
import type { NotificationListQuery } from '@nestari/shared'
import * as usersService from './users.service'
import { sendSuccess, paginationMeta } from '../../utils/http'
import { BadRequestError } from '../../utils/errors'
import { publicUrlFor } from '../../utils/storage'
import { relativeStoragePath } from '../../middlewares/upload'
import { validatedParams, validatedQuery } from '../../middlewares/validate'

export async function updateMe(req: Request, res: Response) {
  const user = await usersService.updateProfile(req.user!.id, req.body, req)
  return sendSuccess(res, user, 'Profile updated successfully')
}

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    throw new BadRequestError('Choose an image to upload', 'FILE_REQUIRED')
  }
  const avatarUrl = publicUrlFor(relativeStoragePath(req.file))
  const result = await usersService.updateAvatar(req.user!.id, avatarUrl, req)
  return sendSuccess(res, result, 'Avatar updated successfully')
}

export async function updateOwnerProfile(req: Request, res: Response) {
  const profile = await usersService.updateOwnerProfile(req.user!.id, req.body, req)
  return sendSuccess(res, profile, 'Owner profile updated successfully')
}

export async function updateTenantProfile(req: Request, res: Response) {
  const profile = await usersService.updateTenantProfile(req.user!.id, req.body, req)
  return sendSuccess(res, profile, 'Tenant profile updated successfully')
}

export async function getNotificationPreferences(req: Request, res: Response) {
  const preferences = await usersService.getNotificationPreferences(req.user!.id)
  return sendSuccess(res, preferences, 'Notification preferences retrieved')
}

export async function updateNotificationPreferences(req: Request, res: Response) {
  const preferences = await usersService.updateNotificationPreferences(req.user!.id, req.body, req)
  return sendSuccess(res, preferences, 'Notification preferences updated')
}

export async function listNotifications(req: Request, res: Response) {
  const query = validatedQuery<NotificationListQuery>(res)
  const result = await usersService.listNotifications(req.user!.id, query)
  return sendSuccess(
    res,
    { items: result.items, unreadCount: result.unreadCount },
    'Notifications retrieved',
    200,
    paginationMeta(query.page, query.limit, result.total),
  )
}

export async function markNotificationRead(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const notification = await usersService.markNotificationRead(req.user!.id, id)
  return sendSuccess(res, notification, 'Notification marked as read')
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const result = await usersService.markAllNotificationsRead(req.user!.id)
  return sendSuccess(res, result, 'All notifications marked as read')
}
