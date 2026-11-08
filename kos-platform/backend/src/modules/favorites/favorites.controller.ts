import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { addFavoriteSchema, propertyIdParam } from './favorites.validator'
import { favoritesService } from './favorites.service'

/**
 * Favorit selalu milik pengguna yang sedang masuk, dan id pemiliknya diambil
 * dari token. Tidak ada satu pun handler di sini yang menerima id pengguna dari
 * permintaan, karena itu berarti siapa pun bisa membaca atau mengubah daftar
 * favorit orang lain.
 */
export const favoritesController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const result = await favoritesService.list(userId)

    res.json({
      success: true,
      message: 'Daftar favorit',
      data: result.items,
      meta: result.meta,
    })
  },

  async add(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const input = addFavoriteSchema.parse(req.body)
    const result = await favoritesService.add(userId, input.propertyId)

    res.status(201).json({
      success: true,
      message: 'Ditambahkan ke favorit',
      data: result,
    })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const result = await favoritesService.remove(userId, propertyIdParam(req.params.propertyId))

    res.json({
      success: true,
      message: 'Dihapus dari favorit',
      data: result,
    })
  },
}
