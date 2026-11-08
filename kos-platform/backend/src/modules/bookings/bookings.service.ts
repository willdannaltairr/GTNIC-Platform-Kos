import { query, queryOne, withTransaction } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import type { AuthUser } from '../../middleware/auth'
import { notificationsService } from '../notifications/notifications.service'
import {
  STATUS_PEMILIK,
  STATUS_PENGHUNI,
  type CreateBookingInput,
  type ListBookingsQuery,
  type UpdateBookingStatusInput,
} from './bookings.validator'

/**
 * Perpindahan status yang masuk akal dari tiap status.
 *
 * Tanpa peta ini, booking yang sudah dibatalkan bisa berubah jadi dikonfirmasi
 * dan riwayatnya jadi tidak bisa dipercaya lagi. Nilainya sengaja statis, bukan
 * dihitung dari daftar status yang ada: aturan perpindahannya adalah keputusan
 * bisnis, bukan turunan dari enumnya.
 */
const PERPINDAHAN: Record<string, readonly string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  APPROVED: ['AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
  AWAITING_PAYMENT: ['CONFIRMED', 'EXPIRED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  // Status akhir: tidak ada jalan keluar, supaya catatan selesainya tetap utuh.
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
  COMPLETED: [],
}

interface BookingRow {
  id: string
  booking_code: string
  tenant_id: string
  tenant_name: string
  owner_id: string
  property_id: string
  property_name: string
  property_slug: string
  room_id: string
  room_number: string
  start_date: Date
  end_date: Date | null
  monthly_price_snapshot: string
  deposit_amount_snapshot: string
  additional_cost_snapshot: string
  total_amount: string
  status: string
  tenant_notes: string | null
  owner_notes: string | null
  created_at: Date
}

const KOLOM = `
  b.id, b.booking_code, b.tenant_id, u.full_name AS tenant_name,
  p.owner_id, b.property_id, p.name AS property_name, p.slug AS property_slug,
  b.room_id, r.room_number, b.start_date, b.end_date,
  b.monthly_price_snapshot, b.deposit_amount_snapshot, b.additional_cost_snapshot,
  b.total_amount, b.status, b.tenant_notes, b.owner_notes, b.created_at
`

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const keBentuk = (row: BookingRow) => ({
  id: row.id,
  bookingCode: row.booking_code,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  propertySlug: row.property_slug,
  roomId: row.room_id,
  roomNumber: row.room_number,
  startDate: row.start_date.toISOString(),
  endDate: row.end_date === null ? null : row.end_date.toISOString(),
  monthlyPrice: angka(row.monthly_price_snapshot),
  depositAmount: angka(row.deposit_amount_snapshot),
  additionalCost: angka(row.additional_cost_snapshot),
  totalAmount: angka(row.total_amount),
  status: row.status,
  tenantNotes: row.tenant_notes,
  ownerNotes: row.owner_notes,
  createdAt: row.created_at.toISOString(),
})

/**
 * Ambil satu booking dengan pemeriksaan hak akses.
 *
 * Peserta booking hanya dua: penghuni yang mengajukan dan pemilik propertinya.
 * Selain admin, keduanya yang boleh melihat, dan yang lain dijawab 404 supaya
 * keberadaan booking orang lain tidak bocor lewat perbedaan 403 dan 404.
 */
const ambil = async (user: AuthUser, id: string): Promise<BookingRow> => {
  const row = await queryOne<BookingRow>(
    `SELECT ${KOLOM}
     FROM bookings b
     JOIN users u ON u.id = b.tenant_id
     JOIN properties p ON p.id = b.property_id
     JOIN rooms r ON r.id = b.room_id
     WHERE b.id = $1`,
    [id],
  )

  if (!row) throw new HttpError(404, 'Booking tidak ditemukan')

  const boleh = user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId
  if (!boleh) throw new HttpError(404, 'Booking tidak ditemukan')

  return row
}

export const bookingsService = {
  /**
   * Ajukan booking.
   *
   * Harga dan deposit disalin dari keadaan saat pengajuan, bukan dibaca ulang
   * saat ditampilkan. Pemilik yang menaikkan harga bulan depan tidak boleh
   * mengubah tagihan booking yang sudah diajukan hari ini.
   */
  async create(user: AuthUser, input: CreateBookingInput) {
    const kamar = await queryOne<{
      room_id: string
      room_number: string
      monthly_price: string
      availability_status: string
      property_id: string
      property_name: string
      owner_id: string
    }>(
      `SELECT r.id AS room_id, r.room_number, r.monthly_price, r.availability_status,
              p.id AS property_id, p.name AS property_name, p.owner_id
       FROM rooms r
       JOIN properties p ON p.id = r.property_id
       WHERE r.id = $1
         AND r.property_id = $2
         AND p.deleted_at IS NULL
         AND p.publication_status = 'PUBLISHED'
         AND p.verification_status = 'VERIFIED'`,
      [input.roomId, input.propertyId],
    )

    if (!kamar) throw new HttpError(404, 'Kamar tidak ditemukan')

    // Kamar yang sudah terisi tidak bisa diajukan lagi. Diperiksa di sini
    // supaya pengunjung dapat jawaban yang jelas, bukan booking yang menggantung
    // tanpa pernah bisa disetujui.
    if (kamar.availability_status !== 'AVAILABLE') {
      throw new HttpError(409, 'Kamar itu sedang tidak tersedia')
    }

    if (kamar.owner_id === user.userId) {
      throw new HttpError(400, 'Anda tidak bisa menyewa kamar milik sendiri')
    }

    // Satu kamar hanya boleh punya satu booking berjalan. Tanpa pemeriksaan
    // ini dua orang bisa sama-sama mengajukan kamar yang sama, dan pemiliknya
    // menyetujui keduanya karena tidak ada yang menahannya di tahap pengajuan.
    const sedangDiajukan = await queryOne<{ id: string }>(
      `SELECT id FROM bookings
       WHERE room_id = $1
         AND status IN ('PENDING', 'APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED')
       LIMIT 1`,
      [input.roomId],
    )

    if (sedangDiajukan) {
      throw new HttpError(409, 'Kamar itu sedang diajukan atau disewa orang lain')
    }

    const deposit = await queryOne<{ amount: string | null }>(
      `SELECT COALESCE(sum(amount), 0) AS amount
       FROM cost_components
       WHERE property_id = $1 AND name ILIKE '%deposit%'`,
      [input.propertyId],
    )

    const bulanan = angka(kamar.monthly_price)
    const jaminan = angka(deposit?.amount)

    // Tanggal selesai dihitung dari durasi, dan disimpan sekalian supaya
    // kontrak nanti tidak perlu menebak-nebak berapa bulan yang disepakati.
    const mulai = new Date(input.startDate)
    const selesai = new Date(mulai)
    selesai.setMonth(selesai.getMonth() + input.durasiBulan)

    const row = await queryOne<BookingRow>(
      `WITH baru AS (
         INSERT INTO bookings (
           tenant_id, property_id, room_id, booking_code, start_date, end_date,
           monthly_price_snapshot, deposit_amount_snapshot, additional_cost_snapshot,
           total_amount, status, tenant_notes
         )
         VALUES (
           $1, $2, $3,
           'BK-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
           $4, $5, $6, $7, 0, $8, 'PENDING', $9
         )
         RETURNING *
       )
       SELECT ${KOLOM}
       FROM baru b
       JOIN users u ON u.id = b.tenant_id
       JOIN properties p ON p.id = b.property_id
       JOIN rooms r ON r.id = b.room_id`,
      [
        user.userId,
        input.propertyId,
        input.roomId,
        mulai.toISOString(),
        selesai.toISOString(),
        bulanan,
        jaminan,
        bulanan + jaminan,
        input.catatan ?? null,
      ],
    )

    if (!row) throw new HttpError(500, 'Booking gagal disimpan')

    await notificationsService.create({
      userId: kamar.owner_id,
      jenis: 'NEW_BOOKING',
      judul: 'Ada pengajuan sewa baru',
      pesan: `${row.tenant_name} mengajukan kamar ${kamar.room_number} di ${kamar.property_name}.`,
      entityType: 'booking',
      entityId: row.id,
    })

    return keBentuk(row)
  },

  async list(user: AuthUser, params: ListBookingsQuery) {
    // Peran menentukan kolom penyaringnya, bukan parameter permintaan.
    const kondisi = [
      user.role === 'ADMIN'
        ? 'TRUE'
        : user.role === 'OWNER'
          ? 'p.owner_id = $1'
          : 'b.tenant_id = $1',
    ]

    const values: unknown[] = user.role === 'ADMIN' ? [] : [user.userId]

    if (params.status) {
      values.push(params.status)
      kondisi.push(`b.status = $${values.length}`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<BookingRow>(
      `SELECT ${KOLOM}
       FROM bookings b
       JOIN users u ON u.id = b.tenant_id
       JOIN properties p ON p.id = b.property_id
       JOIN rooms r ON r.id = b.room_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    const total = hitung?.total ?? 0

    return {
      items: rows.map(keBentuk),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  async detail(user: AuthUser, id: string) {
    const booking = await ambil(user, id)

    const riwayat = await query<{
      id: string
      previous_status: string | null
      new_status: string
      reason: string | null
      created_at: Date
    }>(
      `SELECT id, previous_status, new_status, reason, created_at
       FROM booking_status_histories
       WHERE booking_id = $1
       ORDER BY created_at ASC`,
      [id],
    )

    return {
      ...keBentuk(booking),
      riwayat: riwayat.map((baris) => ({
        id: baris.id,
        previousStatus: baris.previous_status,
        newStatus: baris.new_status,
        reason: baris.reason,
        createdAt: baris.created_at.toISOString(),
      })),
    }
  },

  /**
   * Ubah status booking.
   *
   * Status, riwayatnya, dan status kamarnya ditulis dalam satu transaksi.
   * Kalau salah satunya gagal, booking tidak boleh tertinggal dalam keadaan
   * setengah berubah: disetujui tetapi riwayatnya kosong, atau kamarnya masih
   * tersedia padahal sewanya sudah dikonfirmasi.
   */
  async updateStatus(user: AuthUser, id: string, input: UpdateBookingStatusInput) {
    const booking = await ambil(user, id)

    const pemilik = booking.owner_id === user.userId
    const penghuni = booking.tenant_id === user.userId
    const admin = user.role === 'ADMIN'

    if (!pemilik && !penghuni && !admin) {
      throw new HttpError(403, 'Anda tidak berhak mengubah booking ini')
    }

    if (penghuni && !pemilik) {
      const boleh = (STATUS_PENGHUNI as readonly string[]).includes(input.status)
      if (!boleh) throw new HttpError(403, 'Penghuni hanya bisa membatalkan bookingnya')
    }

    if (pemilik && !admin) {
      const boleh = (STATUS_PEMILIK as readonly string[]).includes(input.status)
      if (!boleh) throw new HttpError(403, 'Pemilik tidak bisa menetapkan status itu')
    }

    const lanjutan = PERPINDAHAN[booking.status] ?? []

    if (!lanjutan.includes(input.status)) {
      throw new HttpError(
        409,
        `Booking berstatus ${booking.status} tidak bisa diubah menjadi ${input.status}`,
      )
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE bookings
         SET status = $1,
             owner_notes = COALESCE($2, owner_notes),
             updated_at = now()
         WHERE id = $3`,
        [input.status, input.catatanPemilik ?? null, id],
      )

      await client.query(
        `INSERT INTO booking_status_histories (booking_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, booking.status, input.status, user.userId, input.alasan ?? null],
      )

      // Kamar mengikuti keputusan booking. Kolomnya menyimpan keadaan, bukan
      // booking mana yang menahannya, jadi pembatalan mengembalikan kamar ke
      // tersedia. Aman karena create menolak pengajuan kedua untuk kamar yang
      // sudah punya booking berjalan.
      if (input.status === 'APPROVED' || input.status === 'CONFIRMED') {
        await client.query(
          `UPDATE rooms SET availability_status = 'RESERVED'
           WHERE id = $1 AND availability_status = 'AVAILABLE'`,
          [booking.room_id],
        )
      }

      if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(input.status)) {
        await client.query(
          `UPDATE rooms SET availability_status = 'AVAILABLE'
           WHERE id = $1 AND availability_status = 'RESERVED'`,
          [booking.room_id],
        )
      }
    })

    // Pemberitahuan dikirim setelah transaksi tersimpan, dan kegagalannya tidak
    // membatalkan perubahan status yang sudah sah.
    const penerima = pemilik ? booking.tenant_id : booking.owner_id
    const judul: Record<string, string> = {
      APPROVED: 'Pengajuan sewa disetujui',
      REJECTED: 'Pengajuan sewa ditolak',
      CONFIRMED: 'Sewa dikonfirmasi',
      CANCELLED: 'Booking dibatalkan',
      EXPIRED: 'Booking kedaluwarsa',
      COMPLETED: 'Masa sewa selesai',
      AWAITING_PAYMENT: 'Menunggu pembayaran',
    }

    await notificationsService.create({
      userId: penerima,
      jenis:
        input.status === 'APPROVED'
          ? 'BOOKING_APPROVED'
          : input.status === 'REJECTED'
            ? 'BOOKING_REJECTED'
            : 'NEW_BOOKING',
      judul: judul[input.status] ?? `Status booking menjadi ${input.status}`,
      pesan: input.alasan
        ? `${booking.property_name}, kamar ${booking.room_number}. Catatan: ${input.alasan}`
        : `${booking.property_name}, kamar ${booking.room_number}.`,
      entityType: 'booking',
      entityId: booking.id,
    })

    return keBentuk(await ambil(user, id))
  },
}
