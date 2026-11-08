import { Request, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../../lib/httpError'
import type { AuthRequest, AuthUser } from '../../middleware/auth'
import { ownerVerificationService } from './owner-verification.service'
import {
  listOwnersQuerySchema,
  uploadDocumentSchema,
  verifyOwnerSchema,
} from './owner-verification.validator'

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

export const ownerVerificationController = {
  async getMine(req: Request, res: Response): Promise<void> {
    const data = await ownerVerificationService.getMine(actor(req))

    res.json({
      success: true,
      message: 'Status verifikasi pemilik',
      data,
    })
  },

  async uploadDocument(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new HttpError(400, 'Kirim berkas dokumennya pada field "document"')
    }

    const input = uploadDocumentSchema.parse(req.body)
    const data = await ownerVerificationService.uploadDocument(actor(req), input, req.file)

    res.status(201).json({
      success: true,
      message: 'Dokumen tersimpan',
      data,
    })
  },

  async removeDocument(req: Request, res: Response): Promise<void> {
    const data = await ownerVerificationService.removeDocument(
      actor(req),
      idParam(req.params.id, 'ID dokumen'),
    )

    res.json({
      success: true,
      message: 'Dokumen dihapus',
      data,
    })
  },

  async submit(req: Request, res: Response): Promise<void> {
    const data = await ownerVerificationService.submit(actor(req))

    res.json({
      success: true,
      message: 'Pengajuan verifikasi terkirim, menunggu tinjauan admin',
      data,
    })
  },
}

/**
 * Sisi admin: meninjau dan memutuskan pengajuan.
 *
 * Ditulis di berkas yang sama dengan sisinya pemilik karena keduanya berbicara
 * tentang data yang sama, dan memisahkannya ke modul lain membuat aturan
 * kelengkapan dokumen harus ditulis dua kali.
 */
export const ownerVerificationAdminController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listOwnersQuerySchema.parse(req.query)
    const result = await ownerVerificationService.listOwners(query)

    res.json({
      success: true,
      message: 'Daftar pemilik',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const data = await ownerVerificationService.ownerDetail(idParam(req.params.id, 'ID pemilik'))

    res.json({
      success: true,
      message: 'Detail pemilik',
      data,
    })
  },

  async verify(req: Request, res: Response): Promise<void> {
    const input = verifyOwnerSchema.parse(req.body)
    const data = await ownerVerificationService.verifyOwner(
      actor(req),
      idParam(req.params.id, 'ID pemilik'),
      input,
    )

    res.json({
      success: true,
      message:
        input.status === 'VERIFIED'
          ? 'Pemilik ditandai terverifikasi'
          : 'Pengajuan pemilik ditolak, alasannya tersimpan',
      data,
    })
  },
}
