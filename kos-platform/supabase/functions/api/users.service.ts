import { query, queryOne } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import type { UpdateProfileInput } from './users.validator.ts'

/**
 * Profil pengguna.
 *
 * Daftar kolomnya eksplisit, tidak ada `SELECT *`, supaya kolom sensitif
 * seperti `password_hash` tidak ikut terkirim hanya karena ada penambahan
 * kolom baru di kemudian hari.
 *
 * Nama kolomnya tetap bentuk snake_case, sama seperti yang dikirim backend
 * lama: halaman profil dan header membaca `full_name`, `email_verified_at`,
 * dan seterusnya dengan nama itu.
 */
const PROFILE_COLUMNS = `
  id, full_name, email, phone_number, avatar_url, role, account_status,
  email_verified_at, last_login_at, created_at
`

export interface ProfileRow {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  avatar_url: string | null
  role: string
  account_status: string
  email_verified_at: Date | null
  last_login_at: Date | null
  created_at: Date
}

export const usersService = {
  async getProfile(userId: string): Promise<ProfileRow> {
    const user = await queryOne<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    )

    if (!user) {
      throw new HttpError(404, 'Pengguna tidak ditemukan')
    }

    return user
  },

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<ProfileRow> {
    // Hanya kolom yang dikirim yang diubah. Daftar pemetaan ditulis tetap
    // (bukan dirangkai dari nama field) supaya nama kolom tidak pernah bisa
    // ditentukan oleh isi permintaan.
    const assignments: string[] = []
    const params: unknown[] = []

    if (data.fullName !== undefined) {
      params.push(data.fullName)
      assignments.push(`full_name = $${params.length}`)
    }
    if (data.phoneNumber !== undefined) {
      params.push(data.phoneNumber)
      assignments.push(`phone_number = $${params.length}`)
    }

    if (assignments.length === 0) {
      return this.getProfile(userId)
    }

    params.push(userId)

    const row = await queryOne<ProfileRow>(
      `UPDATE users SET ${assignments.join(', ')}, updated_at = now()
       WHERE id = $${params.length} AND deleted_at IS NULL
       RETURNING ${PROFILE_COLUMNS}`,
      params,
    )

    if (!row) {
      throw new HttpError(404, 'Pengguna tidak ditemukan')
    }

    return row
  },

  /** Daftar pengguna untuk panel admin. */
  async list(params: { q?: string; role?: string; page: number; limit: number }) {
    const kondisi: string[] = ['deleted_at IS NULL']
    const values: unknown[] = []

    if (params.role) {
      values.push(params.role)
      kondisi.push(`role = $${values.length}`)
    }

    if (params.q) {
      values.push(`%${params.q}%`)
      kondisi.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM users ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    const total = hitung?.total ?? 0

    return {
      items: rows,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },
}
