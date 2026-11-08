import { query, queryOne, withTransaction } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import type { AuthUser } from '../../middleware/auth'
import type {
  ListActivityQuery,
  ListAdminPropertiesQuery,
  ListAdminUsersQuery,
  SetUserStatusInput,
  VerifyPropertyInput,
} from './admin.validator'

/**
 * Data untuk panel admin.
 *
 * Kolom yang dikembalikan selalu eksplisit, tidak ada `SELECT *`. Panel admin
 * adalah tempat yang paling berbahaya bila kolom baru bocor tanpa sengaja
 * terkirim, karena halaman ini melihat seluruh pengguna platform, termasuk
 * kolom sensitif yang mungkin ditambahkan nanti.
 */

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const tanggal = (nilai: Date | null): string | null =>
  nilai === null ? null : nilai.toISOString()

/** Kolom pengguna yang boleh dibaca admin. Tanpa `password_hash`. */
const KOLOM_PENGGUNA = `
  id, full_name, email, phone_number, role, account_status,
  email_verified_at, last_login_at, created_at
`

type PenggunaRow = {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  role: string
  account_status: string
  email_verified_at: Date | null
  last_login_at: Date | null
  created_at: Date
}

const toPengguna = (row: PenggunaRow) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phoneNumber: row.phone_number,
  role: row.role,
  accountStatus: row.account_status,
  emailVerifiedAt: tanggal(row.email_verified_at),
  lastLoginAt: tanggal(row.last_login_at),
  createdAt: tanggal(row.created_at),
})

