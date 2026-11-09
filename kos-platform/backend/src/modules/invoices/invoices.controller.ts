import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { invoicesService } from './invoices.service'
import {
  cancelInvoiceSchema,
  createInvoiceSchema,
  invoiceIdParam,
  listInvoicesQuerySchema,
} from './invoices.validator'

export const invoicesController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const params = listInvoicesQuerySchema.parse(req.query)
    const result = await invoicesService.list(user, params)

    res.json({
      success: true,
      message: 'Daftar tagihan',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await invoicesService.detail(user, invoiceIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Detail tagihan',
      data,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = createInvoiceSchema.parse(req.body)
    const data = await invoicesService.create(user, input)

    res.status(201).json({
      success: true,
      message: 'Tagihan dibuat sebagai draf',
      data,
    })
  },

  async kirim(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await invoicesService.kirim(user, invoiceIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Tagihan dikirim ke penghuni',
      data,
    })
  },

  async batalkan(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = cancelInvoiceSchema.parse(req.body)
    const data = await invoicesService.batalkan(user, invoiceIdParam(req.params.id), input)

    res.json({
      success: true,
      message: 'Tagihan dibatalkan',
      data,
    })
  },
}
