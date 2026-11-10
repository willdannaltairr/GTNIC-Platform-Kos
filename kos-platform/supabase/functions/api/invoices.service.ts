import { query, queryOne, withTransaction } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import type { AuthUser } from './_shared/auth.ts'
import { notificationsService } from './notifications.service.ts'
import {
  type CancelInvoiceInput,
  type CreateInvoiceInput,
  type ListInvoicesQuery,
} from './invoices.validator.ts'

/**
 * Tagihan sewa.
 *
 * Tagihan adalah satu-satunya dokumen yang menyebut jumlah uang yang harus
 * dibayar penghuni, jadi angkanya tidak boleh dihitung ulang dari harga kamar
 * saat ditampilkan: barisnya disimpan apa adanya saat tagihan dibuat, dan
 * jumlah totalnya ikut disimpan. Pemilik yang menaikkan harga sewa bulan depan
 * tidak boleh mengubah tagihan yang sudah dikirim bulan ini.
 *
 * Status yang berubah karena uang masuk (PARTIALLY_PAID, PAID) tidak pernah
 * ditetapkan manusia lewat endpoint ini. Yang menetapkannya modul pembayaran,
 * setelah pembayarannya benar-benar terkonfirmasi. Kalau pemilik bisa menandai
 * "lunas" sendiri, catatan keuangannya tidak lagi membuktikan apa pun.
 */

/** Jatuh tempo bawaan bila pemilik tidak menyebutkannya. */
const JATUH_TEMPO_HARI = 7

/**
 * Tanggal jatuh tempo untuk dibaca penghuni: "10 Nov 2026".
 *
 * Zonanya dipatok WIB, bukan zona mesin yang melayani permintaan: Edge Function
 * berjalan di UTC, dan jatuh tempo yang jatuh pada malam hari di Indonesia akan
 * terbaca sehari lebih awal kalau tanggalnya diambil apa adanya dari UTC.
 */
const tanggalBaca = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

interface TagihanRow {
  id: string
  invoice_number: string
  tenant_id: string
  tenant_name: string
  owner_id: string
  owner_name: string
  booking_id: string | null
  booking_code: string | null
  contract_id: string | null
  contract_number: string | null
  property_name: string | null
  billing_period_start: Date | null
  billing_period_end: Date | null
  issue_date: Date | null
  due_date: Date | null
  subtotal: string
  discount_amount: string
  total_amount: string
  invoice_status: string
  notes: string | null
  created_at: Date
  dibayar: string
}

const KOLOM = `
  i.id, i.invoice_number, i.tenant_id, t.full_name AS tenant_name,
  i.owner_id, o.full_name AS owner_name,
  i.booking_id, b.booking_code, i.contract_id, c.contract_number,
  p.name AS property_name,
  i.billing_period_start, i.billing_period_end, i.issue_date, i.due_date,
  i.subtotal, i.discount_amount, i.total_amount, i.invoice_status, i.notes, i.created_at,
  COALESCE(bayar.amount, 0) AS dibayar
`

const DARI = `
  FROM invoices i
  JOIN users t ON t.id = i.tenant_id
  JOIN users o ON o.id = i.owner_id
  LEFT JOIN bookings b ON b.id = i.booking_id
  LEFT JOIN contracts c ON c.id = i.contract_id
  LEFT JOIN properties p ON p.id = COALESCE(c.property_id, b.property_id)
  LEFT JOIN (
    SELECT invoice_id, sum(amount) AS amount
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY invoice_id
  ) bayar ON bayar.invoice_id = i.id
`

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const waktu = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

const keBentuk = (row: TagihanRow) => {
  const total = angka(row.total_amount)
  const dibayar = angka(row.dibayar)

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    bookingId: row.booking_id,
    bookingCode: row.booking_code,
    contractId: row.contract_id,
    contractNumber: row.contract_number,
    propertyName: row.property_name,
    billingPeriodStart: waktu(row.billing_period_start),
    billingPeriodEnd: waktu(row.billing_period_end),
    issueDate: waktu(row.issue_date),
    dueDate: waktu(row.due_date),
    subtotal: angka(row.subtotal),
    discountAmount: angka(row.discount_amount),
    totalAmount: total,
    paidAmount: dibayar,
    /**
     * Sisa yang masih harus dibayar dihitung di sini, bukan di layar.
     * Penghuni yang melihat "Rp0 tersisa" pada tagihan yang belum lunas akan
     * berhenti membayar, dan selisih pembulatan sekecil apa pun cukup untuk
     * membuat itu terjadi.
     */
    remainingAmount: Math.max(0, total - dibayar),
    status: row.invoice_status,
    notes: row.notes,
    createdAt: waktu(row.created_at),
  }
}

