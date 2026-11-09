import { query, queryOne, withTransaction, type DbClient } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import type { AuthUser } from '../../middleware/auth'
import { notificationsService } from '../notifications/notifications.service'
import { buatTransaksi, midtransConfigured, tandaTanganSah } from './payments.provider'
import {
  PEMBAYARAN_BERLAKU_JAM,
  type CreatePaymentInput,
  type ListPaymentsQuery,
  type WebhookInput,
} from './payments.validator'

/**
 * Pembayaran.
 *
 * Satu aturan yang menentukan seluruh bentuk modul ini: status "berhasil"
 * tidak pernah datang dari peramban. Pengunjung yang kembali dari halaman
 * penyedia pembayaran bisa saja menutup tabnya sebelum kembali, dan yang lebih
 * penting, alamat halaman kembalian itu bisa dibuka siapa saja. Yang
 * menetapkan sebuah pembayaran lunas hanyalah notifikasi penyedia pembayaran
 * yang tanda tangannya sudah diperiksa di sini.
 *
 * Karena itu tidak ada satu pun endpoint yang menerima status dari klien.
 * Satu-satunya jalan masuknya adalah `terapkanStatus`, yang dipanggil webhook
 * dan, khusus di lingkungan pengembangan, endpoint simulasi.
 */

interface PembayaranRow {
  id: string
  payment_code: string
  invoice_id: string | null
  invoice_number: string | null
  booking_id: string | null
  booking_code: string | null
  tenant_id: string
  tenant_name: string
  owner_id: string | null
  amount: string
  currency: string
  payment_provider: string
  payment_method: string | null
  payment_status: string
  provider_transaction_id: string | null
  provider_order_id: string | null
  paid_at: Date | null
  expired_at: Date | null
  created_at: Date
}

const KOLOM = `
  pay.id, pay.payment_code, pay.invoice_id, i.invoice_number,
  pay.booking_id, b.booking_code,
  pay.tenant_id, t.full_name AS tenant_name,
  p.owner_id,
  pay.amount, pay.currency, pay.payment_provider, pay.payment_method,
  pay.payment_status, pay.provider_transaction_id, pay.provider_order_id,
  pay.paid_at, pay.expired_at, pay.created_at
`

const DARI = `
  FROM payments pay
  JOIN users t ON t.id = pay.tenant_id
  LEFT JOIN invoices i ON i.id = pay.invoice_id
  LEFT JOIN bookings b ON b.id = pay.booking_id
  LEFT JOIN properties p ON p.id = COALESCE(b.property_id, (SELECT c.property_id FROM contracts c WHERE c.id = i.contract_id))
`

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const tanggal = (nilai: Date | null): string | null =>
  nilai === null ? null : nilai.toISOString()

const keBentuk = (row: PembayaranRow) => ({
  id: row.id,
  paymentCode: row.payment_code,
  invoiceId: row.invoice_id,
  invoiceNumber: row.invoice_number,
  bookingId: row.booking_id,
  bookingCode: row.booking_code,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  amount: angka(row.amount),
  currency: row.currency,
  provider: row.payment_provider,
  method: row.payment_method,
  status: row.payment_status,
  providerTransactionId: row.provider_transaction_id,
  paidAt: tanggal(row.paid_at),
  expiredAt: tanggal(row.expired_at),
  createdAt: row.created_at.toISOString(),
})

/**
 * Tandai pembayaran yang sudah lewat batas waktunya.
 *
 * Dilakukan saat dibaca, bukan oleh penjadwal terpisah: yang perlu dilihat
 * penghuni adalah keadaan sekarang, dan pembayaran yang tampak masih menunggu
 * padahal batasnya sudah lewat membuatnya menunggu sesuatu yang tidak akan
 * terjadi. Pekerjaan ini hanya menyentuh barisnya sendiri, jadi tidak ada
 * gunanya menjalankannya untuk seluruh tabel.
 */
const kedaluwarsakan = async (kondisi: string, values: unknown[]): Promise<void> => {
  await query(
    `UPDATE payments pay
     SET payment_status = 'EXPIRED', updated_at = now()
     WHERE pay.payment_status = 'PENDING'
       AND pay.expired_at IS NOT NULL
       AND pay.expired_at <= now()
       AND ${kondisi}`,
    values,
  )
}

