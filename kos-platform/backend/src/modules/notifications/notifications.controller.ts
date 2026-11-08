import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { notificationsService } from './notifications.service'
import { listNotificationsQuerySchema, notificationIdParam } from './notifications.validator'

export const notificationsController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const params = listNotificationsQuerySchema.parse(req.query)
    const result = await notificationsService.list(userId, params)

    res.json({
      success: true,
      message: 'Daftar notifikasi',
      data: result.items,
      meta: result.meta,
    })
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const result = await notificationsService.markRead(userId, notificationIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Notifikasi ditandai sudah dibaca',
      data: result,
    })
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const result = await notificationsService.markAllRead(userId)

    res.json({
      success: true,
      message: 'Semua notifikasi ditandai sudah dibaca',
      data: result,
    })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const result = await notificationsService.remove(userId, notificationIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Notifikasi dihapus',
      data: result,
    })
  },
}
