import { Request, Response } from 'express'
import { env } from '../../config/env'
import type { AuthRequest } from '../../middleware/auth'
import { paymentsService } from './payments.service'
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParam,
  webhookSchema,
} from './payments.validator'

export const paymentsController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const params = listPaymentsQuerySchema.parse(req.query)
    const result = await paymentsService.list(user, params)

    res.json({
      success: true,
      message: 'Daftar pembayaran',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await paymentsService.detail(user, paymentIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Detail pembayaran',
      data,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = createPaymentSchema.parse(req.body)
    const data = await paymentsService.create(user, input)

    res.status(201).json({
      success: true,
      message: data.providerReady
        ? 'Pembayaran dibuat, lanjutkan ke halaman pembayaran'
        : 'Pembayaran dibuat, tautan pembayaran belum tersedia',
      data,
    })
  },

  /**
   * Notifikasi dari penyedia pembayaran.
   *
   * Tidak memakai sesi: yang mengirimnya server penyedia, bukan peramban.
   * Keasliannya dibuktikan tanda tangan pada isi notifikasinya, diperiksa di
   * service sebelum satu pun nilainya dipakai.
   *
   * Jawabannya selalu 200 selama tanda tangannya sah, termasuk ketika
   * notifikasinya diabaikan. Penyedia akan mengirim ulang terus selama
   * jawabannya bukan sukses, dan notifikasi yang tidak dikenali tidak akan
   * berubah menjadi dikenali hanya karena dikirim berkali-kali.
   */
  async webhook(req: Request, res: Response): Promise<void> {
    const input = webhookSchema.parse(req.body)
    const hasil = await paymentsService.webhook(input)

    res.json({
      success: true,
      message: 'Notifikasi diproses',
      data: hasil,
    })
  },

  /**
   * Tandai pembayaran berhasil tanpa penyedia pembayaran.
   *
   * Hanya terdaftar di lingkungan pengembangan, lihat `payments.routes.ts`.
   */
  async simulasi(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await paymentsService.simulasi(user, paymentIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Pembayaran ditandai berhasil (simulasi pengembangan)',
      data,
    })
  },

  /** Keadaan konfigurasi pembayaran, supaya layar bisa menjelaskan apa adanya. */
  async konfigurasi(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Konfigurasi pembayaran',
      data: {
        provider: 'midtrans',
        mode: env.MIDTRANS_IS_PRODUCTION ? 'production' : 'sandbox',
        ready: Boolean(env.MIDTRANS_SERVER_KEY),
        simulasiTersedia: env.NODE_ENV !== 'production',
      },
    })
  },
}
