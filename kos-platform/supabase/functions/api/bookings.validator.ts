import { z } from 'npm:zod@3'

/** Nilai sah kolom `status` (enum BookingStatus). */
export const BOOKING_STATUS = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
] as const

/** Status yang boleh ditetapkan pemilik properti. */
export const STATUS_PEMILIK = [
  'APPROVED',
  'REJECTED',
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
] as const

/**
 * Status yang boleh ditetapkan penghuni.
 *
 * Hanya pembatalan. Menyetujui pengajuan sendiri, atau menandai sewanya selesai
 * tanpa persetujuan pemilik, membuat status booking tidak lagi bisa dipercaya
 * sebagai catatan kesepakatan dua pihak.
 */
export const STATUS_PENGHUNI = ['CANCELLED'] as const

export const createBookingSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
  roomId: z.string().uuid('ID kamar tidak valid'),
  /** Tanggal masuk, dikirim sebagai ISO 8601. */
  startDate: z
    .string()
    .datetime({ offset: true, message: 'Tanggal masuk harus berupa tanggal yang sah' }),
  durasiBulan: z.coerce
    .number()
    .int()
    .min(1, 'Durasi sewa minimal 1 bulan')
    .max(24, 'Durasi sewa maksimal 24 bulan')
    .default(1),
  catatan: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
})

export const updateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUS),
  /** Alasan penolakan atau pembatalan, ditampilkan ke pihak lain. */
  alasan: z.string().trim().max(500, 'Alasan maksimal 500 karakter').optional(),
  catatanPemilik: z.string().trim().max(1000).optional(),
})

export const listBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const bookingIdParam = (nilai: string): string =>
  z.string().uuid('ID booking tidak valid').parse(nilai)

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>
