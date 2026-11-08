import { query, queryOne } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import type { ListUsersQuery, UpdateProfileInput } from './users.validator'

/**
 * Kolom profil yang boleh dibaca klien.
 *
 * Daftarnya eksplisit, tidak ada `SELECT *`, supaya kolom sensitif seperti
 * password_hash tidak ikut terkirim hanya karena ada penambahan kolom baru.
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
    // ditentukan oleh input pengguna.
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
    if (data.avatarUrl !== undefined) {
      params.push(data.avatarUrl)
      assignments.push(`avatar_url = $${params.length}`)
    }

    params.push(userId)

    // updated_at tidak diisi di sini: trigger di database yang mengurusnya.
    const rows = await query<ProfileRow>(
      `UPDATE users
       SET ${assignments.join(', ')}
       WHERE id = $${params.length} AND deleted_at IS NULL
       RETURNING ${PROFILE_COLUMNS}`,
      params,
    )

    if (rows.length === 0) {
      throw new HttpError(404, 'Pengguna tidak ditemukan')
    }

    return rows[0]
  },

  async listUsers(params: ListUsersQuery) {
    const conditions: string[] = ['deleted_at IS NULL']
    const values: unknown[] = []

    if (params.role) {
      values.push(params.role)
      conditions.push(`role = $${values.length}`)
    }

    if (params.search) {
      values.push(`%${params.search}%`)
      conditions.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM users ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const users = await query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS}
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    const total = countRow?.total ?? 0

    return {
      users,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    }
  },
}