export const adminService = {
  /**
   * Ringkasan angka untuk kartu dashboard admin.
   *
   * Seluruh hitungannya ada dalam satu query dengan subquery, bukan sepuluh
   * permintaan terpisah: dashboard dibuka paling sering oleh admin, dan
   * sepuluh perjalanan ke database untuk satu layar adalah beban yang tidak
   * perlu.
   */
  async ringkasan() {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT
         (SELECT count(*) FROM users WHERE deleted_at IS NULL) AS total_pengguna,
         (SELECT count(*) FROM users WHERE deleted_at IS NULL AND account_status = 'ACTIVE') AS pengguna_aktif,
         (SELECT count(*) FROM users WHERE deleted_at IS NULL AND role = 'OWNER') AS total_pemilik,
         (SELECT count(*) FROM users u
           LEFT JOIN owner_profiles op ON op.user_id = u.id
           WHERE u.deleted_at IS NULL AND u.role = 'OWNER' AND op.verified_at IS NULL) AS pemilik_belum_terverifikasi,
         (SELECT count(*) FROM properties WHERE deleted_at IS NULL) AS total_properti,
         (SELECT count(*) FROM properties
           WHERE deleted_at IS NULL AND verification_status IN ('PENDING', 'UNDER_REVIEW')) AS properti_menunggu,
         (SELECT count(*) FROM bookings) AS total_booking,
         (SELECT count(*) FROM bookings WHERE created_at >= date_trunc('month', now())) AS booking_bulan_ini,
         (SELECT count(*) FROM invoices WHERE invoice_status = 'PAID') AS total_transaksi,
         (SELECT COALESCE(sum(total_amount), 0) FROM invoices WHERE invoice_status = 'PAID') AS nilai_transaksi`,
    )

    const r = row ?? {}

    return {
      totalPengguna: angka(r.total_pengguna),
      penggunaAktif: angka(r.pengguna_aktif),
      totalPemilik: angka(r.total_pemilik),
      pemilikBelumTerverifikasi: angka(r.pemilik_belum_terverifikasi),
      totalProperti: angka(r.total_properti),
      propertiMenungguVerifikasi: angka(r.properti_menunggu),
      totalBooking: angka(r.total_booking),
      bookingBulanIni: angka(r.booking_bulan_ini),
      totalTransaksi: angka(r.total_transaksi),
      nilaiTransaksi: angka(r.nilai_transaksi),
    }
  },

  /**
   * Seluruh properti, termasuk draf dan yang belum terverifikasi.
   *
   * Inilah bedanya dengan daftar publik. Admin perlu melihat properti yang
   * barusan didaftarkan pemilik dan yang menunggu ditinjau, dan justru
   * properti itu yang tidak akan pernah muncul di daftar publik.
   */
  async listProperties(params: ListAdminPropertiesQuery) {
    const conditions: string[] = ['p.deleted_at IS NULL']
    const values: unknown[] = []

    if (params.status) {
      values.push(params.status)
      conditions.push(`p.verification_status = $${values.length}`)
    }

    if (params.q) {
      values.push(`%${params.q}%`)
      conditions.push(`(p.name ILIKE $${values.length} OR o.full_name ILIKE $${values.length})`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM properties p
       JOIN users o ON o.id = p.owner_id
       ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit

    const rows = await query<Record<string, unknown>>(
      `SELECT
         p.id, p.name, p.slug, p.city, p.district, p.verification_status,
         p.publication_status, p.created_at, p.updated_at,
         o.id AS owner_id, o.full_name AS owner_name, o.email AS owner_email,
         COALESCE(k.total_kamar, 0)::int AS total_kamar,
         img.image_url AS primary_photo_url
       FROM properties p
       JOIN users o ON o.id = p.owner_id
       LEFT JOIN (
         SELECT property_id, count(*) AS total_kamar FROM rooms GROUP BY property_id
       ) k ON k.property_id = p.id
       LEFT JOIN LATERAL (
         SELECT pi.image_url FROM property_images pi
         WHERE pi.property_id = p.id
         ORDER BY pi.display_order ASC LIMIT 1
       ) img ON true
       ${where}
       ORDER BY
         CASE p.verification_status WHEN 'UNDER_REVIEW' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
         p.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, params.limit, offset],
    )

    const total = countRow?.total ?? 0

    return {
      items: rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        city: row.city as string,
        district: row.district as string,
        verificationStatus: row.verification_status as string,
        publicationStatus: row.publication_status as string,
        ownerId: row.owner_id as string,
        ownerName: row.owner_name as string,
        ownerEmail: row.owner_email as string,
        totalRooms: angka(row.total_kamar),
        primaryPhotoUrl: (row.primary_photo_url as string | null) ?? null,
        createdAt: tanggal(row.created_at as Date | null),
        updatedAt: tanggal(row.updated_at as Date | null),
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /**
   * Tetapkan status verifikasi properti.
   *
   * Perubahan status dan catatan riwayatnya ditulis dalam satu transaksi.
   * Kalau riwayatnya terlewat, keputusan admin tidak bisa ditelusuri lagi, dan
   * pemilik yang mengajukan ulang tidak punya cara tahu apa yang pernah
   * ditolak dari propertinya.
   */
  async verifyProperty(admin: AuthUser, propertyId: string, input: VerifyPropertyInput) {
    return withTransaction(async (client) => {
      const rows = await client.query<{ verification_status: string }>(
        `SELECT verification_status FROM properties
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [propertyId],
      )

      const properti = rows[0]

      if (!properti) {
        throw new HttpError(404, 'Properti tidak ditemukan')
      }

      // Properti yang ditolak atau ditangguhkan langsung ditarik dari daftar
      // publik. Membiarkannya terbit berarti halaman pencarian tetap
      // menampilkan kos yang sudah dinyatakan tidak layak.
      const tarikDariPublik = input.status === 'REJECTED' || input.status === 'SUSPENDED'

      await client.query(
        `UPDATE properties
         SET verification_status = $2,
             publication_status = CASE WHEN $3 THEN 'UNPUBLISHED' ELSE publication_status END,
             updated_at = now()
         WHERE id = $1`,
        [propertyId, input.status, tarikDariPublik],
      )

      await client.query(
        `INSERT INTO property_verification_histories
           (property_id, admin_id, previous_status, new_status, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [propertyId, admin.userId, properti.verification_status, input.status, input.notes ?? null],
      )

      const hasil = await client.query<{
        id: string
        name: string
        verification_status: string
        publication_status: string
      }>(
        `SELECT id, name, verification_status, publication_status
         FROM properties WHERE id = $1`,
        [propertyId],
      )

      const row = hasil[0]

      return {
        id: row.id,
        name: row.name,
        verificationStatus: row.verification_status,
        publicationStatus: row.publication_status,
        previousStatus: properti.verification_status,
      }
    })
  },

  /** Daftar pengguna untuk admin. */
  async listUsers(params: ListAdminUsersQuery) {
    const conditions: string[] = ['deleted_at IS NULL']
    const values: unknown[] = []

    if (params.role) {
      values.push(params.role)
      conditions.push(`role = $${values.length}`)
    }

    if (params.status) {
      values.push(params.status)
      conditions.push(`account_status = $${values.length}`)
    }

    if (params.q) {
      values.push(`%${params.q}%`)
      conditions.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM users ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit

    const rows = await query<PenggunaRow>(
      `SELECT ${KOLOM_PENGGUNA}
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, params.limit, offset],
    )

    const total = countRow?.total ?? 0

    return {
      items: rows.map(toPengguna),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /**
   * Ubah status akun, beserta catatan auditnya.
   *
   * Admin tidak boleh mengubah status akun admin lain lewat endpoint ini.
   * Kalau boleh, satu akun admin yang diambil alih bisa menutup akses seluruh
   * admin lainnya, dan pemulihannya harus lewat database. Untuk akun admin,
   * jalurnya adalah pengelola platform di luar aplikasi ini.
   */
  async setUserStatus(admin: AuthUser, userId: string, input: SetUserStatusInput) {
    return withTransaction(async (client) => {
      const rows = await client.query<PenggunaRow & { password_hash: string | null }>(
        `SELECT ${KOLOM_PENGGUNA} FROM users
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [userId],
      )

      const pengguna = rows[0]

      if (!pengguna) {
        throw new HttpError(404, 'Pengguna tidak ditemukan')
      }

      if (pengguna.role === 'ADMIN') {
        throw new HttpError(
          400,
          'Status akun admin tidak bisa diubah dari sini. Hubungi pengelola platform.',
        )
      }

      await client.query(`UPDATE users SET account_status = $2, updated_at = now() WHERE id = $1`, [
        userId,
        input.status,
      ])

      // Hanya status dan alasannya yang dicatat. Tidak ada kata sandi, token,
      // atau isi profil di sini: log audit dibaca banyak orang dan disimpan
      // lama, jadi apa pun yang ditulis ke dalamnya harus aman bila bocor.
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
         VALUES ($1, $2, 'USER', $3, $4::jsonb, $5::jsonb)`,
        [
          admin.userId,
          'UBAH_STATUS_PENGGUNA',
          userId,
          JSON.stringify({ accountStatus: pengguna.account_status }),
          JSON.stringify({ accountStatus: input.status, reason: input.reason }),
        ],
      )

      const hasil = await client.query<PenggunaRow>(
        `SELECT ${KOLOM_PENGGUNA} FROM users WHERE id = $1`,
        [userId],
      )

      return toPengguna(hasil[0])
    })
  },

  /** Beberapa catatan audit terakhir beserta nama pelakunya. */
  async listActivity(params: ListActivityQuery) {
    const rows = await query<Record<string, unknown>>(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_values, a.created_at,
              u.full_name AS actor_name, u.email AS actor_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [params.limit],
    )

    return rows.map((row) => {
      const nilai = (row.new_values ?? {}) as Record<string, unknown>
      const alasan = typeof nilai.reason === 'string' ? nilai.reason : null

      return {
        id: row.id as string,
        action: row.action as string,
        entityType: row.entity_type as string,
        entityId: row.entity_id as string,
        actorName: (row.actor_name as string | null) ?? 'Sistem',
        actorEmail: (row.actor_email as string | null) ?? null,
        reason: alasan,
        createdAt: tanggal(row.created_at as Date | null),
      }
    })
  },
}
