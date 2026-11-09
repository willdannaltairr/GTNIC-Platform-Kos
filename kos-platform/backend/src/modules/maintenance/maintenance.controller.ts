import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { HttpError } from '../../lib/httpError'
import { maintenanceService } from './maintenance.service'
import {
  createMaintenanceSchema,
  listMaintenanceQuerySchema,
  maintenanceIdParam,
  maintenancePhotoIdParam,
  updateMaintenanceStatusSchema,
} from './maintenance.validator'

export const maintenanceController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const params = listMaintenanceQuerySchema.parse(req.query)
    const result = await maintenanceService.list(user, params)

    res.json({
      success: true,
      message: 'Daftar laporan perbaikan',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await maintenanceService.detail(user, maintenanceIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Detail laporan perbaikan',
      data,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = createMaintenanceSchema.parse(req.body)
    const data = await maintenanceService.create(user, input)

    res.status(201).json({
      success: true,
      message: 'Laporan perbaikan dikirim ke pemilik kos',
      data,
    })
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = updateMaintenanceStatusSchema.parse(req.body)
    const data = await maintenanceService.updateStatus(
      user,
      maintenanceIdParam(req.params.id),
      input,
    )

    res.json({
      success: true,
      message: 'Status perbaikan diperbarui',
      data,
    })
  },

  async addPhoto(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const file = req.file

    // Multer sudah menolak permintaan tanpa berkas lewat batas fieldnya, tetapi
    // pemeriksaan ini tetap perlu: tanpa berkas, `file.buffer` melempar dan
    // galatnya keluar sebagai 500, bukan sebagai permintaan yang salah bentuk.
    if (!file) {
      throw new HttpError(400, 'Kirim satu foto pada field "photo"')
    }

    const data = await maintenanceService.addPhoto(user, maintenanceIdParam(req.params.id), file)

    res.status(201).json({
      success: true,
      message: 'Foto laporan ditambahkan',
      data,
    })
  },

  async removePhoto(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await maintenanceService.removePhoto(
      user,
      maintenanceIdParam(req.params.id),
      maintenancePhotoIdParam(req.params.photoId),
    )

    res.json({
      success: true,
      message: 'Foto laporan dihapus',
      data,
    })
  },
}
