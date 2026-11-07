import { Request, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../../lib/httpError'
import type { AuthRequest, AuthUser } from '../../middleware/auth'
import { roomsService } from './rooms.service'
import {
  createRoomSchema,
  listRoomsQuerySchema,
  updateRoomSchema,
  uploadPhotoMetaSchema,
} from './rooms.validator'

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
 * PostgreSQL dan ditolak di sana sebagai galat sintaks — yang sampai ke klien
 * sebagai 500, seolah server yang rusak, padahal permintaannya yang salah
 * bentuk. Divalidasi di batas masuk supaya jawabannya 400 dengan pesan jelas.
 */
const idParam = (nilai: string, label: string): string =>
  z.string().uuid(`${label} tidak valid`).parse(nilai)

export const roomsController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listRoomsQuerySchema.parse(req.query)
    const result = await roomsService.list(query, (req as AuthRequest).user)

    res.json({
      success: true,
      message: 'Daftar kamar',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const room = await roomsService.detail(
      idParam(req.params.id, 'ID kamar'),
      (req as AuthRequest).user,
    )

    res.json({
      success: true,
      message: 'Detail kamar',
      data: room,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createRoomSchema.parse(req.body)
    const room = await roomsService.create(actor(req), input)

    res.status(201).json({
      success: true,
      message: 'Kamar berhasil ditambahkan',
      data: room,
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = updateRoomSchema.parse(req.body)
    const room = await roomsService.update(actor(req), idParam(req.params.id, 'ID kamar'), input)

    res.json({
      success: true,
      message: 'Kamar berhasil diperbarui',
      data: room,
    })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const result = await roomsService.remove(actor(req), idParam(req.params.id, 'ID kamar'))

    res.json({
      success: true,
      message: 'Kamar berhasil dihapus',
      data: result,
    })
  },

  async addPhoto(req: Request, res: Response): Promise<void> {
    const meta = uploadPhotoMetaSchema.parse(req.query)
    const file = req.file

    if (!file) {
      throw new HttpError(400, 'Berkas foto wajib dikirim pada field "photo"')
    }

    const photo = await roomsService.addPhoto(
      actor(req),
      idParam(req.params.id, 'ID kamar'),
      file,
      meta,
    )

    res.status(201).json({
      success: true,
      message: 'Foto kamar berhasil diunggah',
      data: photo,
    })
  },

  async removePhoto(req: Request, res: Response): Promise<void> {
    const result = await roomsService.removePhoto(
      actor(req),
      idParam(req.params.id, 'ID kamar'),
      idParam(req.params.photoId, 'ID foto'),
    )

    res.json({
      success: true,
      message: 'Foto kamar berhasil dihapus',
      data: result,
    })
  },
}
