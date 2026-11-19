import { z } from 'zod'

/** Nilai sah kolom `visit_status` (enum VisitStatus). */
export const VISIT_STATUS = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const

/** Status yang boleh ditetapkan setelah kunjungan dijadwalkan. */
export const VISIT_STATUS_AKHIR = ['COMPLETED', 'CANCELLED', 'NO_SHOW'] as const

export const createVisitSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
  /** Kamar tertentu yang mau dilihat, bila penghuni sudah memilih kamar. */
  roomId: z.string().uuid('ID kamar tidak valid').optional(),
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: 'Jadwal harus berupa tanggal dan waktu yang sah' }),
  catatan: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
})

export const updateVisitSchema = z
  .object({
    scheduledAt: z
      .string()
      .datetime({ offset: true, message: 'Jadwal harus berupa tanggal dan waktu yang sah' })
      .optional(),
    status: z.enum(VISIT_STATUS_AKHIR).optional(),
    catatan: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Kirim minimal satu field untuk diperbarui',
  })

/**
 * Checklist dikirim sekaligus, bukan satu per satu.
 *
 * Pengunjung mengisi daftar periksa ini sambil berdiri di depan kamar, dan
 * satu permintaan per baris berarti jaringan yang buruk memutus pengisian di
 * tengah jalan dengan separuh butir tersimpan.
 */
export const checklistSchema = z.object({
  items: z
    .array(
      z.object({
        item: z.string().trim().min(1, 'Butir periksa tidak boleh kosong').max(200),
        checked: z.boolean().default(false),
        catatan: z.string().trim().max(500).optional(),
      }),
    )
    .min(1, 'Kirim minimal satu butir periksa')
    .max(40, 'Maksimal 40 butir periksa'),
})

export const toggleChecklistSchema = z.object({
  checked: z.boolean(),
  catatan: z.string().trim().max(500).optional(),
})

export const visitNoteSchema = z.object({
  kategori: z.string().trim().min(1, 'Kategori wajib diisi').max(50),
  isi: z.string().trim().min(1, 'Catatan tidak boleh kosong').max(2000),
})

export const listVisitsQuerySchema = z.object({
  status: z.enum(VISIT_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const visitIdParam = (nilai: string): string =>
  z.string().uuid('ID kunjungan tidak valid').parse(nilai)

export type CreateVisitInput = z.infer<typeof createVisitSchema>
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>
export type ChecklistInput = z.infer<typeof checklistSchema>
export type VisitNoteInput = z.infer<typeof visitNoteSchema>
export type ListVisitsQuery = z.infer<typeof listVisitsQuerySchema>
