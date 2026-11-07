import { z } from 'zod'

/**
 * Query daftar properti publik.
 *
 * Semua filter di sini benar-benar diterapkan pada query database —
 * bukan hanya di frontend.
 */

/** Titik koordinat yang dipakai perhitungan jarak. */
const latitude = z.coerce.number().min(-90, 'Lintang minimal -90').max(90, 'Lintang maksimal 90')
const longitude = z.coerce.number().min(-180, 'Bujur minimal -180').max(180, 'Bujur maksimal 180')

export const listPropertiesQuerySchema = z
  .object({
    q: z.string().trim().min(1, 'Kata kunci minimal 1 karakter').optional(),
    city: z.string().trim().min(1).optional(),
    district: z.string().trim().min(1).optional(),
    type: z.enum(['KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR']).optional(),
    bathroomType: z.enum(['private', 'shared']).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    facilities: z.string().trim().optional(),

    /**
     * Titik pengunjung, dipakai fitur "kos di sekitar saya".
     *
     * Tidak wajib berpasangan di tingkat field — pasangannya diperiksa di
     * `superRefine` di bawah supaya pesannya menyebut sebabnya, bukan sekadar
     * "nilai tidak sah".
     */
    nearLat: latitude.optional(),
    nearLng: longitude.optional(),

    /** Saring kos yang lebih jauh daripada ini dari titik pengunjung. */
    maxDistanceKm: z.coerce
      .number()
      .nonnegative('Jarak maksimal tidak boleh negatif')
      .max(1000, 'Jarak maksimal 1000 km')
      .optional(),

    /** Titik asal, dipakai fitur "dari lokasi ke lokasi". */
    originLat: latitude.optional(),
    originLng: longitude.optional(),

    sort: z.enum(['newest', 'price_asc', 'price_desc', 'distance']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(9),
  })
  .superRefine((data, ctx) => {
    // Dua titik yang saling melengkapi diperiksa di sini, bukan dengan
    // `required` berpasangan: satu koordinat tanpa pasangannya hampir pasti
    // salah ketik, dan kalau dibiarkan permintaannya jalan dengan jarak yang
    // tidak dihitung — hasilnya tampak wajar padahal bukan yang diminta.
    const separuh = (lat?: number, lng?: number): boolean =>
      (lat === undefined) !== (lng === undefined)

    if (separuh(data.nearLat, data.nearLng)) {
      ctx.addIssue({
        code: 'custom',
        path: [data.nearLat === undefined ? 'nearLat' : 'nearLng'],
        message: 'nearLat dan nearLng harus dikirim bersamaan',
      })
    }

    if (separuh(data.originLat, data.originLng)) {
      ctx.addIssue({
        code: 'custom',
        path: [data.originLat === undefined ? 'originLat' : 'originLng'],
        message: 'originLat dan originLng harus dikirim bersamaan',
      })
    }

    const adaTitikPengunjung = data.nearLat !== undefined && data.nearLng !== undefined

    if (data.maxDistanceKm !== undefined && !adaTitikPengunjung) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxDistanceKm'],
        message: 'maxDistanceKm membutuhkan nearLat dan nearLng',
      })
    }

    // Ditolak, bukan diam-diam jatuh ke urutan lain: pengunjung yang meminta
    // "terdekat" lalu menerima daftar terbaru tidak punya cara tahu urutannya
    // salah, dan akan mengira kos terdekatnya memang sejauh itu.
    if (data.sort === 'distance' && !adaTitikPengunjung) {
      ctx.addIssue({
        code: 'custom',
        path: ['sort'],
        message: 'sort=distance membutuhkan nearLat dan nearLng',
      })
    }
  })

export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>
