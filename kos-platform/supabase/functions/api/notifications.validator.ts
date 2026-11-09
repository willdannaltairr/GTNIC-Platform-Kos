import { z } from 'npm:zod@3'

/**
 * Notifikasi pengguna.
 *
 * Jenisnya dibatasi ke nilai yang benar-benar dikirim modul lain. Daftar ini
 * sengaja tidak disamakan dengan seluruh isi enum di database: jenis yang tidak
 * pernah dibuat hanya menambah jalur yang tidak teruji.
 */
export const NOTIFICATION_KINDS = [
  'NEW_BOOKING',
  'BOOKING_APPROVED',
  'BOOKING_REJECTED',
  'NEW_INVOICE',
  'INVOICE_DUE_SOON',
  'PAYMENT_SUCCESS',
  'PAYMENT_RECEIVED',
  'CONTRACT_EXPIRING',
  'CONTRACT_UPDATED',
  'MAINTENANCE_UPDATED',
  'NEW_MAINTENANCE_REPORT',
  'AVAILABILITY_REMINDER',
  'PROPERTY_VERIFIED',
  'NEW_MESSAGE',
] as const

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const listNotificationsQuerySchema = z.object({
  /** Hanya yang belum dibaca, dipakai lonceng notifikasi. */
  belumDibaca: z
    .enum(['true', 'false'], { message: 'belumDibaca harus "true" atau "false"' })
    .default('false')
    .transform((nilai) => nilai === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const notificationIdParam = (nilai: string): string =>
  z.string().uuid('ID notifikasi tidak valid').parse(nilai)

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
