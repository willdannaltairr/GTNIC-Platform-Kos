import { z } from 'zod'

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS (Zod)
// ════════════════════════════════════════════════════════════════════════════

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['TENANT', 'OWNER'], { required_error: 'Pilih peran pengguna (tenant atau owner)' }),
})

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const propertySchema = z.object({
  name: z.string().min(2, 'Nama properti minimal 2 karakter'),
  slug: z.string().min(2, 'Slug minimal 2 karakter'),
  description: z.string().optional(),
  address: z.string().min(2, 'Alamat wajib diisi'),
  province: z.string().min(1, 'Provinsi wajib diisi'),
  city: z.string().min(1, 'Kota wajib diisi'),
  district: z.string().min(1, 'Kecamatan wajib diisi'),
  subdistrict: z.string().optional(),
  postal_code: z.string().optional(),
  property_type: z.enum(['KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR']),
  gender_policy: z.string().default('campur'),
  total_rooms: z.number().int().nonnegative().default(0),
  verification_status: z
    .enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'])
    .default('PENDING'),
  publication_status: z
    .enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'])
    .default('DRAFT'),
})

export const roomSchema = z.object({
  property_id: z.string().uuid('Properti tidak valid'),
  room_number: z.string().min(1, 'Nomor kamar wajib diisi'),
  room_name: z.string().optional(),
  description: z.string().optional(),
  room_type: z.string().default('reguler'),
  monthly_price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Format harga tidak valid'),
  maximum_occupants: z.number().int().positive().default(1),
  bathroom_type: z.string().default('shared'),
  floor_number: z.number().int().optional(),
  availability_status: z
    .enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'])
    .default('AVAILABLE'),
})

export const bookingSchema = z.object({
  property_id: z.string().uuid('Properti tidak valid'),
  room_id: z.string().uuid('Kamar tidak valid'),
  start_date: z.string().datetime('Tanggal mulai tidak valid'),
  end_date: z.string().datetime('Tanggal selesai tidak valid').optional(),
  tenant_notes: z.string().optional(),
})

// ════════════════════════════════════════════════════════════════════════════
// INFERRED TYPES
// ════════════════════════════════════════════════════════════════════════════

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PropertyInput = z.infer<typeof propertySchema>
export type RoomInput = z.infer<typeof roomSchema>
export type BookingInput = z.infer<typeof bookingSchema>

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE ENVELOPES
// ════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
