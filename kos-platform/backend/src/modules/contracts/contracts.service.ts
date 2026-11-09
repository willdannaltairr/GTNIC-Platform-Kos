import { query, queryOne, withTransaction } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import type { AuthUser } from '../../middleware/auth'
import { notificationsService } from '../notifications/notifications.service'
import {
  PERPINDAHAN_KONTRAK,
  type CreateContractInput,
  type ListContractsQuery,
  type UpdateContractStatusInput,
} from './contracts.validator'

/**
 * Kontrak sewa.
 *
 * Kontrak adalah lanjutan dari booking yang sudah dikonfirmasi, dan isinya
 * sengaja disalin dari booking saat dibuat, bukan dibaca ulang dari kamar atau
 * properti: harga sewa dan deposit yang sudah disepakati tidak boleh berubah
 * karena pemilik menaikkan harga bulan depan. Salinan itu yang jadi dasar
 * seluruh tagihan berikutnya.
 *
 * Satu booking hanya punya satu kontrak (indeks unik `contracts_booking_id_key`),
 * dan itu yang menahan pembuatan kontrak ganda saat pemilik menekan tombolnya
 * dua kali.
 */

interface KontrakRow {
  id: string
  contract_number: string
  booking_id: string
  booking_code: string
  tenant_id: string
  tenant_name: string
  owner_id: string
  owner_name: string
  property_id: string
  property_name: string
  property_slug: string
  room_id: string
  room_number: string
  start_date: Date
  end_date: Date | null
  monthly_rent: string
  deposit_amount: string
  contract_status: string
  signed_at: Date | null
  created_at: Date
}

const KOLOM = `
  c.id, c.contract_number, c.booking_id, b.booking_code,
  c.tenant_id, t.full_name AS tenant_name,
  c.owner_id, o.full_name AS owner_name,
  c.property_id, p.name AS property_name, p.slug AS property_slug,
  c.room_id, r.room_number,
  c.start_date, c.end_date, c.monthly_rent, c.deposit_amount,
  c.contract_status, c.signed_at, c.created_at
`

const DARI = `
  FROM contracts c
  JOIN bookings b ON b.id = c.booking_id
  JOIN users t ON t.id = c.tenant_id
  JOIN users o ON o.id = c.owner_id
  JOIN properties p ON p.id = c.property_id
  JOIN rooms r ON r.id = c.room_id
`

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const keBentuk = (row: KontrakRow) => ({
  id: row.id,
  contractNumber: row.contract_number,
  bookingId: row.booking_id,
  bookingCode: row.booking_code,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  propertySlug: row.property_slug,
  roomId: row.room_id,
  roomNumber: row.room_number,
  startDate: row.start_date.toISOString(),
  endDate: row.end_date === null ? null : row.end_date.toISOString(),
  monthlyRent: angka(row.monthly_rent),
  depositAmount: angka(row.deposit_amount),
  status: row.contract_status,
  signedAt: row.signed_at === null ? null : row.signed_at.toISOString(),
  createdAt: row.created_at.toISOString(),
})

/**
 * Ambil satu kontrak dengan pemeriksaan hak akses.
 *
 * Pesertanya dua: penghuni dan pemilik propertinya. Selain admin, keduanya
 * yang boleh melihat, dan yang lain dijawab 404 supaya keberadaan kontrak
 * orang lain tidak bocor lewat perbedaan 403 dan 404.
 */
const ambil = async (user: AuthUser, id: string): Promise<KontrakRow> => {
  const row = await queryOne<KontrakRow>(`SELECT ${KOLOM} ${DARI} WHERE c.id = $1`, [id])

  if (!row) throw new HttpError(404, 'Kontrak tidak ditemukan')

  const boleh = user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId
  if (!boleh) throw new HttpError(404, 'Kontrak tidak ditemukan')

  return row
}

