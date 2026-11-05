import { z } from 'zod'

export const updateProfileSchema = z
  .object({
    fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').optional(),
    phoneNumber: z
      .string()
      .min(8, 'Nomor telepon minimal 8 karakter')
      .max(20, 'Nomor telepon maksimal 20 karakter')
      .optional(),
    avatarUrl: z.string().url('URL avatar tidak valid').optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Kirim minimal satu field untuk diperbarui',
  })

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  role: z.enum(['TENANT', 'OWNER', 'ADMIN']).optional(),
  search: z.string().min(1, 'Kata kunci minimal 1 karakter').optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
