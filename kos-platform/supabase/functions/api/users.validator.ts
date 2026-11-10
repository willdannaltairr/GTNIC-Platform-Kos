import { z } from 'npm:zod@3'

/**
 * Peran yang boleh dipilih saat mendaftar.
 *
 * ADMIN sengaja tidak ada di sini dan tidak akan pernah ada: siapa pun yang
 * bisa menulis "ADMIN" di badan permintaan akan menjadi admin. Akun admin
 * dibuat langsung di database oleh pengelola, bukan lewat halaman pendaftaran
 * yang terbuka untuk umum.
 */
export const PERAN_PENDAFTARAN = ['TENANT', 'OWNER'] as const

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120).optional(),
  phoneNumber: z
    .string()
    .trim()
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .nullable()
    .optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
