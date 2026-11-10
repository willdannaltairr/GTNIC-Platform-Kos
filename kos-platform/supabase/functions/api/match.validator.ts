import { z } from 'npm:zod@3'

/**
 * Preferensi pencarian KosMatch.
 *
 * Semuanya opsional, dan itu disengaja: faktor yang tidak diisi tidak dihitung
 * sama sekali, bukan diberi nilai nol. Angka nol akan menyeret skor total ke
 * bawah untuk hal yang sebenarnya tidak pernah diminta penggunanya, dan itu
 * membuat persentase kecocokan berbohong tanpa terlihat.
 */

const latitude = z.coerce.number().min(-90, 'Lintang minimal -90').max(90, 'Lintang maksimal 90')
const longitude = z.coerce.number().min(-180, 'Bujur minimal -180').max(180, 'Bujur maksimal 180')

export const matchQuerySchema = z
  .object({
    /** Anggaran bulanan. Harga di atas batas toleransi tidak diikutkan. */
    maxPrice: z.coerce
      .number()
      .int('Anggaran harus bilangan bulat')
      .positive('Anggaran harus lebih dari nol')
      .max(1_000_000_000, 'Anggaran terlalu besar')
      .optional(),

    /** Titik acuan yang jaraknya diukur: kampus, kantor, atau lokasi sekarang. */
    nearLat: latitude.optional(),
    nearLng: longitude.optional(),

    /** Fasilitas yang diminta, dipisah koma memakai slug dari /places/facilities. */
    facilities: z.string().trim().max(400, 'Daftar fasilitas terlalu panjang').optional(),

    bathroomType: z.enum(['private', 'shared']).optional(),

    /** Kapasitas penghuni yang dibutuhkan, mis. 2 untuk kamar berdua. */
    minOccupants: z.coerce
      .number()
      .int('Kapasitas harus bilangan bulat')
      .min(1, 'Kapasitas minimal 1 orang')
      .max(10, 'Kapasitas maksimal 10 orang')
      .optional(),

    city: z.string().trim().min(1).max(80).optional(),

    /** Jenis kos yang dicari; 'campur' berarti kos itu sendiri bercampur. */
    genderPolicy: z.enum(['putra', 'putri', 'campur']).optional(),

    limit: z.coerce.number().int().min(1).max(24).default(12),
  })
  .superRefine((data, ctx) => {
    // Satu koordinat tanpa pasangannya hampir pasti salah ketik. Kalau
    // dibiarkan, faktor lokasi akan dilewati diam-diam dan penggunanya
    // menyangka jaraknya sudah dihitung.
    if ((data.nearLat === undefined) !== (data.nearLng === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: [data.nearLat === undefined ? 'nearLat' : 'nearLng'],
        message: 'nearLat dan nearLng harus dikirim bersamaan',
      })
    }
  })

export type MatchQuery = z.infer<typeof matchQuerySchema>

/**
 * Daftar slug fasilitas yang diminta.
 *
 * Ditulis sebagai fungsi terpisah supaya service dan perhitungan skor memakai
 * daftar yang sama persis; dua penafsiran atas satu string koma akan membuat
 * jumlah "fasilitas yang Anda minta" berbeda antara alasan dan skornya.
 */
export const daftarFasilitasDiminta = (facilities?: string): string[] =>
  (facilities ?? '')
    .split(',')
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20)