/**
 * Ambil satu tagihan dengan pemeriksaan hak akses.
 *
 * Pihaknya dua: penghuni yang ditagih dan pemilik yang menagih. Selain admin,
 * keduanya yang boleh melihat, dan yang lain dijawab 404 supaya keberadaan
 * tagihan orang lain tidak bocor lewat perbedaan 403 dan 404.
 */
const ambil = async (user: AuthUser, id: string): Promise<TagihanRow> => {
  const row = await queryOne<TagihanRow>(`SELECT ${KOLOM} ${DARI} WHERE i.id = $1`, [id])

  if (!row) throw new HttpError(404, 'Tagihan tidak ditemukan')

  const boleh =
    user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId
  if (!boleh) throw new HttpError(404, 'Tagihan tidak ditemukan')

  /**
   * Draf belum berlaku untuk penghuni.
   *
   * Tagihan yang masih draf masih mungkin diubah pemiliknya: barisnya bisa
   * ditambah, potongannya bisa disesuaikan. Menampilkannya kepada penghuni
   * berarti ia bisa menyiapkan pembayaran untuk angka yang belum final, dan
   * tagihan yang berubah setelah dilihat membuat jumlahnya tidak lagi
   * dipercaya.
   */
  if (row.invoice_status === 'DRAFT' && user.role !== 'ADMIN' && row.owner_id !== user.userId) {
    throw new HttpError(404, 'Tagihan tidak ditemukan')
  }

  return row
}

