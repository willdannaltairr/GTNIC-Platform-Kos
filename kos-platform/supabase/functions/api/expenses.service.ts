import { query, queryOne } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import type { AuthUser } from './_shared/auth.ts'
import type {
  CreateExpenseInput,
  ListExpensesQuery,
  RingkasanKeuanganQuery,
  UpdateExpenseInput,
} from './expenses.validator.ts'

/**
 * Keuangan properti: pengeluaran pemilik, dan ringkasan untung-ruginya.
 *
 * Aturan yang menentukan bentuk modul ini: pengeluaran melekat pada PROPERTI,
 * bukan pada pemiliknya, dan pemiliknya dibaca dari baris properti itu. Pemilik
 * yang menjual kosnya karena itu berhenti melihat pengeluaran kos tersebut,
 * dan pemilik barunya langsung melihatnya — tanpa ada satu pun baris yang
 * perlu diperbarui saat propertinya berpindah tangan.
 *
 * Angka pemasukan diambil dari tagihan yang sudah LUNAS, bukan dari tagihan
 * yang terbit: yang belum dibayar belum jadi uang, dan menampilkannya sebagai
 * pemasukan membuat pemilik mengira bisa membelanjakan sesuatu yang belum ada.
 * Pembayaran yang sudah masuk tapi tagihannya masih berstatus sebagian tetap
 * dihitung sebesar yang benar-benar masuk.
 */

interface BiayaRow {
  id: string
  property_id: string
  property_name: string
  category: string
  amount: string
  description: string | null
  date: Date
  created_at: Date
}

const KOLOM = `
  e.id, e.property_id, p.name AS property_name,
  e.category, e.amount, e.description, e.date, e.created_at
`

const DARI = `
  FROM expenses e
  JOIN properties p ON p.id = e.property_id
`

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const tanggal = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

const keBentuk = (row: BiayaRow) => ({
  id: row.id,
  propertyId: row.property_id,
  propertyName: row.property_name,
  category: row.category,
  amount: angka(row.amount),
  description: row.description,
  date: tanggal(row.date),
  createdAt: tanggal(row.created_at),
})

/**
 * Pemeriksaan kepemilikan properti.
 *
 * Satu tempat, dipakai pembuatan, perubahan, dan penghapusan: pengeluaran
 * yang tercatat di properti orang lain tidak boleh bisa dibaca apalagi diubah,
 * dan pemeriksaan yang ditulis ulang di tiga tempat adalah tiga kesempatan
 * untuk lupa.
 *
 * Properti yang tidak ada dan properti milik orang lain sama-sama dijawab 404,
 * supaya keberadaan properti orang lain tidak bocor lewat perbedaan 403 dan 404.
 */
const propertiMilik = async (user: AuthUser, propertyId: string): Promise<string> => {
  const row = await queryOne<{ id: string; owner_id: string }>(
    `SELECT id, owner_id FROM properties WHERE id = $1 AND deleted_at IS NULL`,
    [propertyId],
  )

  if (!row) throw new HttpError(404, 'Properti tidak ditemukan')

  if (user.role !== 'ADMIN' && row.owner_id !== user.userId) {
    throw new HttpError(404, 'Properti tidak ditemukan')
  }

  return row.id
}

/**
 * Ambil satu pengeluaran dengan pemeriksaan hak akses.
 *
 * Yang boleh hanya pemilik propertinya dan admin. Penghuni tidak: pengeluaran
 * pemilik adalah pembukuan usahanya, bukan urusan orang yang menyewa kamar.
 */
const ambil = async (user: AuthUser, id: string): Promise<BiayaRow> => {
  const row = await queryOne<BiayaRow & { owner_id: string }>(
    `SELECT ${KOLOM}, p.owner_id ${DARI} WHERE e.id = $1`,
    [id],
  )

  if (!row) throw new HttpError(404, 'Catatan pengeluaran tidak ditemukan')

  if (user.role !== 'ADMIN' && row.owner_id !== user.userId) {
    throw new HttpError(404, 'Catatan pengeluaran tidak ditemukan')
  }

  return row
}

/** Satu bulan dalam bentuk teks `YYYY-MM`, untuk mengelompokkan deret bulanan. */
const bulanDari = (nilai: Date): string =>
  `${nilai.getUTCFullYear()}-${String(nilai.getUTCMonth() + 1).padStart(2, '0')}`

