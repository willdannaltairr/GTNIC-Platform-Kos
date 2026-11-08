import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { dashboardService } from './dashboard.service'

/**
 * Dashboard kedua peran.
 *
 * Id pengguna selalu diambil dari token yang sudah diverifikasi, tidak pernah
 * dari query atau body. Halaman ini menampilkan data pribadi, jadi satu
 * parameter yang bisa ditentukan klien di sini sama dengan membuka dashboard
 * siapa pun.
 */
export const dashboardController = {
  async tenant(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const data = await dashboardService.tenant(userId)

    res.json({
      success: true,
      message: 'Dashboard penghuni',
      data,
    })
  },

  async owner(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const data = await dashboardService.owner(userId)

    res.json({
      success: true,
      message: 'Dashboard pemilik kos',
      data,
    })
  },
}
