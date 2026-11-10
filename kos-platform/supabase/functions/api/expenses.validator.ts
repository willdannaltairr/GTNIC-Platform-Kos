import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul keuangan pemilik.
 *
 * Kategori pengeluaran adalah daftar tertutup, dengan alasan yang sama seperti
 * kategori laporan perbaikan: yang diketik sendiri akan menghasilkan
 * "listrik", "Listrik", dan "token listrik" pada kolom yang sama, sehingga
 * tidak ada cara menjumlahkan berapa biaya listrik properti ini setahun.
 * Yang tidak masuk kategori mana pun tetap punya tempat di LAINNYA.
 */

export const EXPENSE_CATEGORY = [
  'LISTRIK_AIR',
  'INTERNET',
  'PERBAIKAN',
  'PERABOT',
  'KEBERSIHAN',
  'PAJAK',
  'GAJI',
  'LAINNYA',
] as const

/** Sebutan tiap kategori dalam bahasa yang bisa dibaca. */
export const LABEL_KATEGORI_BIAYA: Record<string, string> = {
  LISTRIK_AIR: 'Listrik, air, dan gas',
  INTERNET: 'Internet',
  PERBAIKAN: 'Perbaikan dan renovasi',
  PERABOT: 'Perabot dan perlengkapan',
  KEBERSIHAN: 'Kebersihan dan sampah',
  PAJAK: 'Pajak dan retribusi',
  GAJI: 'Gaji penjaga',
  LAINNYA: 'Lainnya',
}

export const createExpenseSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
  category: z.enum(EXPENSE_CATEGORY, {
    message: `Kategori harus salah satu dari: ${EXPENSE_CATEGORY.join(', ')}`,
  }),
  amount: z.coerce
    .number({ message: 'Jumlah harus berupa angka' })
    .int('Jumlah harus bilangan bulat rupiah')
    .min(1, 'Jumlah harus lebih dari nol')
    .max(999_999_999_999, 'Jumlah terlalu besar'),
  description: z.string().trim().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
  /**
   * Tanggal pengeluaran. Kalau kosong, hari ini dipakai.
   *
   * Menerima tanggal ISO lengkap, bukan hanya tanggal, karena sebagian
   * pengeluaran dicatat dari struk yang jamnya ikut tercetak.
   */
  date: z
    .string()
    .datetime({ offset: true, message: 'Tanggal harus berupa tanggal yang sah' })
    .optional(),
})

/**
 * Perubahan pengeluaran.
 *
 * Bentuknya sama dengan pembuatannya, termasuk propertinya: pengeluaran yang
 * tercatat di properti yang salah harus bisa dipindahkan, dan itu lebih
 * berguna daripada menghapus lalu mencatat ulang.
 */
export const updateExpenseSchema = createExpenseSchema.partial()

/**
 * Daftar pengeluaran.
 *
 * `from`/`to` membatasi rentang tanggal, dipakai halaman keuangan saat
 * menampilkan satu bulan tertentu.
 */
export const listExpensesQuerySchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid').optional(),
  category: z.enum(EXPENSE_CATEGORY).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * Rentang ringkasan keuangan.
 *
 * Batasnya 24 bulan: lebih panjang dari itu tidak lagi menjawab pertanyaan
 * "bagaimana bulan ini", dan grafiknya sudah tidak terbaca di layar mana pun.
 */
export const ringkasanKeuanganQuerySchema = z.object({
  bulan: z.coerce.number().int().min(1).max(24).default(6),
})

export const expenseIdParam = (nilai: string): string =>
  z.string().uuid('ID pengeluaran tidak valid').parse(nilai)

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>
export type RingkasanKeuanganQuery = z.infer<typeof ringkasanKeuanganQuerySchema>