export const invoicesService = {
  /**
   * Buat tagihan baru untuk satu kontrak atau satu booking.
   *
   * Penghuni dan pemiliknya disalin dari kontrak atau booking yang ditagih,
   * bukan dari isi permintaan. Kalau keduanya boleh ditentukan pengirim, satu
   * salah kirim cukup untuk membuat tagihan yang tertuju ke orang yang tidak
   * pernah menyewa apa pun, dan uangnya tidak bisa ditarik kembali.
   */
  async create(user: AuthUser, input: CreateInvoiceInput) {
    const sumber = input.contractId
      ? await queryOne<{
          tenant_id: string
          owner_id: string
          booking_id: string
          contract_id: string
          status: string
        }>(
          `SELECT tenant_id, owner_id, booking_id, id AS contract_id, contract_status AS status
           FROM contracts WHERE id = $1`,
          [input.contractId],
        )
      : await queryOne<{
          tenant_id: string
          owner_id: string
          booking_id: string
          contract_id: null
          status: string
        }>(
          `SELECT b.tenant_id, p.owner_id, b.id AS booking_id, NULL AS contract_id, b.status
           FROM bookings b
           JOIN properties p ON p.id = b.property_id
           WHERE b.id = $1`,
          [input.bookingId],
        )

    if (!sumber) {
      throw new HttpError(
        404,
        input.contractId ? 'Kontrak tidak ditemukan' : 'Booking tidak ditemukan',
      )
    }

    if (user.role !== 'ADMIN' && sumber.owner_id !== user.userId) {
      throw new HttpError(404, 'Kontrak tidak ditemukan')
    }

    // Tagihan dari kontrak yang belum aktif, atau dari booking yang belum
    // dikonfirmasi, menagih sesuatu yang belum tentu jadi berjalan. Menolaknya
    // sekarang lebih murah daripada mengembalikan uangnya nanti.
    const bolehDitagih =
      input.contractId !== undefined
        ? sumber.status === 'ACTIVE' || sumber.status === 'PENDING_SIGNATURE'
        : sumber.status === 'CONFIRMED'

    if (!bolehDitagih) {
      throw new HttpError(
        409,
        input.contractId
          ? `Kontrak berstatus ${sumber.status} belum bisa ditagih`
          : `Booking berstatus ${sumber.status} belum bisa ditagih`,
      )
    }

    const subtotal = input.items.reduce(
      (jumlah, item) => jumlah + Math.round(item.quantity * item.unitPrice),
      0,
    )

    if (subtotal <= 0) {
      throw new HttpError(400, 'Total tagihan harus lebih dari nol')
    }

    if (input.discountAmount > subtotal) {
      throw new HttpError(400, 'Potongan tidak boleh melebihi subtotal tagihan')
    }

    const total = subtotal - input.discountAmount
    const jatuhTempo = input.dueDate
      ? new Date(input.dueDate)
      : new Date(Date.now() + JATUH_TEMPO_HARI * 24 * 60 * 60 * 1000)

    const invoiceId = await withTransaction(async (client) => {
      const dibuat = await client.query<{ id: string }>(
        `INSERT INTO invoices (
           tenant_id, owner_id, booking_id, contract_id, invoice_number,
           billing_period_start, billing_period_end, due_date,
           subtotal, discount_amount, total_amount, invoice_status, notes
         )
         VALUES (
           $1, $2, $3, $4,
           'INV-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
           $5, $6, $7, $8, $9, $10, 'DRAFT', $11
         )
         RETURNING id`,
        [
          sumber.tenant_id,
          sumber.owner_id,
          sumber.booking_id,
          sumber.contract_id,
          input.billingPeriodStart ?? null,
          input.billingPeriodEnd ?? null,
          jatuhTempo.toISOString(),
          subtotal,
          input.discountAmount,
          total,
          input.notes ?? null,
        ],
      )

      const id = dibuat[0].id

      // Barisnya disisipkan satu per satu dengan nilai yang sudah dihitung di
      // sini, bukan dirangkai menjadi satu INSERT besar: jumlah barisnya kecil
      // (maksimal 30) dan cara ini membuat setiap baris tetap tervalidasi
      // sebagai parameter, bukan sebagai teks SQL.
      for (const item of input.items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, subtotal, cost_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            item.description,
            item.quantity,
            item.unitPrice,
            Math.round(item.quantity * item.unitPrice),
            item.costType ?? null,
          ],
        )
      }

      return id
    })

    return this.detail(user, invoiceId)
  },

  async list(user: AuthUser, params: ListInvoicesQuery) {
    // Peran menentukan kolom penyaringnya, bukan parameter permintaan.
    const kondisi = [
      user.role === 'ADMIN'
        ? 'TRUE'
        : user.role === 'OWNER'
          ? 'i.owner_id = $1'
          : 'i.tenant_id = $1',
    ]

    // Draf tidak pernah muncul di daftar penghuni, sama seperti saat dibuka
    // satu per satu: tagihan yang belum dikirim masih bisa berubah.
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      kondisi.push(`i.invoice_status <> 'DRAFT'`)
    }

    const values: unknown[] = user.role === 'ADMIN' ? [] : [user.userId]

    if (params.status) {
      values.push(params.status)
      kondisi.push(`i.invoice_status = $${values.length}`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`

    // `belum` menghitung SISA, bukan jumlah tagihan penuh. Tagihan yang sudah
    // dibayar sebagian hanya menyisakan selisihnya, dan menampilkan angka penuh
    // membuat pemilik mengira uangnya belum masuk padahal sebagian sudah.
    const hitung = await queryOne<{ total: number; belum: string; terbayar: string }>(
      `SELECT
         count(*)::int AS total,
         COALESCE(sum(GREATEST(i.total_amount - COALESCE(byr.dibayar, 0), 0)) FILTER (
           WHERE i.invoice_status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
         ), 0) AS belum,
         COALESCE(sum(i.total_amount) FILTER (WHERE i.invoice_status = 'PAID'), 0) AS terbayar
       FROM invoices i
       LEFT JOIN (
         SELECT invoice_id, sum(amount) AS dibayar
         FROM payments
         WHERE payment_status = 'SUCCESS'
         GROUP BY invoice_id
       ) byr ON byr.invoice_id = i.id
       ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<TagihanRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY i.created_at DESC
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
        /**
         * Ringkasan uang ikut di daftar, bukan hanya di halaman terpisah:
         * pertanyaan pertama pemilik saat membuka daftar tagihan adalah
         * berapa yang belum masuk, dan angka itu harus menjawab seluruh
         * tagihannya, bukan hanya halaman yang sedang tampil.
         */
        totalBelumDibayar: angka(hitung?.belum),
        totalTerbayar: angka(hitung?.terbayar),
      },
    }
  },

  async detail(user: AuthUser, id: string) {
    const tagihan = await ambil(user, id)

    const [items, pembayaran] = await Promise.all([
      query<{
        id: string
        description: string
        quantity: string
        unit_price: string
        subtotal: string
        cost_type: string | null
      }>(
        `SELECT id, description, quantity, unit_price, subtotal, cost_type
         FROM invoice_items
         WHERE invoice_id = $1
         ORDER BY created_at`,
        [id],
      ),
      query<{
        id: string
        payment_code: string
        amount: string
        payment_status: string
        payment_method: string | null
        paid_at: Date | null
        created_at: Date
      }>(
        `SELECT id, payment_code, amount, payment_status, payment_method, paid_at, created_at
         FROM payments
         WHERE invoice_id = $1
         ORDER BY created_at DESC`,
        [id],
      ),
    ])

    return {
      ...keBentuk(tagihan),
      items: items.map((baris) => ({
        id: baris.id,
        description: baris.description,
        quantity: Number(baris.quantity),
        unitPrice: angka(baris.unit_price),
        subtotal: angka(baris.subtotal),
        costType: baris.cost_type,
      })),
      payments: pembayaran.map((baris) => ({
        id: baris.id,
        paymentCode: baris.payment_code,
        amount: angka(baris.amount),
        status: baris.payment_status,
        method: baris.payment_method,
        paidAt: waktu(baris.paid_at),
        createdAt: waktu(baris.created_at),
      })),
    }
  },

  /**
   * Kirim tagihan ke penghuni.
   *
   * Draf tidak terlihat penghuni dan tidak bisa dibayar, jadi pengiriman ini
   * yang membuatnya berlaku: statusnya menjadi belum dibayar, dan tanggal
   * terbitnya dicatat saat itu, bukan saat drafnya dibuat.
   */
  async kirim(user: AuthUser, id: string) {
    const tagihan = await ambil(user, id)

    if (user.role !== 'ADMIN' && tagihan.owner_id !== user.userId) {
      throw new HttpError(403, 'Hanya pemilik properti yang bisa mengirim tagihan ini')
    }

    if (tagihan.invoice_status !== 'DRAFT') {
      throw new HttpError(409, 'Tagihan ini sudah dikirim sebelumnya')
    }

    const row = await queryOne<{ id: string }>(
      `UPDATE invoices
       SET invoice_status = 'UNPAID', issue_date = now(), updated_at = now()
       WHERE id = $1 AND invoice_status = 'DRAFT'
       RETURNING id`,
      [id],
    )

    if (!row) throw new HttpError(409, 'Tagihan ini sudah tidak berstatus draf')

    await notificationsService.create({
      userId: tagihan.tenant_id,
      jenis: 'NEW_INVOICE',
      judul: 'Tagihan baru',
      pesan: `${tagihan.invoice_number} sebesar Rp${angka(tagihan.total_amount).toLocaleString('id-ID')} untuk ${tagihan.property_name ?? 'sewa Anda'}.`,
      entityType: 'invoice',
      entityId: tagihan.id,
    })

    return this.detail(user, id)
  },

  /**
   * Batalkan tagihan.
   *
   * Tagihan yang sudah ada pembayaran berhasilnya tidak bisa dibatalkan di
   * sini: uangnya sudah masuk, dan pembatalan yang menyisakan pembayaran
   * menggantung membuat catatan keuangannya tidak seimbang. Kalau memang harus
   * dikembalikan, jalurnya pengembalian dana lewat modul pembayaran.
   */
  async batalkan(user: AuthUser, id: string, input: CancelInvoiceInput) {
    const tagihan = await ambil(user, id)

    if (user.role !== 'ADMIN' && tagihan.owner_id !== user.userId) {
      throw new HttpError(403, 'Hanya pemilik properti yang bisa membatalkan tagihan ini')
    }

    if (tagihan.invoice_status === 'CANCELLED') {
      throw new HttpError(409, 'Tagihan ini sudah dibatalkan')
    }

    const adaPembayaran = await queryOne<{ id: string }>(
      `SELECT id FROM payments WHERE invoice_id = $1 AND payment_status = 'SUCCESS' LIMIT 1`,
      [id],
    )

    if (adaPembayaran) {
      throw new HttpError(
        409,
        'Tagihan ini sudah dibayar, jadi tidak bisa dibatalkan. Ajukan pengembalian dana lewat pembayaran.',
      )
    }

    await query(
      `UPDATE invoices
       SET invoice_status = 'CANCELLED',
           notes = COALESCE(notes || ' | ', '') || 'Dibatalkan: ' || $2,
           updated_at = now()
       WHERE id = $1`,
      [id, input.alasan],
    )

    await notificationsService.create({
      userId: tagihan.tenant_id,
      jenis: 'NEW_INVOICE',
      judul: 'Tagihan dibatalkan',
      pesan: `${tagihan.invoice_number} dibatalkan. Alasan: ${input.alasan}`,
      entityType: 'invoice',
      entityId: tagihan.id,
    })

    return this.detail(user, id)
  },

  /**
   * Kirim pengingat pembayaran ke penghuni.
   *
   * Pengingat ini atas permintaan pemilik, bukan otomatis: belum ada penjadwal
   * di platform ini, dan pengingat yang dikirim pengguna adalah yang paling
   * jelas asalnya kalau penghuni bertanya. Yang diingatkan hanya tagihan yang
   * memang sedang menunggu bayaran.
   *
   * Draf, tagihan batal, dan tagihan lunas ditolak dengan pesan yang menyebut
   * sebabnya. Mengirim pengingat untuk tagihan yang belum berlaku atau sudah
   * selesai membuat penghuni memeriksa sesuatu yang tidak perlu dibayar, dan
   * kebiasaan itu membuat ia berhenti membaca pengingat berikutnya.
   */
  async ingatkan(user: AuthUser, id: string) {
    const tagihan = await ambil(user, id)

    if (user.role !== 'ADMIN' && tagihan.owner_id !== user.userId) {
      throw new HttpError(403, 'Hanya pemilik properti yang bisa mengirim pengingat tagihan ini')
    }

    if (tagihan.invoice_status === 'DRAFT') {
      throw new HttpError(409, 'Tagihan masih draf. Kirim tagihannya dulu sebelum mengingatkan penghuni')
    }

    if (tagihan.invoice_status === 'CANCELLED') {
      throw new HttpError(409, 'Tagihan ini sudah dibatalkan')
    }

    if (tagihan.invoice_status === 'PAID') {
      throw new HttpError(409, 'Tagihan ini sudah lunas')
    }

    // Yang disebut adalah sisa yang belum dibayar, bukan jumlah totalnya:
    // tagihan yang sudah dibayar sebagian akan menyesatkan kalau penghuni
    // diminta menyiapkan uang sebesar totalnya.
    const total = angka(tagihan.total_amount)
    const sisa = Math.max(0, total - angka(tagihan.dibayar))

    const bagian = [
      `Tagihan ${tagihan.invoice_number} sebesar Rp${sisa.toLocaleString('id-ID')}`,
      tagihan.property_name ? `untuk ${tagihan.property_name}` : null,
      tagihan.due_date ? `jatuh tempo ${tanggalBaca.format(new Date(tagihan.due_date))}` : null,
    ].filter(Boolean)

    await notificationsService.create({
      userId: tagihan.tenant_id,
      jenis: 'INVOICE_DUE_SOON',
      judul: 'Pengingat pembayaran',
      pesan: `${bagian.join(' ')}.`,
      entityType: 'invoice',
      entityId: tagihan.id,
    })

    return {
      terkirim: true,
      ke: tagihan.tenant_name,
      jenis: 'INVOICE_DUE_SOON',
    }
  },
}
