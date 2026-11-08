import { z } from 'zod'

/**
 * Validator endpoint admin.
 *
 * Seluruh nilai yang datang dari klien divalidasi di sini, termasuk yang
 * terlihat tidak berbahaya seperti parameter paginasi: nilai `limit` yang tidak
 * dibatasi membuat satu permintaan bisa menarik seluruh tabel sekaligus.
 */

export const listAdminPropertiesQuerySchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED']).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * Peninjauan properti oleh admin.
 *
 * `notes` wajib saat penolakan karena pemiliknya harus tahu apa yang perlu
 * diperbaiki. Penolakan tanpa alasan membuat pemilik menebak-nebak, dan
 * properti yang sama akan diajukan berulang tanpa pernah berubah.
 */
export const verifyPropertySchema = z
  .object({
    status: z.enum(['VERIFIED', 'UNDER_REVIEW', 'REJECTED', 'SUSPENDED']),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && (!data.notes || data.notes.length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'Catatan penolakan wajib diisi, minimal 10 karakter, supaya pemilik tahu apa yang harus diperbaiki',
      })
    }
  })

export const listAdminUsersQuerySchema = z.object({
  role: z.enum(['TENANT', 'OWNER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION']).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * Perubahan status akun.
 *
 * `reason` wajib: pemblokiran akun orang lain harus punya alasan yang tercatat.
 * Tanpa itu, pemilik akun yang diblokir tidak punya cara tahu apa yang terjadi,
 * dan admin berikutnya tidak punya cara tahu mengapa keputusan itu diambil.
 */
export const setUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter').max(500),
})

export const listActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type ListAdminPropertiesQuery = z.infer<typeof listAdminPropertiesQuerySchema>
export type VerifyPropertyInput = z.infer<typeof verifyPropertySchema>
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>
