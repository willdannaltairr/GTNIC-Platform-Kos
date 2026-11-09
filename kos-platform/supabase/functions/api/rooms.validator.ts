import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul kamar.
 *
 * Semua filter di sini benar-benar diterapkan pada query database, bukan
 * hanya disaring di frontend. Nilainya selalu lewat parameter, tidak ada yang
 * disisipkan ke dalam teks SQL.
 */

/** Nilai sah kolom `availability_status` (enum RoomAvailabilityStatus). */
export const ROOM_AVAILABILITY = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'MAINTENANCE',
  'INACTIVE',
] as const

/** Nilai sah kolom `bathroom_type`. */
export const BATHROOM_TYPES = ['private', 'shared'] as const

export const listRoomsQuerySchema = z.object({
  /** Batasi ke satu properti tertentu. */
  propertyId: z.string().uuid('ID properti tidak valid').optional(),
  /** Batasi ke properti dengan slug tertentu, dipakai halaman detail kos. */
  slug: z.string().trim().min(1).optional(),
  availabilityStatus: z.enum(ROOM_AVAILABILITY).optional(),
  bathroomType: z.enum(BATHROOM_TYPES).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['number_asc', 'price_asc', 'price_desc', 'newest']).default('number_asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * Isian kamar baru.
 *
 * `roomNumber` sengaja tidak dibatasi hanya angka: banyak kos memakai nomor
 * seperti "A1" atau "3B", dan menolaknya hanya memaksa pemilik menuliskan
 * sesuatu yang bukan nomor kamarnya.
 */
export const createRoomSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
  roomNumber: z
    .string()
    .trim()
    .min(1, 'Nomor kamar wajib diisi')
    .max(20, 'Nomor kamar maksimal 20 karakter'),
  roomName: z.string().trim().min(1).max(100, 'Nama kamar maksimal 100 karakter').optional(),
  description: z.string().trim().max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  roomType: z.string().trim().min(1).max(50).default('reguler'),
  areaWidth: z.coerce.number().positive('Lebar harus lebih dari 0').max(1000).optional(),
  areaLength: z.coerce.number().positive('Panjang harus lebih dari 0').max(1000).optional(),
  monthlyPrice: z.coerce
    .number()
    .positive('Harga sewa harus lebih dari 0')
    .max(999_999_999_999, 'Harga sewa terlalu besar'),
  maximumOccupants: z.coerce.number().int().min(1).max(20).default(1),
  bathroomType: z.enum(BATHROOM_TYPES).default('shared'),
  floorNumber: z.coerce.number().int().min(-5).max(200).optional(),
  availabilityStatus: z.enum(ROOM_AVAILABILITY).default('AVAILABLE'),
  /** Fasilitas kamar, dirujuk lewat id di tabel `facilities`. */
  facilityIds: z.array(z.string().uuid()).max(30, 'Maksimal 30 fasilitas per kamar').optional(),
})

/**
 * Perubahan kamar.
 *
 * Ditulis ulang tanpa nilai default, bukan `.partial()` dari skema di atas:
 * `partial()` membuat kolom yang tidak dikirim tetap terisi nilai default,
 * sehingga permintaan yang hanya ingin mengubah harga ikut menimpa nomor kamar
 * dan status ketersediaannya.
 *
 * `propertyId` tidak bisa diubah: memindahkan kamar ke properti lain sama
 * dengan membuat kamar baru, dan riwayat sewa yang menunjuk kamar itu jadi
 * menyesatkan.
 */
export const updateRoomSchema = z
  .object({
    roomNumber: z.string().trim().min(1, 'Nomor kamar wajib diisi').max(20).optional(),
    roomName: z.string().trim().min(1).max(100).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    roomType: z.string().trim().min(1).max(50).optional(),
    areaWidth: z.coerce.number().positive().max(1000).nullable().optional(),
    areaLength: z.coerce.number().positive().max(1000).nullable().optional(),
    monthlyPrice: z.coerce.number().positive('Harga sewa harus lebih dari 0').optional(),
    maximumOccupants: z.coerce.number().int().min(1).max(20).optional(),
    bathroomType: z.enum(BATHROOM_TYPES).optional(),
    floorNumber: z.coerce.number().int().min(-5).max(200).nullable().optional(),
    availabilityStatus: z.enum(ROOM_AVAILABILITY).optional(),
    facilityIds: z.array(z.string().uuid()).max(30).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Kirim minimal satu field untuk diperbarui',
  })

export const uploadPhotoMetaSchema = z.object({
  altText: z.string().trim().max(200, 'Teks alternatif maksimal 200 karakter').optional(),
  /**
   * Ditulis sebagai transformasi dari string, bukan `z.coerce.boolean()`.
   *
   * `coerce.boolean()` memakai aturan truthiness JavaScript: string apa pun
   * yang tidak kosong menjadi true, termasuk "false". Akibatnya
   * `?isPrimary=false` justru diminta sebagai foto utama, dan foto yang sudah
   * ada tergeser dari urutan 0 tanpa diminta.
   */
  isPrimary: z
    .enum(['true', 'false'], { message: 'isPrimary harus "true" atau "false"' })
    .default('false')
    .transform((nilai) => nilai === 'true'),
})

export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>
export type UploadPhotoMeta = z.infer<typeof uploadPhotoMetaSchema>
