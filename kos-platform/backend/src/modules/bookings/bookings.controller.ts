import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { bookingsService } from './bookings.service'
import {
  bookingIdParam,
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingStatusSchema,
} from './bookings.validator'

export const bookingsController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const params = listBookingsQuerySchema.parse(req.query)
    const result = await bookingsService.list(user, params)

    res.json({
      success: true,
      message: 'Daftar booking',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await bookingsService.detail(user, bookingIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Detail booking',
      data,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = createBookingSchema.parse(req.body)
    const data = await bookingsService.create(user, input)

    res.status(201).json({
      success: true,
      message: 'Booking berhasil diajukan',
      data,
    })
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = updateBookingStatusSchema.parse(req.body)
    const data = await bookingsService.updateStatus(user, bookingIdParam(req.params.id), input)

    res.json({
      success: true,
      message: 'Status booking diperbarui',
      data,
    })
  },
}