const catatRiwayat = async (
  client: DbClient,
  paymentId: string,
  sebelumnya: string | null,
  sekarang: string,
  sumber: string,
  keterangan: string | null,
): Promise<void> => {
  await client.query(
    `INSERT INTO payment_status_histories
       (payment_id, previous_status, new_status, source, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [paymentId, sebelumnya, sekarang, sumber, keterangan],
  )
}

/**
 * Terapkan satu keputusan status pada sebuah pembayaran.
 *
 * Seluruh akibatnya ditulis dalam satu transaksi: pembayaran, riwayatnya,
 * status tagihannya, dan status bookingnya. Kalau salah satu tertinggal,
 * catatan keuangannya jadi tidak seimbang: uang tercatat masuk tetapi
 * tagihannya masih berstatus belum dibayar.
 *
 * Dipakai bersama oleh webhook dan endpoint simulasi pengembangan, supaya
 * jalur yang diuji di pengembangan benar-benar jalur yang sama dengan yang
 * berjalan di produksi.
 */
const terapkanStatus = async (input: {
  paymentId: string
  status: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  sumber: string
  keterangan: string | null
  providerTransactionId?: string | null
  method?: string | null
}): Promise<{ tenantId: string; invoiceId: string | null; bookingId: string | null; nomor: string; jumlah: number }> => {
  const hasil = await withTransaction(async (client) => {
    const rows = await client.query<{
      id: string
      payment_code: string
      invoice_id: string | null
      booking_id: string | null
      tenant_id: string
      amount: string
      payment_status: string
    }>(
      `SELECT id, payment_code, invoice_id, booking_id, tenant_id, amount, payment_status
       FROM payments WHERE id = $1 FOR UPDATE`,
      [input.paymentId],
    )

    const bayar = rows[0]
    if (!bayar) throw new HttpError(404, 'Pembayaran tidak ditemukan')

    if (bayar.payment_status === input.status) {
      return null
    }

    // Status akhir tidak bisa ditinggalkan lagi. Pembayaran yang sudah lunas
    // tidak boleh berubah jadi kedaluwarsa hanya karena notifikasi yang
    // datangnya terlambat, dan uang yang sudah kembali tidak boleh jadi lunas
    // kembali tanpa pembayaran baru.
    const akhir = ['REFUNDED', 'PARTIALLY_REFUNDED']
    if (akhir.includes(bayar.payment_status) || (bayar.payment_status === 'SUCCESS' && input.status !== 'REFUNDED' && input.status !== 'PARTIALLY_REFUNDED')) {
      return null
    }

    // Seluruh referensi ke $2 diberi cast eksplisit ke tipe enum dan teks.
    // Tanpa itu PostgreSQL menebak tipe $2 dari pemakaian pertamanya sebagai
    // enum, lalu menolak pemakaian berikutnya yang membandingkannya dengan
    // literal teks, dan galatnya muncul sebagai "inconsistent types deduced for
    // parameter $2" yang sama sekali tidak menyebut kolom mana yang bermasalah.
    await client.query(
      `UPDATE payments
       SET payment_status = $2::"PaymentStatus",
           paid_at = CASE WHEN $2::text = 'SUCCESS' THEN COALESCE(paid_at, now()) ELSE paid_at END,
           payment_method = COALESCE($3::text, payment_method),
           provider_transaction_id = COALESCE($4::text, provider_transaction_id),
           updated_at = now()
       WHERE id = $1`,
      [
        bayar.id,
        input.status,
        input.method ?? null,
        input.providerTransactionId ?? null,
      ],
    )

    await catatRiwayat(
      client,
      bayar.id,
      bayar.payment_status,
      input.status,
      input.sumber,
      input.keterangan,
    )

    // Tagihan mengikuti uang yang benar-benar masuk, bukan jumlah pembayaran
    // yang dibuat: pembayaran sebagian yang tidak jadi dibayar tidak boleh
    // membuat tagihannya tampak terbayar sebagian.
    //
    // Hasil CASE diberi cast eksplisit: dua cabangnya literal teks, sedangkan
    // kolomnya bertipe enum, dan PostgreSQL menolak menulis teks ke kolom enum
    // tanpa cast walaupun nilainya sama persis.
    if (bayar.invoice_id && input.status === 'SUCCESS') {
      await client.query(
        `UPDATE invoices
         SET invoice_status = (CASE
               WHEN COALESCE(bayar.dibayar, 0) >= invoices.total_amount THEN 'PAID'
               ELSE 'PARTIALLY_PAID'
             END)::"InvoiceStatus",
             updated_at = now()
         FROM (
           SELECT COALESCE(sum(amount), 0) AS dibayar
           FROM payments
           WHERE invoice_id = $1 AND payment_status = 'SUCCESS'
         ) bayar
         WHERE invoices.id = $1`,
        [bayar.invoice_id],
      )
    }

    // Pembayaran pertama sebuah booking yang berhasil menandai sewanya
    // dikonfirmasi: uang pangkalnya sudah masuk, dan kamarnya dikunci untuknya.
    if (bayar.booking_id && input.status === 'SUCCESS') {
      const bookingRows = await client.query<{ room_id: string; status: string }>(
        `UPDATE bookings
         SET status = 'CONFIRMED', updated_at = now()
         WHERE id = $1 AND status IN ('APPROVED', 'AWAITING_PAYMENT')
         RETURNING room_id, status`,
        [bayar.booking_id],
      )

      const booking = bookingRows[0]

      if (booking) {
        await client.query(
          `INSERT INTO booking_status_histories (booking_id, previous_status, new_status, changed_by, reason)
           VALUES ($1, $2, 'CONFIRMED', NULL, $3)`,
          [bayar.booking_id, booking.status, 'Pembayaran pertama diterima'],
        )

        await client.query(
          `UPDATE rooms SET availability_status = 'RESERVED'
           WHERE id = $1 AND availability_status = 'AVAILABLE'`,
          [booking.room_id],
        )
      }
    }

    return {
      tenantId: bayar.tenant_id,
      invoiceId: bayar.invoice_id,
      bookingId: bayar.booking_id,
      nomor: bayar.payment_code,
      jumlah: angka(bayar.amount),
    }
  })

  if (hasil) {
    // Pemberitahuan dikirim setelah transaksi tersimpan, dan kegagalannya tidak
    // membatalkan perubahan status yang sudah sah.
    await notificationsService.create({
      userId: hasil.tenantId,
      jenis: input.status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'NEW_INVOICE',
      judul:
        input.status === 'SUCCESS'
          ? 'Pembayaran diterima'
          : input.status === 'EXPIRED'
            ? 'Pembayaran kedaluwarsa'
            : 'Pembayaran gagal',
      pesan:
        input.status === 'SUCCESS'
          ? `Pembayaran ${hasil.nomor} sebesar Rp${hasil.jumlah.toLocaleString('id-ID')} sudah kami terima.`
          : `Pembayaran ${hasil.nomor} sebesar Rp${hasil.jumlah.toLocaleString('id-ID')} tidak berhasil. Anda bisa membuat pembayaran baru.`,
      entityType: 'payment',
      entityId: input.paymentId,
    })

    // Pemilik properti perlu tahu uangnya masuk tanpa harus membuka daftar.
    if (input.status === 'SUCCESS' && hasil.invoiceId) {
      const pemilik = await queryOne<{ owner_id: string }>(
        `SELECT owner_id FROM invoices WHERE id = $1`,
        [hasil.invoiceId],
      )

      if (pemilik) {
        await notificationsService.create({
          userId: pemilik.owner_id,
          jenis: 'PAYMENT_RECEIVED',
          judul: 'Pembayaran masuk',
          pesan: `Pembayaran ${hasil.nomor} sebesar Rp${hasil.jumlah.toLocaleString('id-ID')} sudah diterima.`,
          entityType: 'invoice',
          entityId: hasil.invoiceId,
        })
      }
    }
  }

  return hasil ?? {
    tenantId: '',
    invoiceId: null,
    bookingId: null,
    nomor: '',
    jumlah: 0,
  }
}

export const paymentsService = {
  /**
   * Buat pembayaran untuk sebuah tagihan atau booking.
   *
   * Yang boleh membuat adalah penghuni yang bersangkutan; pemilik tidak, karena
   * pemilik tidak membayar sewanya sendiri. Admin juga tidak: menandai uang
   * masuk atas nama orang lain adalah jalur yang tidak boleh ada di aplikasi,
   * dan kalau memang perlu ada koreksi, jalurnya langsung ke database dengan
   * catatan.
   */
  async create(user: AuthUser, input: CreatePaymentInput) {
    const sumber = input.invoiceId
      ? await queryOne<{
          tenant_id: string
          amount: string
          dibayar: string
          status: string
          judul: string
          booking_id: string | null
        }>(
          `SELECT i.tenant_id,
                  i.total_amount AS amount,
                  COALESCE((
                    SELECT sum(amount) FROM payments
                    WHERE invoice_id = i.id AND payment_status = 'SUCCESS'
                  ), 0) AS dibayar,
                  i.invoice_status AS status,
                  i.invoice_number AS judul,
                  i.booking_id
           FROM invoices i
           WHERE i.id = $1`,
          [input.invoiceId],
        )
      : await queryOne<{
          tenant_id: string
          amount: string
          dibayar: string
          status: string
          judul: string
          booking_id: string | null
        }>(
          `SELECT b.tenant_id,
                  b.total_amount AS amount,
                  COALESCE((
                    SELECT sum(amount) FROM payments
                    WHERE booking_id = b.id AND payment_status = 'SUCCESS'
                  ), 0) AS dibayar,
                  b.status,
                  b.booking_code AS judul,
                  b.id AS booking_id
           FROM bookings b
           WHERE b.id = $1`,
          [input.bookingId],
        )

    if (!sumber) {
      throw new HttpError(404, input.invoiceId ? 'Tagihan tidak ditemukan' : 'Booking tidak ditemukan')
    }

    if (sumber.tenant_id !== user.userId) {
      throw new HttpError(404, 'Tagihan tidak ditemukan')
    }

    if (sumber.status === 'CANCELLED') {
      throw new HttpError(409, 'Tagihan ini sudah dibatalkan, jadi tidak perlu dibayar')
    }

    if (input.invoiceId && sumber.status === 'DRAFT') {
      throw new HttpError(409, 'Tagihan ini belum dikirim pemiliknya, jadi belum bisa dibayar')
    }

    if (!input.invoiceId && sumber.status !== 'APPROVED' && sumber.status !== 'AWAITING_PAYMENT') {
      throw new HttpError(
        409,
        `Booking berstatus ${sumber.status} tidak sedang menunggu pembayaran`,
      )
    }

    const total = angka(sumber.amount)
    const sudahDibayar = angka(sumber.dibayar)
    const sisa = Math.max(0, total - sudahDibayar)

    if (sisa <= 0) {
      throw new HttpError(409, 'Tagihan ini sudah lunas')
    }

    /**
     * Jumlahnya ditentukan di sini, bukan diterima apa adanya dari klien.
     *
     * Untuk booking, jumlahnya harus penuh: cicilan untuk uang pangkal bukan
     * hal yang disepakati di platform ini. Untuk tagihan, pembayaran sebagian
     * diperbolehkan, tetapi tidak boleh melebihi sisanya: kelebihan bayar yang
     * tersimpan sebagai angka di tagihan akan salah dibaca penghuni berikutnya.
     */
    const jumlah = input.invoiceId ? angka(input.amount ?? sisa) : total - sudahDibayar

    if (jumlah <= 0) {
      throw new HttpError(400, 'Jumlah pembayaran harus lebih dari 0')
    }

    if (jumlah > sisa) {
      throw new HttpError(
        400,
        `Jumlah pembayaran melebihi sisa tagihan (Rp${sisa.toLocaleString('id-ID')})`,
      )
    }

    const kedaluwarsa = new Date(Date.now() + PEMBAYARAN_BERLAKU_JAM * 60 * 60 * 1000)

    const dibuat = await queryOne<{
      id: string
      payment_code: string
      amount: string
      expired_at: Date
      invoice_id: string | null
      booking_id: string | null
    }>(
      `INSERT INTO payments (
         invoice_id, tenant_id, booking_id, payment_code, amount,
         payment_provider, payment_method, payment_status, expired_at
       )
       VALUES (
         $1, $2, $3,
         'PAY-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
         $4, 'midtrans', $5, 'PENDING', $6
       )
       RETURNING id, payment_code, amount, expired_at, invoice_id, booking_id`,
      [
        input.invoiceId ?? null,
        user.userId,
        sumber.booking_id,
        jumlah,
        input.method ?? null,
        kedaluwarsa.toISOString(),
      ],
    )

    if (!dibuat) throw new HttpError(500, 'Pembayaran gagal disimpan')

    await query(
      `INSERT INTO payment_status_histories
         (payment_id, previous_status, new_status, source, description)
       VALUES ($1, NULL, 'PENDING', 'pengguna', $2)`,
      [dibuat.id, 'Pembayaran dibuat, menunggu diselesaikan'],
    )

    // Tautan pembayaran diminta ke penyedia. Kalau penyedia belum
    // dikonfigurasi, barisnya tetap ada dalam keadaan menunggu: penghuni bisa
    // mencoba lagi setelah pengelola melengkapi kuncinya, dan yang penting,
    // tidak ada status berhasil yang dikarang di sini.
    if (!midtransConfigured()) {
      return {
        ...keBentuk(
          (await queryOne<PembayaranRow>(`SELECT ${KOLOM} ${DARI} WHERE pay.id = $1`, [dibuat.id]))!,
        ),
        redirectUrl: null,
        providerReady: false,
        pesan:
          'Penyedia pembayaran belum dikonfigurasi pengelola, jadi tautan pembayaran belum bisa dibuat.',
      }
    }

    const profil = await queryOne<{ full_name: string; email: string }>(
      `SELECT full_name, email FROM users WHERE id = $1`,
      [user.userId],
    )

    try {
      const transaksi = await buatTransaksi({
        orderId: dibuat.payment_code,
        amount: jumlah,
        itemName: sumber.judul,
        customerName: profil?.full_name ?? 'Penghuni',
        customerEmail: profil?.email ?? 'penghuni@kosplatform.test',
        expiryHours: PEMBAYARAN_BERLAKU_JAM,
      })

      await query(
        `UPDATE payments SET provider_order_id = $2, updated_at = now() WHERE id = $1`,
        [dibuat.id, dibuat.payment_code],
      )

      return {
        ...keBentuk(
          (await queryOne<PembayaranRow>(`SELECT ${KOLOM} ${DARI} WHERE pay.id = $1`, [dibuat.id]))!,
        ),
        redirectUrl: transaksi.redirectUrl,
        providerReady: true,
      }
    } catch (error) {
      // Barisnya tidak dihapus: kegagalan penyedia bisa karena jaringannya
      // sedang putus, dan pembayaran yang sama boleh dicoba lagi tanpa
      // membuat baris baru yang menumpuk.
      return {
        ...keBentuk(
          (await queryOne<PembayaranRow>(`SELECT ${KOLOM} ${DARI} WHERE pay.id = $1`, [dibuat.id]))!,
        ),
        redirectUrl: null,
        providerReady: false,
        pesan: (error as Error).message,
      }
    }
  },

  async list(user: AuthUser, params: ListPaymentsQuery) {
    const kondisi = [
      user.role === 'ADMIN'
        ? 'TRUE'
        : user.role === 'OWNER'
          ? `pay.invoice_id IN (SELECT id FROM invoices WHERE owner_id = $1)`
          : 'pay.tenant_id = $1',
    ]

    const values: unknown[] = user.role === 'ADMIN' ? [] : [user.userId]

    if (params.status) {
      values.push(params.status)
      kondisi.push(`pay.payment_status = $${values.length}`)
    }

    if (params.invoiceId) {
      values.push(params.invoiceId)
      kondisi.push(`pay.invoice_id = $${values.length}`)
    }

    await kedaluwarsakan(kondisi.join(' AND '), values)

    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number; masuk: string }>(
      `SELECT
         count(*)::int AS total,
         COALESCE(sum(pay.amount) FILTER (WHERE pay.payment_status = 'SUCCESS'), 0) AS masuk
       FROM payments pay ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<PembayaranRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY pay.created_at DESC
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
        totalDiterima: angka(hitung?.masuk),
      },
    }
  },

  async detail(user: AuthUser, id: string) {
    const penyaring = user.role === 'ADMIN'
      ? { sql: 'TRUE', values: [] as unknown[] }
      : user.role === 'OWNER'
        ? {
            sql: 'pay.invoice_id IN (SELECT id FROM invoices WHERE owner_id = $1)',
            values: [user.userId],
          }
        : { sql: 'pay.tenant_id = $1', values: [user.userId] }

    await kedaluwarsakan(penyaring.sql, penyaring.values)

    const row = await queryOne<PembayaranRow>(`SELECT ${KOLOM} ${DARI} WHERE pay.id = $1`, [id])

    if (!row) throw new HttpError(404, 'Pembayaran tidak ditemukan')

    const bolehLihat =
      user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId

    if (!bolehLihat) throw new HttpError(404, 'Pembayaran tidak ditemukan')

    const riwayat = await query<{
      id: string
      previous_status: string | null
      new_status: string
      source: string | null
      description: string | null
      created_at: Date
    }>(
      `SELECT id, previous_status, new_status, source, description, created_at
       FROM payment_status_histories
       WHERE payment_id = $1
       ORDER BY created_at ASC`,
      [id],
    )

    return {
      ...keBentuk(row),
      history: riwayat.map((baris) => ({
        id: baris.id,
        previousStatus: baris.previous_status,
        newStatus: baris.new_status,
        source: baris.source,
        description: baris.description,
        createdAt: baris.created_at.toISOString(),
      })),
    }
  },

  /**
   * Terima notifikasi penyedia pembayaran.
   *
   * Urutan pemeriksaannya menentukan keamanannya, jadi tidak boleh diubah:
   *
   *   1. Tanda tangannya diperiksa lebih dulu. Permintaan tanpa tanda tangan
   *      yang sah ditolak sebelum satu pun nilai di dalamnya dipakai, karena
   *      alamat ini terbuka untuk umum dan siapa pun bisa mengirim apa saja.
   *   2. Jumlah yang diberitakan dicocokkan dengan jumlah yang tercatat. Kalau
   *      berbeda, notifikasinya tidak dipakai: selisih sekecil apa pun berarti
   *      ada yang tidak beres di salah satu sisi, dan menandai lunas berdasarkan
   *      angka kiriman orang lain adalah cara paling mudah kehilangan uang.
   *   3. Baru sesudahnya statusnya diterapkan, dan setiap notifikasi dicatat
   *      supaya pengiriman ulang yang sama tidak diproses dua kali.
   */
  async webhook(input: WebhookInput) {
    if (!tandaTanganSah({
      orderId: input.order_id,
      statusCode: input.status_code,
      grossAmount: input.gross_amount,
      signature: input.signature_key,
    })) {
      throw new HttpError(401, 'Tanda tangan notifikasi tidak sah')
    }

    const bayar = await queryOne<{ id: string; amount: string; payment_status: string }>(
      `SELECT id, amount, payment_status FROM payments WHERE payment_code = $1`,
      [input.order_id],
    )

    if (!bayar) {
      throw new HttpError(404, 'Pembayaran dengan kode itu tidak ditemukan')
    }

    if (angka(bayar.amount) !== angka(input.gross_amount)) {
      console.error(
        `[payments] jumlah tidak cocok untuk ${input.order_id}: tercatat ${bayar.amount}, diberitakan ${input.gross_amount}`,
      )
      throw new HttpError(400, 'Jumlah pembayaran tidak cocok dengan yang tercatat')
    }

    const kunciPeristiwa = `${input.transaction_id ?? input.order_id}:${input.transaction_status}:${input.settlement_time ?? ''}`

    const peristiwa = await queryOne<{ id: string }>(
      `INSERT INTO payment_webhook_events
         (provider, event_id, provider_transaction_id, payload, processing_status, processed_at)
       VALUES ('midtrans', $1, $2, $3::jsonb, 'processed', now())
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [kunciPeristiwa, input.transaction_id ?? null, JSON.stringify(input)],
    )

    // Sudah pernah diproses: jawabannya tetap sukses, supaya penyedia berhenti
    // mengirim ulang, tetapi statusnya tidak diubah dua kali.
    if (!peristiwa) {
      return { status: 'diabaikan', alasan: 'Notifikasi ini sudah pernah diproses' }
    }

    const status = statusDariPenyedia(input.transaction_status, input.fraud_status)

    if (!status) {
      return { status: 'diabaikan', alasan: `Status ${input.transaction_status} belum ditangani` }
    }

    await terapkanStatus({
      paymentId: bayar.id,
      status,
      sumber: 'webhook',
      keterangan: `Notifikasi penyedia: ${input.transaction_status}`,
      providerTransactionId: input.transaction_id ?? null,
      method: input.payment_type ?? null,
    })

    return { status: 'diproses', paymentStatus: status }
  },

  /**
   * Tandai sebuah pembayaran berhasil, tanpa penyedia pembayaran.
   *
   * Hanya ada di lingkungan pengembangan, dan hanya untuk penghuni pemilik
   * pembayarannya sendiri. Tanpa ini, alur sewa tidak bisa dicoba sama sekali
   * sebelum kunci penyedia pembayaran diisi, dan alur yang tidak pernah dicoba
   * adalah alur yang rusak saat pertama dipakai.
   *
   * Di produksi endpoint ini tidak terdaftar sama sekali, bukan sekadar
   * menolak: satu jalur yang bisa menandai uang masuk tanpa bukti tidak boleh
   * ada di sana dengan alasan apa pun.
   */
  async simulasi(user: AuthUser, id: string) {
    const bayar = await queryOne<{ id: string; tenant_id: string; payment_status: string }>(
      `SELECT id, tenant_id, payment_status FROM payments WHERE id = $1`,
      [id],
    )

    if (!bayar) throw new HttpError(404, 'Pembayaran tidak ditemukan')

    if (bayar.tenant_id !== user.userId) {
      throw new HttpError(404, 'Pembayaran tidak ditemukan')
    }

    if (bayar.payment_status !== 'PENDING') {
      throw new HttpError(409, `Pembayaran ini sudah berstatus ${bayar.payment_status}`)
    }

    await terapkanStatus({
      paymentId: bayar.id,
      status: 'SUCCESS',
      sumber: 'simulasi-pengembangan',
      keterangan: 'Ditandai berhasil lewat simulasi pengembangan',
    })

    return this.detail(user, id)
  },
}

/**
 * Terjemahkan status penyedia menjadi status kita.
 *
 * Pemetaannya sengaja eksplisit, bukan pencocokan kata: "settlement" dan
 * "capture" sama-sama berarti uangnya masuk, sedangkan "deny", "cancel",
 * "expire", dan "failure" berarti tidak. Apa pun yang tidak dikenali
 * menghasilkan `null`, dan notifikasi seperti itu diabaikan alih-alih ditebak.
 */
const statusDariPenyedia = (
  transactionStatus: string,
  fraudStatus?: string,
): 'SUCCESS' | 'FAILED' | 'EXPIRED' | null => {
  if (transactionStatus === 'settlement') return 'SUCCESS'

  // "capture" baru berarti lunas kalau penyedia menyatakan lolos pemeriksaan
  // kecurangannya. Tanpa syarat itu, transaksi yang ditandai mencurigakan akan
  // tercatat masuk padahal uangnya belum tentu diterima.
  if (transactionStatus === 'capture') {
    return fraudStatus === 'accept' ? 'SUCCESS' : null
  }

  if (transactionStatus === 'expire') return 'EXPIRED'
  if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'failure') {
    return 'FAILED'
  }

  return null
}
