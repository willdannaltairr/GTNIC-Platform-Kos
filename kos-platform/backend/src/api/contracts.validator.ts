import { z } from 'zod'

/**
 * Validasi untuk modul kontrak sewa.
 *
 * Nilai enum di sini disalin dari tipe database, bukan dikarang di sini:
 * menambah nilai yang tidak ada di enum hanya akan ditolak PostgreSQL sebagai
 * galat 500, bukan sebagai permintaan yang salah bentuk.
 */

export const CONTRACT_STATUS = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'COMPLETED',
  'TERMINATED',
  'CANCELLED',
] as const

/**
 * Perpindahan status yang masuk akal.
 *
 * Ditulis tetap, sama seperti pada booking: aturan perpindahannya keputusan
 * bisnis, bukan turunan dari daftar enumnya. Kontrak yang sudah diakhiri tidak
 * boleh kembali aktif, karena tagihan dan tanggal huni yang sudah berjalan
 * tidak bisa ditarik lagi.
 */
export const PERPINDAHAN_KONTRAK: Record<string, readonly string[]> = {
  DRAFT: ['PENDING_SIGNATURE', 'CANCELLED'],
  PENDING_SIGNATURE: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'TERMINATED'],
  // Status akhir: tidak ada jalan keluar, supaya catatan berakhirnya tetap utuh.
  COMPLETED: [],
  TERMINATED: [],
  CANCELLED: [],
}

export const createContractSchema = z.object({
  bookingId: z.string().uuid('ID booking tidak valid'),
  /**
   * Tanggal huni boleh berbeda dari tanggal booking: pemilik dan penghuni
   * sering menyepakati tanggal serah terima kunci di luar pengajuan awal.
   * Kalau kosong, tanggal booking yang dipakai.
   */
  startDate: z
    .string()
    .datetime({ offset: true, message: 'Tanggal mulai harus berupa tanggal yang sah' })
    .optional(),
  durasiBulan: z.coerce
    .number()
    .int()
    .min(1, 'Durasi sewa minimal 1 bulan')
    .max(24, 'Durasi sewa maksimal 24 bulan')
    .optional(),
  catatan: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
})

export const updateContractStatusSchema = z.object({
  status: z.enum(CONTRACT_STATUS),
  alasan: z.string().trim().max(500, 'Alasan maksimal 500 karakter').optional(),
})

export const listContractsQuerySchema = z.object({
  status: z.enum(CONTRACT_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const contractIdParam = (nilai: string): string =>
  z.string().uuid('ID kontrak tidak valid').parse(nilai)

export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>
