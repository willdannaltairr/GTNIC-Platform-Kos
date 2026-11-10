import { z } from 'npm:zod@3'

/**
 * Query analitik pemilik kos.
 *
 * `bulan` menentukan panjang deret bulanan yang dihitung. Batas bawahnya tiga
 * karena tren tidak terbaca dari satu atau dua titik, dan batas atasnya dua
 * belas karena satu tahun sudah cukup untuk melihat pola musiman tanpa membuat
 * grafiknya berdesakan sampai tidak terbaca.
 *
 * Deretnya selalu berakhir di bulan berjalan, bukan di rentang bebas: pertanyaan
 * yang dijawab halaman ini adalah "bagaimana keadaan saya sekarang", bukan
 * "bagaimana keadaan saya pada rentang tertentu di masa lalu".
 */
export const analyticsQuerySchema = z.object({
  bulan: z.coerce
    .number()
    .int('Jumlah bulan harus bilangan bulat')
    .min(3, 'Minimal 3 bulan')
    .max(12, 'Maksimal 12 bulan')
    .default(6),
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
