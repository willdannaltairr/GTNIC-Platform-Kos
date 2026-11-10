import { query, queryOne } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import type { ListNotificationsQuery, NotificationKind } from './notifications.validator.ts'

export interface NotifikasiBaru {
  userId: string
  jenis: NotificationKind
  judul: string
  pesan: string
  /** Entitas terkait, supaya frontend bisa membuat tautan ke detailnya. */
  entityType?: string
  entityId?: string
}

export const notificationsService = {
  /**
   * Buat satu notifikasi.
   *
   * Dipakai modul lain lewat service, bukan lewat HTTP, karena pengirimnya
   * adalah sistem dan bukan pengguna. Kegagalannya sengaja tidak melempar ke
   * pemanggil: notifikasi adalah pelengkap, dan booking atau pembayaran yang
   * sudah berhasil tidak boleh dibatalkan hanya karena pemberitahuannya gagal.
   */
  async create(input: NotifikasiBaru): Promise<void> {
    try {
      await query(
        `INSERT INTO notifications
           (user_id, notification_type, title, message, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.userId,
          input.jenis,
          input.judul,
          input.pesan,
          input.entityType ?? null,
          input.entityId ?? null,
        ],
      )
    } catch (error) {
      console.error('[notifications] gagal menyimpan notifikasi:', (error as Error).message)
    }
  },

  async list(userId: string, params: ListNotificationsQuery) {
    const conditions = ['user_id = $1']
    const values: unknown[] = [userId]

    if (params.belumDibaca) conditions.push('is_read = false')

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number; belum: number }>(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE is_read = false)::int AS belum
       FROM notifications
       WHERE user_id = $1`,
      [userId],
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<{
      id: string
      notification_type: string
      title: string
      message: string
      related_entity_type: string | null
      related_entity_id: string | null
      is_read: boolean
      created_at: Date
    }>(
      `SELECT id, notification_type, title, message, related_entity_type,
              related_entity_id, is_read, created_at
       FROM notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    const total = countRow?.total ?? 0

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        message: row.message,
        relatedEntityType: row.related_entity_type,
        relatedEntityId: row.related_entity_id,
        isRead: row.is_read,
        // Waktu diubah ke teks ISO di sini, bukan diserahkan ke pembuat JSON:
        // bentuk Date yang ikut terkirim apa adanya akan tampil sebagai string
        // bergantung zona waktu mesin yang melayaninya.
        createdAt:
          row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
        belumDibaca: countRow?.belum ?? 0,
      },
    }
  },

  async markRead(userId: string, id: string) {
    const rows = await query<{ id: string }>(
      `UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId],
    )

    if (rows.length === 0) {
      throw new HttpError(404, 'Notifikasi tidak ditemukan')
    }

    return { id }
  },

  async markAllRead(userId: string) {
    const rows = await query<{ id: string }>(
      `UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [userId],
    )

    return { jumlah: rows.length }
  },

  async remove(userId: string, id: string) {
    const rows = await query<{ id: string }>(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    )

    if (rows.length === 0) {
      throw new HttpError(404, 'Notifikasi tidak ditemukan')
    }

    return { id }
  },
}
