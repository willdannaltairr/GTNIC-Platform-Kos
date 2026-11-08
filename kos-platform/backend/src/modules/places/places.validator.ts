import { z } from 'zod'

/**
 * Validasi untuk modul places (acuan peta lokasi).
 *
 * Modul ini hanya membaca: daftar kampus dan daerah beserta jumlah kos di
 * sekitarnya. Tidak ada endpoint tulis, isinya data acuan yang diisi lewat
 * seed, bukan oleh pengguna aplikasi.
 */

/** Jari-jari bawaan saat mencari kos di sekitar kampus. */
export const DEFAULT_RADIUS_KM = 5

/** Titik koordinat pemanggil, dipakai untuk menghitung jarak ke kampus. */
const latitude = z.coerce.number().min(-90, 'Lintang minimal -90').max(90, 'Lintang maksimal 90')
const longitude = z.coerce.number().min(-180, 'Bujur minimal -180').max(180, 'Bujur maksimal 180')

/**
 * Query daftar kampus.
 *
 * `radiusKm` membatasi jarak yang dihitung untuk kolom `propertyCount`: berapa
 * kos terverifikasi yang berada dalam radius itu dari kampus. Nilainya dibatasi
 * 50 km karena di atas itu hampir seluruh kos di pulau yang sama ikut terhitung,
 * dan angkanya berhenti bermakna sebagai "kos sekitar kampus ini".
 */
export const listCampusesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(12),
    radiusKm: z.coerce
      .number()
      .nonnegative('Radius tidak boleh negatif')
      .max(50, 'Radius maksimal 50 km')
      .default(DEFAULT_RADIUS_KM),
    nearLat: latitude.optional(),
    nearLng: longitude.optional(),
  })
  .superRefine((data, ctx) => {
    // Satu koordinat tanpa pasangannya hampir pasti salah ketik. Dibiarkan
    // lewat, permintaannya tetap dijawab 200 dengan `distanceKm` null, dan
    // pemanggil tidak punya cara tahu jaraknya tidak jadi dihitung.
    if ((data.nearLat === undefined) !== (data.nearLng === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: [data.nearLat === undefined ? 'nearLat' : 'nearLng'],
        message: 'nearLat dan nearLng harus dikirim bersamaan',
      })
    }
  })

/**
 * Query daftar daerah.
 *
 * Tidak ada filter kota atau tipe: beranda menampilkan satu daftar area
 * terpopuler dari seluruh Indonesia, dan penyaringan lebih lanjut dilakukan di
 * frontend atas hasil yang sudah urut.
 */
export const listRegionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export type ListCampusesQuery = z.infer<typeof listCampusesQuerySchema>
export type ListRegionsQuery = z.infer<typeof listRegionsQuerySchema>