export const expensesService = {
  /**
   * Catat satu pengeluaran.
   *
   * Hanya pemilik propertinya (atau admin). Penghuni yang mencoba mencatat
   * pengeluaran di kos yang ia sewa akan mengacaukan pembukuan pemiliknya
   * tanpa pernah diminta.
   */
  async create(user: AuthUser, input: CreateExpenseInput) {
    /**
     * Peran diperiksa lebih dulu, terpisah dari kepemilikan propertinya.
     *
     * Penghuni yang mencoba mencatat dijawab 403 dengan aturannya, bukan 404:
     * ia memang bukan pihak yang boleh mencatat pengeluaran sama sekali, dan
     * aturan itu perlu terbaca. Yang 404 adalah pemilik atau admin yang
     * menyebut properti bukan miliknya, supaya keberadaan properti orang lain
     * tidak bocor dari perbedaan kode balasannya.
     */
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new HttpError(
        403,
        'Pengeluaran properti dicatat pemiliknya. Penghuni tidak perlu mencatat biaya operasional kos yang ia sewa.',
      )
    }

    await propertiMilik(user, input.propertyId)

    const row = await queryOne<BiayaRow>(
      `WITH baru AS (
         INSERT INTO expenses (property_id, category, amount, description, date)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))
         RETURNING *
       )
       SELECT ${KOLOM} FROM baru e
       JOIN properties p ON p.id = e.property_id`,
      [
        input.propertyId,
        input.category,
        input.amount,
        input.description ?? null,
        input.date ?? null,
      ],
    )

    if (!row) throw new HttpError(500, 'Catatan pengeluaran gagal disimpan')

    return keBentuk(row)
  },

  /**
   * Daftar pengeluaran pada properti yang boleh dilihat pemanggilnya.
   *
   * Penyaringnya ditentukan peran, bukan diserahkan ke pemanggil: pemilik
   * melihat seluruh propertinya, admin melihat semuanya, dan penghuni tidak
   * melihat apa pun.
   */
  async list(user: AuthUser, params: ListExpensesQuery) {
    const kondisi: string[] = ['p.deleted_at IS NULL']
    const values: unknown[] = []

    if (user.role !== 'ADMIN') {
      values.push(user.userId)
      kondisi.push(`p.owner_id = $${values.length}`)
    }

    if (params.propertyId) {
      values.push(params.propertyId)
      kondisi.push(`e.property_id = $${values.length}`)
    }

    if (params.category) {
      values.push(params.category)
      kondisi.push(`e.category = $${values.length}`)
    }

    if (params.from) {
      values.push(params.from)
      kondisi.push(`e.date >= $${values.length}::timestamptz`)
    }

    if (params.to) {
      values.push(params.to)
      kondisi.push(`e.date <= $${values.length}::timestamptz`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number; jumlah: string | null }>(
      `SELECT count(*)::int AS total, sum(e.amount) AS jumlah ${DARI} ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    const nilaiHalaman = [...values, params.limit, offset]

    const rows = await query<BiayaRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY e.date DESC, e.created_at DESC
       LIMIT $${nilaiHalaman.length - 1} OFFSET $${nilaiHalaman.length}`,
      nilaiHalaman,
    )

    const total = hitung?.total ?? 0

    return {
      items: rows.map(keBentuk),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
        /** Jumlah seluruh pengeluaran yang cocok dengan penyaringnya, bukan halaman ini saja. */
        totalPengeluaran: angka(hitung?.jumlah),
      },
    }
  },

  async detail(user: AuthUser, id: string) {
    return keBentuk(await ambil(user, id))
  },

  /**
   * Ubah satu pengeluaran.
   *
   * Propertinya boleh dipindahkan, dan itu disengaja: pengeluaran yang
   * tercatat di kos yang salah lebih berguna dipindahkan daripada dihapus lalu
   * dicatat ulang, terutama karena tanggalnya sering sudah tidak diingat lagi.
   */
  async update(user: AuthUser, id: string, input: UpdateExpenseInput) {
    await ambil(user, id)

    if (input.propertyId) await propertiMilik(user, input.propertyId)

    const row = await queryOne<BiayaRow>(
      `WITH diubah AS (
         UPDATE expenses SET
           property_id = COALESCE($2, property_id),
           category = COALESCE($3, category),
           amount = COALESCE($4, amount),
           description = COALESCE($5, description),
           date = COALESCE($6::timestamptz, date)
         WHERE id = $1
         RETURNING *
       )
       SELECT ${KOLOM} FROM diubah e
       JOIN properties p ON p.id = e.property_id`,
      [
        id,
        input.propertyId ?? null,
        input.category ?? null,
        input.amount ?? null,
        input.description ?? null,
        input.date ?? null,
      ],
    )

    if (!row) throw new HttpError(500, 'Catatan pengeluaran gagal diperbarui')

    return keBentuk(row)
  },

  /**
   * Hapus satu pengeluaran.
   *
   * Tidak ada penanda lunak di sini: pengeluaran yang salah catat memang tidak
   * perlu dikenang, berbeda dari tagihan atau kontrak yang menyimpan
   * kesepakatan dua pihak.
   */
  async remove(user: AuthUser, id: string) {
    await ambil(user, id)

    const rows = await query<{ id: string }>(`DELETE FROM expenses WHERE id = $1 RETURNING id`, [id])

    if (rows.length === 0) throw new HttpError(404, 'Catatan pengeluaran tidak ditemukan')

    return { id }
  },

  /**
   * Ringkasan untung-rugi beberapa bulan terakhir.
   *
   * Pemasukan dihitung dari PEMBAYARAN yang berhasil, bukan dari tagihan yang
   * terbit: yang belum dibayar belum jadi uang. Waktunya diambil dari
   * `paid_at`, saat uangnya benar-benar masuk, bukan dari tanggal tagihannya
   * dibuat — tagihan yang terbit bulan lalu dan dibayar bulan ini adalah
   * pemasukan bulan ini.
   *
   * Uang pangkal booking ikut terhitung walaupun belum ada kontrak: pembayaran
   * itu nyata masuk ke pemiliknya, dan mengabaikannya membuat bulan pertama
   * setiap penyewa terlihat seperti bulan tanpa pemasukan.
   *
   * Deret bulannya dibuat di sini, bukan diambil dari hasil query: query hanya
   * mengembalikan bulan yang punya baris, sedangkan bulan tanpa transaksi tetap
   * harus muncul dengan nilai nol. Bulan yang hilang dari grafik terbaca
   * sebagai bulan yang datanya gagal dimuat.
   */
  async ringkasan(user: AuthUser, params: RingkasanKeuanganQuery) {
    /**
     * Penyaring pemilik SELALU merujuk parameternya, termasuk waktu yang
     * membacanya admin yang tidak menyaring apa pun.
     *
     * Bentuk `($n::uuid IS NULL OR ...)` dipakai, bukan potongan yang hilang
     * untuk admin, karena query yang kadang memakai dan kadang tidak memakai
     * satu parameter membuat jumlah parameter yang dikirim tidak pernah pasti
     * cocok dengan yang dirujuk. PostgreSQL menolak ketidakcocokan itu sebagai
     * galat — dan itulah yang membuat endpoint ini balas 500 sebelum
     * diperbaiki, baik untuk pemilik maupun admin.
     */
    const pemilik = user.role === 'ADMIN' ? null : user.userId

    /** Parameter bulan + pemilik; urutannya sama dengan penomoran di bawah. */
    const nilai: unknown[] = [params.bulan, pemilik]

    const pemasukan = await query<{ bulan: string; jumlah: string }>(
      `SELECT to_char(date_trunc('month', pm.paid_at), 'YYYY-MM') AS bulan,
              sum(pm.amount) AS jumlah
       FROM payments pm
       LEFT JOIN invoices i ON i.id = pm.invoice_id
       LEFT JOIN contracts c ON c.id = i.contract_id
       LEFT JOIN bookings b ON b.id = COALESCE(i.booking_id, pm.booking_id)
       JOIN properties p ON p.id = COALESCE(c.property_id, b.property_id)
       WHERE pm.payment_status = 'SUCCESS'
         AND pm.paid_at IS NOT NULL
         AND pm.paid_at >= date_trunc('month', now()) - make_interval(months => $1::int - 1)
         AND p.deleted_at IS NULL
         AND ($2::uuid IS NULL OR p.owner_id = $2)
       GROUP BY 1
       ORDER BY 1`,
      nilai,
    )

    const pengeluaran = await query<{ bulan: string; jumlah: string }>(
      `SELECT to_char(date_trunc('month', e.date), 'YYYY-MM') AS bulan, sum(e.amount) AS jumlah
       FROM expenses e
       JOIN properties p ON p.id = e.property_id
       WHERE e.date >= date_trunc('month', now()) - make_interval(months => $1::int - 1)
         AND p.deleted_at IS NULL
         AND ($2::uuid IS NULL OR p.owner_id = $2)
       GROUP BY 1
       ORDER BY 1`,
      nilai,
    )

    // Deret bulannya dibuat di sini, bukan diambil dari salah satu query:
    // keduanya hanya mengembalikan bulan yang punya baris.
    const sekarang = new Date()
    const deret: string[] = []

    for (let i = params.bulan - 1; i >= 0; i -= 1) {
      const titik = new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() - i, 1))
      deret.push(bulanDari(titik))
    }

    const petaMasuk = new Map(pemasukan.map((row) => [row.bulan, angka(row.jumlah)]))
    const petaKeluar = new Map(pengeluaran.map((row) => [row.bulan, angka(row.jumlah)]))

    const bulanan = deret.map((bulan) => {
      const masuk = petaMasuk.get(bulan) ?? 0
      const keluar = petaKeluar.get(bulan) ?? 0

      return { bulan, pemasukan: masuk, pengeluaran: keluar, selisih: masuk - keluar }
    })

    const totalMasuk = bulanan.reduce((jumlah, item) => jumlah + item.pemasukan, 0)
    const totalKeluar = bulanan.reduce((jumlah, item) => jumlah + item.pengeluaran, 0)

    /** Rincian pengeluaran per kategori pada rentang yang sama. */
    const perKategori = await query<{ category: string; jumlah: string; jumlah_baris: number }>(
      `SELECT e.category, sum(e.amount) AS jumlah, count(*)::int AS jumlah_baris
       FROM expenses e
       JOIN properties p ON p.id = e.property_id
       WHERE e.date >= date_trunc('month', now()) - make_interval(months => $1::int - 1)
         AND p.deleted_at IS NULL
         AND ($2::uuid IS NULL OR p.owner_id = $2)
       GROUP BY e.category
       ORDER BY 2 DESC`,
      nilai,
    )

    /**
     * Tagihan yang belum lunas tidak dihitung sebagai pemasukan, tetapi
     * jumlahnya tetap ditampilkan: pemilik perlu tahu ada uang yang masih
     * berjalan, dan tanpa angka ini ia akan mengira pemasukan bulan ini
     * memang serendah itu.
     *
     * Propertinya dibaca dari kontrak ATAU booking, sama seperti modul tagihan:
     * tagihan dari booking yang belum berlanjut ke kontrak tetap milik pemilik
     * properti itu.
     *
     * Query ini TIDAK dibatasi rentang bulan — yang ditanyakan "berapa yang
     * masih berjalan", dan tagihan tertunggak dari tiga bulan lalu masih
     * berjalan sampai dibayar. Karena itu parameternya sendiri: hanya pemilik,
     * di posisi pertama.
     */
    const belumLunas = await queryOne<{ jumlah: string | null; jumlah_tagihan: number }>(
      `SELECT sum(i.total_amount - COALESCE(bayar.amount, 0)) AS jumlah,
              count(*)::int AS jumlah_tagihan
       FROM invoices i
       LEFT JOIN contracts c ON c.id = i.contract_id
       LEFT JOIN bookings b ON b.id = i.booking_id
       JOIN properties p ON p.id = COALESCE(c.property_id, b.property_id)
       LEFT JOIN (
         SELECT invoice_id, sum(amount) AS amount FROM payments
         WHERE payment_status = 'SUCCESS' GROUP BY invoice_id
       ) bayar ON bayar.invoice_id = i.id
       WHERE i.invoice_status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
         AND p.deleted_at IS NULL
         AND ($1::uuid IS NULL OR p.owner_id = $1)`,
      [pemilik],
    )

    return {
      bulanan,
      totalPemasukan: totalMasuk,
      totalPengeluaran: totalKeluar,
      selisih: totalMasuk - totalKeluar,
      perKategori: perKategori.map((row) => ({
        category: row.category,
        jumlah: angka(row.jumlah),
        jumlahBaris: row.jumlah_baris,
      })),
      belumLunas: angka(belumLunas?.jumlah),
      jumlahTagihanBelumLunas: belumLunas?.jumlah_tagihan ?? 0,
    }
  },
}
