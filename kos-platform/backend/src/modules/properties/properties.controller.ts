import { Request, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../../lib/httpError'
import type { AuthRequest, AuthUser } from '../../middleware/auth'
import { propertiesService } from './properties.service'
import {
  createPropertySchema,
  listMyPropertiesQuerySchema,
  listPropertiesQuerySchema,
  setPublicationSchema,
  updatePropertySchema,
} from './properties.validator'

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

export const propertiesController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listPropertiesQuerySchema.parse(req.query)
    const result = await propertiesService.listPublic(query)

    res.json({
      success: true,
      message: 'Daftar properti',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const property = await propertiesService.detailPublic(req.params.slug)

    res.json({
      success: true,
      message: 'Detail properti',
      data: property,
    })
  },

  async listMine(req: Request, res: Response): Promise<void> {
    const query = listMyPropertiesQuerySchema.parse(req.query)
    const user = actor(req)

    // Admin melihat properti miliknya sendiri lewat endpoint ini, sama seperti
    // pemilik. Meninjau properti orang lain punya endpointnya sendiri di
    // modul admin, supaya batas kewenangannya terlihat dari rutenya.
    const result = await propertiesService.listMine(user.userId, query)

    res.json({
      success: true,
      message: 'Properti Anda',
      data: result.items,
      meta: result.meta,
    })
  },

  async detailMine(req: Request, res: Response): Promise<void> {
    const property = await propertiesService.detailMine(
      actor(req),
      idParam(req.params.id, 'ID properti'),
    )

    res.json({
      success: true,
      message: 'Detail properti Anda',
      data: property,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createPropertySchema.parse(req.body)
    const property = await propertiesService.create(actor(req), input)

    res.status(201).json({
      success: true,
      message: 'Properti berhasil ditambahkan sebagai draf',
      data: property,
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = updatePropertySchema.parse(req.body)
    const property = await propertiesService.update(
      actor(req),
      idParam(req.params.id, 'ID properti'),
      input,
    )

    res.json({
      success: true,
      message: 'Properti berhasil diperbarui',
      data: property,
    })
  },

  async submitForReview(req: Request, res: Response): Promise<void> {
    const property = await propertiesService.submitForReview(
      actor(req),
      idParam(req.params.id, 'ID properti'),
    )

    res.json({
      success: true,
      message: 'Properti diajukan untuk ditinjau admin',
      data: property,
    })
  },

  async setPublication(req: Request, res: Response): Promise<void> {
    const input = setPublicationSchema.parse(req.body)
    const property = await propertiesService.setPublication(
      actor(req),
      idParam(req.params.id, 'ID properti'),
      input.publicationStatus,
    )

    res.json({
      success: true,
      message:
        input.publicationStatus === 'PUBLISHED'
          ? 'Properti diterbitkan'
          : 'Properti ditarik dari daftar publik',
      data: property,
    })
  },
}
