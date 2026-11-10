import { z } from 'npm:zod@3'

/**
 * Validasi pencarian tersimpan.
 *
 * Penyaringnya divalidasi dengan bentuk yang sama seperti penyaring pencarian
 * kos, tetapi seluruhnya opsional: pencarian yang menyimpan seluruh pilihan
 * kosong tidak berguna, dan itu ditolak lewat `superRefine` di bawah, bukan
 * dengan mewajibkan salah satu penyaring tertentu. Yang membedakan pencarian
 * yang bermakna dan yang tidak adalah ada tidaknya satu penyaring saja, bukan
 * penyaring yang mana.
 *
 * Nama kuncinya sengaja sama dengan kueri di halaman cari kos (`bathroom`,
 * bukan `bathroomType` yang dipakai API): penyaring ini dipasang kembali ke
 * alamat halaman itu apa adanya saat pemiliknya membuka hasilnya lagi. Kunci
 * yang tidak dikenal ditolak lewat `.strict()`, bukan diabaikan, supaya salah
 * nama gagal dengan jelas alih-alih menghilang tanpa jejak.
 */

const penyaring = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
  type: z.enum(['KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR']).optional(),
  /** Namanya sama dengan kueri di halaman cari kos, supaya penyaring tersimpan bisa dipakai ulang apa adanya. */
  bathroom: z.enum(['private', 'shared']).optional(),
  minPrice: z.coerce.number().int().nonnegative().max(1_000_000_000).optional(),
  maxPrice: z.coerce.number().int().nonnegative().max(1_000_000_000).optional(),
  /** Slug fasilitas, dipisah koma; sama seperti penyaring di halaman cari kos. */
  facilities: z.string().trim().max(400).optional(),
}).strict()

export const createSavedSearchSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama pencarian minimal 2 karakter').max(80),
    filters: penyaring,
  })
  .superRefine((data, ctx) => {
    const f = data.filters
    const ada =
      Boolean(f.q) ||
      Boolean(f.city) ||
      Boolean(f.district) ||
      Boolean(f.type) ||
      Boolean(f.bathroom) ||
      f.minPrice !== undefined ||
      f.maxPrice !== undefined ||
      Boolean(f.facilities)

    if (!ada) {
      ctx.addIssue({
        code: 'custom',
        path: ['filters'],
        message: 'Isi minimal satu penyaring supaya pencarian ini bisa dicocokkan',
      })
    }

    if (f.minPrice !== undefined && f.maxPrice !== undefined && f.minPrice > f.maxPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['filters', 'maxPrice'],
        message: 'Harga maksimum harus lebih besar daripada harga minimum',
      })
    }
  })

export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>