export const contractsService = {
  /**
   * Buat kontrak dari booking yang sudah dikonfirmasi.
   *
   * Hanya pemilik propertinya (atau admin) yang boleh membuat. Penghuni tidak
   * bisa membuat kontrak untuk dirinya sendiri: yang menyerahkan kamar adalah
   * pemiliknya, dan kontrak yang dibuat sepihak oleh penyewa tidak berarti apa
   * apa.
   */
  async create(user: AuthUser, input: CreateContractInput) {
    const booking = await queryOne<{
      id: string
      booking_code: string
      tenant_id: string
      tenant_name: string
      owner_id: string
      property_id: string
      property_name: string
      room_id: string
      room_number: string
      start_date: Date
      end_date: Date | null
      monthly_price_snapshot: string
      deposit_amount_snapshot: string
      status: string
    }>(
      `SELECT b.id, b.booking_code, b.tenant_id, t.full_name AS tenant_name,
              p.owner_id, b.property_id, p.name AS property_name,
              b.room_id, r.room_number, b.start_date, b.end_date,
              b.monthly_price_snapshot, b.deposit_amount_snapshot, b.status
       FROM bookings b
       JOIN users t ON t.id = b.tenant_id
       JOIN properties p ON p.id = b.property_id
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1`,
      [input.bookingId],
    )

    if (!booking) throw new HttpError(404, 'Booking tidak ditemukan')

    if (user.role !== 'ADMIN' && booking.owner_id !== user.userId) {
      throw new HttpError(404, 'Booking tidak ditemukan')
    }

    if (booking.status !== 'CONFIRMED') {
      throw new HttpError(
        409,
        'Kontrak hanya bisa dibuat dari booking yang sudah dikonfirmasi. Status booking saat ini ' +
          booking.status +
          '.',
      )
    }

    const mulai = input.startDate ? new Date(input.startDate) : booking.start_date
    const selesai = new Date(mulai)

    if (input.durasiBulan) {
      selesai.setMonth(selesai.getMonth() + input.durasiBulan)
    } else if (booking.end_date) {
      selesai.setTime(booking.end_date.getTime())
    } else {
      selesai.setMonth(selesai.getMonth() + 1)
    }

    if (selesai.getTime() <= mulai.getTime()) {
      throw new HttpError(400, 'Tanggal selesai kontrak harus setelah tanggal mulainya')
    }

    try {
      const row = await queryOne<KontrakRow>(
        `WITH baru AS (
           INSERT INTO contracts (
             booking_id, tenant_id, owner_id, property_id, room_id, contract_number,
             start_date, end_date, monthly_rent, deposit_amount, contract_status
           )
           VALUES (
             $1, $2, $3, $4, $5,
             'CT-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
             $6, $7, $8, $9, 'DRAFT'
           )
           RETURNING *
         )
         SELECT ${KOLOM}
         FROM baru c
         JOIN bookings b ON b.id = c.booking_id
         JOIN users t ON t.id = c.tenant_id
         JOIN users o ON o.id = c.owner_id
         JOIN properties p ON p.id = c.property_id
         JOIN rooms r ON r.id = c.room_id`,
        [
          booking.id,
          booking.tenant_id,
          booking.owner_id,
          booking.property_id,
          booking.room_id,
          mulai.toISOString(),
          selesai.toISOString(),
          angka(booking.monthly_price_snapshot),
          angka(booking.deposit_amount_snapshot),
        ],
      )

      if (!row) throw new HttpError(500, 'Kontrak gagal disimpan')

      return keBentuk(row)
    } catch (error) {
      // Indeks unik booking_id: pesannya harus menyebut sebabnya, bukan galat
      // driver, supaya pemilik tahu kontraknya sudah ada dan bisa langsung
      // dibuka alih-alih menekan tombolnya lagi.
      if ((error as { code?: string }).code === '23505') {
        throw new HttpError(409, 'Booking ini sudah punya kontrak. Buka kontrak yang ada.')
      }
      throw error
    }
  },

  async list(user: AuthUser, params: ListContractsQuery) {
    // Peran menentukan kolom penyaringnya, bukan parameter permintaan.
    const kondisi = [
      user.role === 'ADMIN'
        ? 'TRUE'
        : user.role === 'OWNER'
          ? 'c.owner_id = $1'
          : 'c.tenant_id = $1',
    ]

    const values: unknown[] = user.role === 'ADMIN' ? [] : [user.userId]

    if (params.status) {
      values.push(params.status)
      kondisi.push(`c.contract_status = $${values.length}`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM contracts c ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<KontrakRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY c.created_at DESC
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
    const kontrak = await ambil(user, id)

    // Tagihan yang lahir dari kontrak ini ikut ditampilkan: pertanyaan pertama
    // penghuni saat membuka kontrak biasanya "apa yang harus saya bayar", dan
    // memisahkannya ke halaman lain berarti ia harus tahu ke mana mencarinya.
    const tagihan = await query<{
      id: string
      invoice_number: string
      total_amount: string
      invoice_status: string
      due_date: Date | null
    }>(
      `SELECT id, invoice_number, total_amount, invoice_status, due_date
       FROM invoices
       WHERE contract_id = $1
       ORDER BY created_at DESC`,
      [id],
    )

    return {
      ...keBentuk(kontrak),
      invoices: tagihan.map((baris) => ({
        id: baris.id,
        invoiceNumber: baris.invoice_number,
        totalAmount: angka(baris.total_amount),
        status: baris.invoice_status,
        dueDate: baris.due_date === null ? null : baris.due_date.toISOString(),
      })),
    }
  },

  /**
   * Ubah status kontrak.
   *
   * Perpindahannya diperiksa terhadap peta di validator, dan siapa yang boleh
   * menetapkan status tertentu dibatasi peran:
   *
   *   * Pemilik mengajukan kontrak untuk ditandatangani, mengaktifkannya,
   *     menandainya selesai, atau mengakhirinya lebih awal.
   *   * Penghuni hanya menandatangani, yang sekaligus mengaktifkan kontraknya.
   *     Ia tidak bisa menandai kontraknya selesai sendiri: masa sewa berakhir
   *     ketika pemilik mengembalikan deposit, dan itu bukan keputusan penghuni.
   *
   * Perubahan status dan catatan riwayatnya ditulis dalam satu transaksi.
   */
  async updateStatus(user: AuthUser, id: string, input: UpdateContractStatusInput) {
    const kontrak = await ambil(user, id)

    const pemilik = kontrak.owner_id === user.userId
    const penghuni = kontrak.tenant_id === user.userId
    const admin = user.role === 'ADMIN'

    if (penghuni && !pemilik && !admin && input.status !== 'ACTIVE') {
      throw new HttpError(403, 'Penghuni hanya bisa menandatangani kontraknya')
    }

    const lanjutan = PERPINDAHAN_KONTRAK[kontrak.contract_status] ?? []

    if (!lanjutan.includes(input.status)) {
      throw new HttpError(
        409,
        `Kontrak berstatus ${kontrak.contract_status} tidak bisa diubah menjadi ${input.status}`,
      )
    }

    await withTransaction(async (client) => {
      // Cast eksplisit di setiap pemakaian $1: PostgreSQL menebak tipe parameter
      // dari pemakaian pertamanya, dan menebaknya sebagai enum lalu menolak
      // perbandingan berikutnya dengan literal teks.
      await client.query(
        `UPDATE contracts
         SET contract_status = $1::"ContractStatus",
             signed_at = CASE WHEN $1::text = 'ACTIVE' THEN COALESCE(signed_at, now()) ELSE signed_at END,
             updated_at = now()
         WHERE id = $2`,
        [input.status, id],
      )

      await client.query(
        `INSERT INTO contract_status_histories
           (contract_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, kontrak.contract_status, input.status, user.userId, input.alasan ?? null],
      )

      // Kontrak yang aktif menandai kamarnya terisi, dan kontrak yang berakhir
      // mengembalikannya ke tersedia. Ditaruh di sini supaya keadaan kamar
      // tidak bergantung pada siapa yang kebetulan mengubahnya terakhir.
      if (input.status === 'ACTIVE') {
        await client.query(
          `UPDATE rooms
           SET availability_status = 'OCCUPIED'
           WHERE id = $1 AND availability_status IN ('AVAILABLE', 'RESERVED')`,
          [kontrak.room_id],
        )
      }

      if (input.status === 'COMPLETED' || input.status === 'TERMINATED' || input.status === 'CANCELLED') {
        await client.query(
          `UPDATE rooms
           SET availability_status = 'AVAILABLE'
           WHERE id = $1 AND availability_status = 'OCCUPIED'`,
          [kontrak.room_id],
        )
      }
    })

    // Pemberitahuan dikirim setelah transaksi tersimpan, dan kegagalannya tidak
    // membatalkan perubahan status yang sudah sah.
    const penerima = pemilik ? kontrak.tenant_id : kontrak.owner_id
    const judul: Record<string, string> = {
      PENDING_SIGNATURE: 'Kontrak sewa menunggu tanda tangan',
      ACTIVE: 'Kontrak sewa aktif',
      COMPLETED: 'Kontrak sewa selesai',
      TERMINATED: 'Kontrak sewa diakhiri',
      CANCELLED: 'Kontrak sewa dibatalkan',
    }

    // Satu jenis untuk semua perubahan status kontrak. Memakai
    // CONTRACT_EXPIRING untuk kontrak yang baru aktif atau yang dibatalkan akan
    // menyesatkan pembaca data; jenis itu tetap disediakan untuk pengingat masa
    // sewa yang mendekati akhir.
    await notificationsService.create({
      userId: penerima,
      jenis: 'CONTRACT_UPDATED',
      judul: judul[input.status] ?? `Status kontrak menjadi ${input.status}`,
      pesan: input.alasan
        ? `${kontrak.property_name}, kamar ${kontrak.room_number}. Catatan: ${input.alasan}`
        : `${kontrak.property_name}, kamar ${kontrak.room_number}.`,
      entityType: 'contract',
      entityId: kontrak.id,
    })

    return keBentuk(await ambil(user, id))
  },
}
