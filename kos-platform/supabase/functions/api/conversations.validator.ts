import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul percakapan.
 *
 * Batas panjang pesannya 2000 karakter, sama seperti catatan laporan perbaikan:
 * cukup untuk menjelaskan keadaan kamar atau menawar harga, dan cukup pendek
 * sehingga satu pesan masih terbaca sebagai pesan, bukan sebagai surat.
 */

export const mulaiPercakapanSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
  /**
   * Pesan pertama boleh ikut dikirim sekaligus, supaya penghuni yang menekan
   * "Hubungi pemilik" dari halaman kos tidak perlu mengetik dua kali.
   */
  pesan: z
    .string()
    .trim()
    .min(1, 'Pesan tidak boleh kosong')
    .max(2000, 'Pesan maksimal 2000 karakter')
    .optional(),
})

export const kirimPesanSchema = z.object({
  pesan: z
    .string()
    .trim()
    .min(1, 'Pesan tidak boleh kosong')
    .max(2000, 'Pesan maksimal 2000 karakter'),
})

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const percakapanIdParam = (nilai: string): string =>
  z.string().uuid('ID percakapan tidak valid').parse(nilai)

export type MulaiPercakapanInput = z.infer<typeof mulaiPercakapanSchema>
export type KirimPesanInput = z.infer<typeof kirimPesanSchema>
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
