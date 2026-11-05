import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { usersService } from './users.service'
import { listUsersQuerySchema, updateProfileSchema } from './users.validator'

export const usersController = {
  async updateMe(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const data = updateProfileSchema.parse(req.body)
    const user = await usersService.updateProfile(userId, data)

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: { user },
    })
  },

  async list(req: Request, res: Response): Promise<void> {
    const query = listUsersQuerySchema.parse(req.query)
    const result = await usersService.listUsers(query)

    res.json({
      success: true,
      message: 'Daftar pengguna',
      data: result.users,
      meta: result.meta,
    })
  },
}
