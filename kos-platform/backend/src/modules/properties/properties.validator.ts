import { z } from 'zod'

/**
 * Query daftar properti publik.
 *
 * Semua filter di sini benar-benar diterapkan pada query database —
 * bukan hanya di frontend.
 */
export const listPropertiesQuerySchema = z.object({
  q: z.string().trim().min(1, 'Kata kunci minimal 1 karakter').optional(),
  city: z.string().trim().min(1).optional(),
  district: z.string().trim().min(1).optional(),
  type: z.enum(['KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR']).optional(),
  bathroomType: z.enum(['private', 'shared']).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  facilities: z.string().trim().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(9),
})

export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>
