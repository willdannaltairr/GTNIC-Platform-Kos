import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul Room Passport.
 *
 * Nilai enum disalin dari tipe database, bukan dikarang di sini: menambah nilai
 * yang tidak ada di enum hanya akan ditolak PostgreSQL sebagai galat 500, bukan
 * sebagai permintaan yang salah bentuk.
 */

export const REPORT_TYPES = ['CHECK_IN', 'CHECK_OUT', 'PERIODIC_INSPECTION'] as const

export const REPORT_STATUS = [
  'DRAFT',
  'SUBMITTED',
  'ACKNOWLEDGED',
  'DISPUTED',
  'COMPLETED',
] as const

/**
 * Keadaan tiap butir periksa.
 *
 * Daftar tertutup, bukan teks bebas, dengan alasan yang sama seperti kategori
 * laporan perbaikan: yang diketik sendiri akan menghasilkan "baik", "Baik",
 * dan "bagus" pada kolom yang sama, sehingga tidak ada cara menghitung berapa
 * butir yang rusak di satu kamar.
 */
export const CONDITION_STATUS = ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'TIDAK_ADA'] as const

/** Sebutan tiap keadaan, dipakai formulir dan tampilan. */
export const LABEL_KONDISI: Record<string, string> = {
  BAIK: 'Baik',
  RUSAK_RINGAN: 'Rusak ringan',
  RUSAK_BERAT: 'Rusak berat',
  TIDAK_ADA: 'Tidak ada',
}

/** Sebutan tiap jenis pemeriksaan. */
export const LABEL_JENIS: Record<string, string> = {
  CHECK_IN: 'Pemeriksaan masuk',
  CHECK_OUT: 'Pemeriksaan keluar',
  PERIODIC_INSPECTION: 'Pemeriksaan berkala',
}

/**
 * Butir periksa bawaan.
 *
 * Dikirim frontend sebagai saran awal supaya penghuni tidak mulai dari halaman
 * kosong, dan boleh diubah maupun ditambah. Daftarnya sengaja tidak dijadikan
 * batas di server: kamar yang tidak punya lemari tetap perlu cara mencatat
 * bahwa lemarinya tidak ada.
 */
export const BUTIR_BAWAAN = [
  'Dinding dan cat',
  'Lantai',
  'Pintu dan kunci',
  'Jendela',
  'Tempat tidur dan kasur',
  'Lemari',
  'Meja dan kursi',
  'Lampu',
  'Stopkontak',
  'Kran dan shower',
  'Kloset',
  'Ventilasi',
] as const

export const createRoomConditionSchema = z.object({
  /**
   * Kontrak yang diperiksa. Hanya kontrak milik penghuni sendiri yang boleh;
   * kontrak aktif untuk pemeriksaan masuk, dan kontrak aktif atau selesai
   * untuk pemeriksaan keluar. Kontraknya diperiksa di service karena hanya di
   * sana penyewanya diketahui.
   */
  contractId: z.string().uuid('ID kontrak tidak valid'),
  reportType: z.enum(REPORT_TYPES, {
    message: `Jenis pemeriksaan harus salah satu dari: ${REPORT_TYPES.join(', ')}`,
  }),
  /** Keadaan umum kamar, satu paragraf. Wajib saat dikirim, bukan saat draf. */
  generalCondition: z.string().trim().max(2000, 'Keterangan maksimal 2000 karakter').optional(),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
})

export const updateRoomConditionSchema = z.object({
  generalCondition: z.string().trim().max(2000, 'Keterangan maksimal 2000 karakter').optional(),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
  reportDate: z
    .string()
    .datetime({ offset: true, message: 'Tanggal pemeriksaan harus berupa tanggal yang sah' })
    .optional(),
})

/**
 * Satu butir periksa.
 *
 * Butirnya dikirim sekaligus sebagai larik saat pemeriksaan disimpan, bukan
 * satu per satu. Daftar periksa kamar isinya belasan butir, dan mengirimnya
 * satu per satu berarti belasan perjalanan untuk satu layar yang sama.
 */
export const checklistItemSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(2, 'Nama butir minimal 2 karakter')
    .max(150, 'Nama butir maksimal 150 karakter'),
  conditionStatus: z.enum(CONDITION_STATUS, {
    message: `Keadaan harus salah satu dari: ${CONDITION_STATUS.join(', ')}`,
  }),
  notes: z.string().trim().max(500, 'Catatan butir maksimal 500 karakter').optional(),
})

export const setChecklistSchema = z.object({
  items: z
    .array(checklistItemSchema)
    .max(50, 'Maksimal 50 butir per pemeriksaan'),
})

export const submitRoomConditionSchema = z.object({
  /**
   * Keterangan umum wajib saat dikirim. Draf boleh kosong karena pemeriksaan
   * diisi bertahap, tetapi yang dikirim ke pemilik untuk disetujui harus
   * punya isi: kalau tidak, yang ia setujui adalah daftar periksa tanpa
   * keterangan apa pun tentang keadaan kamarnya.
   */
  generalCondition: z
    .string()
    .trim()
    .min(10, 'Keadaan umum wajib diisi minimal 10 karakter sebelum dikirim')
    .max(2000, 'Keterangan maksimal 2000 karakter')
    .optional(),
})

/**
 * Persetujuan atau keberatan pemilik.
 *
 * Keberatan wajib disertai alasan, dengan pertimbangan yang sama seperti
 * penolakan di modul lain: penghuni harus tahu butir mana yang tidak disetujui,
 * bukan sekadar melihat statusnya berubah. Tanpa alasan, ia akan menebak dan
 * sengketa yang sama berulang.
 */
export const acknowledgeSchema = z
  .object({
    setuju: z.boolean({ message: 'setuju harus true atau false' }),
    notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.setuju && (!data.notes || data.notes.length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message:
          'Alasan keberatan wajib diisi, minimal 10 karakter, supaya penghuni tahu bagian mana yang tidak disetujui',
      })
    }
  })

export const listRoomConditionsQuerySchema = z.object({
  status: z.enum(REPORT_STATUS).optional(),
  reportType: z.enum(REPORT_TYPES).optional(),
  contractId: z.string().uuid('ID kontrak tidak valid').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const roomConditionIdParam = (nilai: string): string =>
  z.string().uuid('ID pemeriksaan tidak valid').parse(nilai)

export const roomConditionPhotoIdParam = (nilai: string): string =>
  z.string().uuid('ID foto tidak valid').parse(nilai)

export type CreateRoomConditionInput = z.infer<typeof createRoomConditionSchema>
export type UpdateRoomConditionInput = z.infer<typeof updateRoomConditionSchema>
export type SetChecklistInput = z.infer<typeof setChecklistSchema>
export type SubmitRoomConditionInput = z.infer<typeof submitRoomConditionSchema>
export type AcknowledgeInput = z.infer<typeof acknowledgeSchema>
export type ListRoomConditionsQuery = z.infer<typeof listRoomConditionsQuerySchema>
