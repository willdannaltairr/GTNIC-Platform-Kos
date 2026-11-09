import { z } from 'zod'

/**
 * Validasi untuk modul pembayaran.
 *
 * Nilai status di sini disalin dari tipe database. Yang menetapkannya bukan
 * manusia: status hanya berubah dari webhook penyedia pembayaran setelah
 * tanda tangannya diperiksa, atau dari penyapu kedaluwarsa untuk pembayaran
 * yang tidak pernah diselesaikan.
 */

export const PAYMENT_STATUS = [
  'PENDING',
  'SUCCESS',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const

/** Lama satu pembayaran boleh diselesaikan sebelum dianggap kedaluwarsa. */
export const PEMBAYARAN_BERLAKU_JAM = 24

export const createPaymentSchema = z
  .object({
    /**
     * Pembayaran melekat pada tagihan atau pada booking, tidak pernah pada
     * keduanya. Tagihan dipakai untuk sewa berjalan, sedangkan booking dipakai
     * untuk pembayaran pertama yang belum sempat ditagihkan: deposit dan bulan
     * pertama, yang menandai booking itu dikonfirmasi.
     */
    invoiceId: z.string().uuid('ID tagihan tidak valid').optional(),
    bookingId: z.string().uuid('ID booking tidak valid').optional(),
    /**
     * Hanya untuk tagihan: pembayaran sebagian diperbolehkan. Untuk booking
     * tidak, karena jumlahnya sudah disepakati sejak pengajuan.
     */
    amount: z.coerce
      .number()
      .positive('Jumlah pembayaran harus lebih dari 0')
      .max(999_999_999_999, 'Jumlah pembayaran terlalu besar')
      .optional(),
    /** Kanal yang dipilih penghuni, mis. bank_transfer atau echannel. */
    method: z.string().trim().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.invoiceId && !data.bookingId) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoiceId'],
        message: 'Sebutkan tagihan atau booking yang dibayar',
      })
    }

    if (data.invoiceId && data.bookingId) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoiceId'],
        message: 'Pilih salah satu: tagihan atau booking, bukan keduanya',
      })
    }
  })

export const listPaymentsQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUS).optional(),
  invoiceId: z.string().uuid('ID tagihan tidak valid').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * Notifikasi dari penyedia pembayaran.
 *
 * Bentuknya sengaja longgar: yang menentukan bukan lengkap atau tidaknya
 * kolom di sini, melainkan tanda tangannya. Permintaan tanpa tanda tangan yang
 * sah ditolak sebelum satu pun nilainya dipakai.
 */
export const webhookSchema = z.object({
  order_id: z.string().min(1, 'order_id wajib ada'),
  status_code: z.string().min(1, 'status_code wajib ada'),
  gross_amount: z.string().min(1, 'gross_amount wajib ada'),
  signature_key: z.string().min(1, 'signature_key wajib ada'),
  transaction_status: z.string().min(1, 'transaction_status wajib ada'),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
  settlement_time: z.string().optional(),
})

export const paymentIdParam = (nilai: string): string =>
  z.string().uuid('ID pembayaran tidak valid').parse(nilai)

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>
export type WebhookInput = z.infer<typeof webhookSchema>
