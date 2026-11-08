import { Request, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../../lib/httpError'
import type { AuthRequest, AuthUser } from '../../middleware/auth'
import { adminService } from './admin.service'
import {
  listActivityQuerySchema,
  listAdminPropertiesQuerySchema,
  listAdminUsersQuerySchema,
  setUserStatusSchema,
  verifyPropertySchema,
} from './admin.validator'

/**
 * Pemanggil endpoint ini sudah melewati `authenticate`, jadi `req.user` pasti
 * terisi. Diambil lewat satu penolong kecil supaya ketidakpastian tipe tidak
 * diulang di setiap handler.
 */
const actor = (req: Request): AuthUser => {
  const user = (req as AuthRequest).user
  if (!user) throw new HttpError(401, 'Tidak terautentikasi')
  return user
}

/**
 * Parameter id wajib UUID.
 *
 * Tanpa pemeriksaan di sini, id seperti "bukan-uuid" diteruskan apa adanya ke
 * PostgreSQL dan ditolak di sana sebagai galat sintaks, yang sampai ke klien
 * sebagai 500, seolah server yang rusak, padahal permintaannya yang salah
 * bentuk. Divalidasi di batas masuk supaya jawabannya 400 dengan pesan jelas.
 */
const idParam = (nilai: string, label: string): string =>
  z.string().uuid(`${label} tidak valid`).parse(nilai)

export const adminController = {
  async ringkasan(_req: Request, res: Response): Promise<void> {
    const data = await adminService.ringkasan()

    res.json({
      success: true,
      message: 'Ringkasan platform',
      data,
    })
  },

  async listProperties(req: Request, res: Response): Promise<void> {
    const query = listAdminPropertiesQuerySchema.parse(req.query)
    const result = await adminService.listProperties(query)

    res.json({
      success: true,
      message: 'Daftar properti',
      data: result.items,
      meta: result.meta,
    })
  },

  async verifyProperty(req: Request, res: Response): Promise<void> {
    const input = verifyPropertySchema.parse(req.body)
    const data = await adminService.verifyProperty(
      actor(req),
      idParam(req.params.id, 'ID properti'),
      input,
    )

    res.json({
      success: true,
      message: 'Status verifikasi properti diperbarui',
      data,
    })
  },

  async listUsers(req: Request, res: Response): Promise<void> {
    const query = listAdminUsersQuerySchema.parse(req.query)
    const result = await adminService.listUsers(query)

    res.json({
      success: true,
      message: 'Daftar pengguna',
      data: result.items,
      meta: result.meta,
    })
  },

  async setUserStatus(req: Request, res: Response): Promise<void> {
    const input = setUserStatusSchema.parse(req.body)
    const data = await adminService.setUserStatus(
      actor(req),
      idParam(req.params.id, 'ID pengguna'),
      input,
    )

    res.json({
      success: true,
      message: 'Status akun diperbarui',
      data,
    })
  },

  async listActivity(req: Request, res: Response): Promise<void> {
    const query = listActivityQuerySchema.parse(req.query)
    const data = await adminService.listActivity(query)

    res.json({
      success: true,
      message: 'Catatan aktivitas',
      data,
    })
  },
}
