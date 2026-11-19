import { z } from 'zod'

/**
 * Validasi untuk verifikasi pemilik kos.
 *
 * Seluruh nilai yang datang dari klien divalidasi di sini, termasuk jenis
 * dokumen yang diunggah: tanpa daftar tertutup, satu salah ketik saja
 * ("SELFIE-KTP") akan lolos ke database sebagai jenis dokumen yang tidak
 * pernah dikenali siapa pun, dan syarat kelengkapan pengajuan ikut lolos.
 */

/**
 * Jenis dokumen yang diterima.
 *
 * Hanya dua yang wajib (lihat `WAJIB` di service): KTP dan swafoto dengan KTP.
 * Tiga sisanya menambah keyakinan tetapi tidak dimiliki semua pemilik kos
 * perorangan, jadi memaksanya akan menutup pintu bagi mereka.
 */
export const DOCUMENT_TYPES = ['KTP', 'SELFIE_KTP', 'NPWP', 'IZIN_USAHA', 'REKENING'] as const

/** Sebutan tiap jenis dokumen dalam bahasa yang bisa dibaca. */
export const LABEL_DOKUMEN: Record<string, string> = {
  KTP: 'KTP',
  SELFIE_KTP: 'Swafoto dengan KTP',
  NPWP: 'NPWP',
  IZIN_USAHA: 'Izin usaha',
  REKENING: 'Buku rekening',
}

export const uploadDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES, {
    message: `Jenis dokumen harus salah satu dari: ${DOCUMENT_TYPES.join(', ')}`,
  }),
})

export const listOwnersQuerySchema = z.object({
  status: z.enum(['NOT_SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * Keputusan admin atas pengajuan verifikasi pemilik.
 *
 * `notes` wajib saat penolakan, dengan alasan yang sama seperti penolakan
 * properti: pemiliknya harus tahu apa yang perlu diperbaiki. Penolakan tanpa
 * alasan membuat pemilik menebak, lalu mengirim ulang dokumen yang sama.
 */
export const verifyOwnerSchema = z
  .object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && (!data.notes || data.notes.length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message:
          'Catatan penolakan wajib diisi, minimal 10 karakter, supaya pemilik tahu apa yang harus diperbaiki',
      })
    }
  })

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>
export type ListOwnersQuery = z.infer<typeof listOwnersQuerySchema>
export type VerifyOwnerInput = z.infer<typeof verifyOwnerSchema>
