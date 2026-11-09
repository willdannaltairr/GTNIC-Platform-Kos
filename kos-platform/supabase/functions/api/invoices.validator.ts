import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul tagihan.
 *
 * Nilai enum disalin dari tipe database, bukan dikarang di sini: menambah nilai
 * yang tidak ada di enum hanya akan ditolak PostgreSQL sebagai galat 500, bukan
 * sebagai permintaan yang salah bentuk.
 */

export const INVOICE_STATUS = [
  'DRAFT',
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const

/**
 * Satu baris tagihan.
 *
 * `costType` bebas diisi pemilik (sewa, listrik, air, internet, denda), dan
 * sengaja tidak dibatasi daftar tertutup: komponen biaya tiap kos berbeda-beda,
 * dan menolak nama yang tidak ada di daftar hanya memaksa pemilik menuliskan
 * sesuatu yang bukan namanya.
 */
export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Keterangan baris wajib diisi').max(200),
  quantity: z.coerce.number().positive('Jumlah harus lebih dari 0').max(1000).default(1),
  unitPrice: z.coerce
    .number()
    .min(0, 'Harga satuan tidak boleh negatif')
    .max(999_999_999_999, 'Harga satuan terlalu besar'),
  costType: z.string().trim().max(50).optional(),
})

export const createInvoiceSchema = z
  .object({
    /**
     * Tagihan selalu melekat pada salah satu dari keduanya, dan tidak pernah
     * pada keduanya sekaligus. Penghuni dan pemiliknya disalin dari sana,
     * sehingga tidak mungkin ada tagihan yang tertuju ke orang yang tidak
     * terlibat dalam sewa itu.
     */
    contractId: z.string().uuid('ID kontrak tidak valid').optional(),
    bookingId: z.string().uuid('ID booking tidak valid').optional(),
    billingPeriodStart: z
      .string()
      .datetime({ offset: true, message: 'Awal periode harus berupa tanggal yang sah' })
      .optional(),
    billingPeriodEnd: z
      .string()
      .datetime({ offset: true, message: 'Akhir periode harus berupa tanggal yang sah' })
      .optional(),
    /** Jatuh tempo; kalau kosong, 7 hari sejak tagihan dibuat. */
    dueDate: z
      .string()
      .datetime({ offset: true, message: 'Jatuh tempo harus berupa tanggal yang sah' })
      .optional(),
    items: z
      .array(invoiceItemSchema)
      .min(1, 'Tagihan harus punya minimal satu baris')
      .max(30, 'Maksimal 30 baris per tagihan'),
    discountAmount: z.coerce
      .number()
      .min(0, 'Potongan tidak boleh negatif')
      .max(999_999_999_999)
      .default(0),
    notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.contractId && !data.bookingId) {
      ctx.addIssue({
        code: 'custom',
        path: ['contractId'],
        message: 'Sebutkan kontrak atau booking yang ditagih',
      })
    }

    if (data.contractId && data.bookingId) {
      ctx.addIssue({
        code: 'custom',
        path: ['contractId'],
        message: 'Pilih salah satu: kontrak atau booking, bukan keduanya',
      })
    }

    if (
      data.billingPeriodStart &&
      data.billingPeriodEnd &&
      new Date(data.billingPeriodEnd) <= new Date(data.billingPeriodStart)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['billingPeriodEnd'],
        message: 'Akhir periode harus setelah awal periodenya',
      })
    }
  })

/**
 * Membatalkan tagihan.
 *
 * Beralasan, sama seperti penolakan di tempat lain: tagihan yang hilang tanpa
 * keterangan membuat penghuni yang sudah menyiapkan pembayarannya tidak tahu
 * apa yang terjadi.
 */
export const cancelInvoiceSchema = z.object({
  alasan: z.string().trim().min(5, 'Alasan minimal 5 karakter').max(500),
})

export const listInvoicesQuerySchema = z.object({
  status: z.enum(INVOICE_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const invoiceIdParam = (nilai: string): string =>
  z.string().uuid('ID tagihan tidak valid').parse(nilai)

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>
