import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul ulasan.
 *
 * Nilai enum disalin dari tipe database, bukan dikarang di sini: menambah nilai
 * yang tidak ada di enum hanya akan ditolak PostgreSQL sebagai galat 500, bukan
 * sebagai permintaan yang salah bentuk.
 */

export const REVIEW_STATUS = [
  'PENDING_MODERATION',
  'APPROVED',
  'REJECTED',
  'HIDDEN',
] as const

/** Keputusan yang boleh diambil admin. Status awal bukan keputusan. */
export const KEPUTUSAN_MODERASI = ['APPROVED', 'REJECTED', 'HIDDEN'] as const

/**
 * Nilai penilaian.
 *
 * Skalanya 1 sampai 5, dan 0 tidak diterima. Nol sering dipakai orang sebagai
 * "tidak ada nilai" waktu mengisi formulir, tetapi di sini ia akan terbaca
 * sebagai penilaian terburuk dan menyeret rata-rata properti tanpa penulisnya
 * pernah bermaksud begitu. Sub-penilaian yang tidak diisi karena itu dibiarkan
 * kosong, bukan diisi nol.
 */
const skor = (label: string) =>
  z
    .number({ message: `${label} harus berupa angka` })
    .int(`${label} harus bilangan bulat`)
    .min(1, `${label} minimal 1`)
    .max(5, `${label} maksimal 5`)

export const createReviewSchema = z.object({
  /** Kontrak yang jadi dasar ulasan; jenis sewanya diperiksa di service. */
  contractId: z.string().uuid('ID kontrak tidak valid'),
  rating: skor('Penilaian keseluruhan'),
  cleanlinessRating: skor('Penilaian kebersihan').optional(),
  locationRating: skor('Penilaian lokasi').optional(),
  facilitiesRating: skor('Penilaian fasilitas').optional(),
  ownerServiceRating: skor('Penilaian layanan pemilik').optional(),
  /**
   * Isi ulasan boleh kosong: penilaian bintang saja sudah berguna, dan
   * memaksa menulis kalimat membuat orang mengarang kalimat seadanya.
   */
  content: z
    .string()
    .trim()
    .min(10, 'Ulasan minimal 10 karakter supaya ada isinya')
    .max(2000, 'Ulasan maksimal 2000 karakter')
    .optional(),
})

/**
 * Perubahan ulasan oleh penulisnya.
 *
 * Statusnya sengaja tidak bisa diubah dari sini: ulasan yang sudah disetujui
 * lalu disunting harus kembali ditinjau, dan itu diurus service, bukan
 * diserahkan ke pemanggil.
 */
export const updateReviewSchema = z.object({
  rating: skor('Penilaian keseluruhan').optional(),
  cleanlinessRating: skor('Penilaian kebersihan').optional(),
  locationRating: skor('Penilaian lokasi').optional(),
  facilitiesRating: skor('Penilaian fasilitas').optional(),
  ownerServiceRating: skor('Penilaian layanan pemilik').optional(),
  content: z
    .string()
    .trim()
    .min(10, 'Ulasan minimal 10 karakter supaya ada isinya')
    .max(2000, 'Ulasan maksimal 2000 karakter')
    .optional(),
})

/**
 * Daftar ulasan.
 *
 * `propertySlug` dipakai halaman properti, yang tidak membawa id properti
 * melainkan slugnya. `status` hanya dihormati untuk admin; bagi pengunjung dan
 * penghuni, service yang menentukan apa yang boleh terlihat.
 */
export const listReviewsQuerySchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid').optional(),
  propertySlug: z.string().trim().min(1).optional(),
  status: z.enum(REVIEW_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * Keputusan moderasi admin.
 *
 * Penolakan wajib disertai alasan, dengan pertimbangan yang sama seperti
 * penolakan properti dan laporan perbaikan: penulis ulasan harus tahu bagian
 * mana yang tidak boleh, bukan sekadar melihat ulasannya hilang. Alasannya
 * ikut dikirim ke notifikasinya.
 */
export const moderateReviewSchema = z
  .object({
    status: z.enum(KEPUTUSAN_MODERASI),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && (!data.notes || data.notes.length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message:
          'Alasan penolakan wajib diisi, minimal 10 karakter, supaya penulisnya tahu apa yang perlu diperbaiki',
      })
    }
  })

export const reviewIdParam = (nilai: string): string =>
  z.string().uuid('ID ulasan tidak valid').parse(nilai)

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>
