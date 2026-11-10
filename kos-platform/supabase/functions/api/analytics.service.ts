import { query, queryOne } from './_shared/db.ts'
import type { AnalyticsQuery } from './analytics.validator.ts'

/**
 * Analitik untuk pemilik kos.
 *
 * Seluruh angkanya dihitung dari data yang sudah ada di database, tidak ada
 * satu pun yang disimpan sebagai ringkasan tersendiri. Ringkasan yang disimpan
 * akan berbeda dari kenyataan begitu ada satu perubahan yang tidak ikut
 * memperbaruinya, dan angka analitik yang tidak cocok dengan daftar di halaman
 * lain lebih buruk daripada tidak ada analitik sama sekali.
 *
 * Tiga hal yang menentukan bentuk berkas ini:
 *
 * 1. Setiap query menyaring dengan id pengguna dari token, bukan parameter yang
 *    bisa dikirim klien. Analitik pemilik adalah data milik satu orang, dan satu
 *    penyaringan yang terlewat berarti angka pemilik lain ikut terhitung.
 * 2. Agregat dihitung di dalam database. Halaman ini tidak boleh mengambil
 *    seluruh baris lalu menghitungnya di aplikasi: jumlah tagihan dan pembayaran
 *    bertambah terus, dan yang dihitung adalah rentang bulan, bukan beberapa
 *    baris terakhir.
 * 3. Kolom `numeric` datang sebagai string, jadi semua nilai uang dikonversi
 *    lewat `angka()` sebelum keluar dari sini. Tanpa itu, "1500000" sampai ke
 *    JSON sebagai teks dan diformat frontend sebagai NaN.
 */

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** Rata-rata dengan satu desimal; null bila tidak ada yang bisa dirata-ratakan. */
const desimal = (nilai: unknown): number | null => {
  if (nilai === null || nilai === undefined) return null
  const n = Number(nilai)
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null
}

/** Status tagihan yang belum lunas, sama dengan yang dipakai dashboard. */
const BELUM_LUNAS = `('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')`

export interface DeretBulanan {
  /** "2026-11" */
  bulan: string
  /** Uang yang benar-benar diterima bulan itu, dari pembayaran SUCCESS. */
  diterima: number
  /** Tagihan yang diterbitkan bulan itu, termasuk yang belum dibayar. */
  ditagihkan: number
}

export interface HunianProperti {
  id: string
  name: string
  city: string
  rooms: number
  occupied: number
  available: number
  maintenance: number
  /** 0–100, dari kamar terisi dibagi seluruh kamar properti itu. */
  tingkatHunian: number
  /** Sewa bulanan dari kamar yang terisi, per bulan. */
  nilaiTerisi: number
}

export interface UmurTagihan {
  belumJatuhTempo: number
  lewat1Sampai7: number
  lewat8Sampai30: number
  lewatLebih30: number
  totalBelumLunas: number
  jumlahBelumLunas: number
}

export interface FunnelBooking {
  diajukan: number
  disetujui: number
  ditolak: number
  batal: number
}

export interface RingkasPerbaikan {
  terbuka: number
  selesai90Hari: number
  total: number
  rataHariSelesai: number | null
}

export interface AnalitikPemilik {
  bulan: number
  deret: DeretBulanan[]
  properti: HunianProperti[]
  tagihan: UmurTagihan
  booking: FunnelBooking
  perbaikan: RingkasPerbaikan
  ringkasan: {
    kamar: number
    kamarTerisi: number
    kamarTersedia: number
    tingkatHunian: number
    pendapatanBulanIni: number
    pendapatanBulanLalu: number
    /** Persentase perubahan bulan ini dibanding bulan lalu; null bila bulan lalu nol. */
    perubahanPendapatan: number | null
  }
}

export const analyticsService = {
  async owner(userId: string, params: AnalyticsQuery): Promise<AnalitikPemilik> {
    const values = [userId, params.bulan]

    const [
      hunianRow,
      deretRows,
      propertiRows,
      tagihanRow,
      bookingRow,
      perbaikanRow,
    ] = await Promise.all([
      /**
       * Angka hunian dan pendapatan bulan berjalan.
       *
       * Tingkat hunian dihitung dari kamar, bukan dari properti: satu properti
       * berisi banyak kamar, dan properti dengan dua puluh kamar tidak boleh
       * berbobot sama dengan properti berkamar dua. Kamar berstatus perawatan
       * ikut dihitung sebagai kamar yang tidak terisi, karena selama diperbaiki
       * kamar itu memang tidak bisa disewakan.
       */
      queryOne<Record<string, unknown>>(
        `SELECT
           (SELECT count(*) FROM rooms r
             JOIN properties p ON p.id = r.property_id
             WHERE p.owner_id = $1 AND p.deleted_at IS NULL) AS kamar,
           (SELECT count(*) FROM rooms r
             JOIN properties p ON p.id = r.property_id
             WHERE p.owner_id = $1 AND p.deleted_at IS NULL
               AND r.availability_status = 'OCCUPIED') AS kamar_terisi,
           (SELECT count(*) FROM rooms r
             JOIN properties p ON p.id = r.property_id
             WHERE p.owner_id = $1 AND p.deleted_at IS NULL
               AND r.availability_status = 'AVAILABLE') AS kamar_tersedia,
           (SELECT COALESCE(sum(i.total_amount), 0) FROM invoices i
             WHERE i.owner_id = $1 AND i.invoice_status = 'PAID'
               AND date_trunc('month', COALESCE(i.issue_date, i.created_at))
                   = date_trunc('month', now())) AS pendapatan_bulan_ini,
           (SELECT COALESCE(sum(i.total_amount), 0) FROM invoices i
             WHERE i.owner_id = $1 AND i.invoice_status = 'PAID'
               AND date_trunc('month', COALESCE(i.issue_date, i.created_at))
                   = date_trunc('month', now()) - interval '1 month') AS pendapatan_bulan_lalu`,
        [userId],
      ),

      /**
       * Deret bulanan: uang yang diterima dan tagihan yang diterbitkan.
       *
       * Dua deret, bukan satu, karena keduanya menjawab pertanyaan berbeda.
       * "Diterima" menghitung pembayaran berstatus SUCCESS pada tanggal
       * pembayarannya; "ditagihkan" menghitung tagihan yang diterbitkan pada
       * bulan itu, dibayar atau belum. Selisih antara keduanya itulah yang
       * membuat pemilik tahu apakah masalahnya di jumlah tagihan atau di
       * penagihannya.
       *
       * Bulan tanpa data tetap muncul bernilai nol lewat `generate_series`.
       * Tanpa itu, bulan sepi hanya akan hilang dari grafik dan garisnya
       * melompat dari bulan sebelum ke bulan sesudahnya.
       *
       * Pemasukan dari uang pangkal booking ikut terhitung: pembayaran seperti
       * itu tidak punya tagihan, jadi penyaringnya lewat properti bookingnya.
       */
      query<Record<string, unknown>>(
        `WITH bulanan AS (
           SELECT generate_series(
                    date_trunc('month', now()) - make_interval(months => ($2::int - 1)),
                    date_trunc('month', now()),
                    interval '1 month'
                  ) AS bulan
         )
         SELECT
           to_char(b.bulan, 'YYYY-MM') AS bulan,
           COALESCE(diterima.total, 0) AS diterima,
           COALESCE(ditagihkan.total, 0) AS ditagihkan
         FROM bulanan b
         LEFT JOIN LATERAL (
           SELECT sum(p.amount) AS total
           FROM payments p
           LEFT JOIN invoices i ON i.id = p.invoice_id
           LEFT JOIN bookings bk ON bk.id = p.booking_id
           LEFT JOIN properties pb ON pb.id = bk.property_id
           WHERE p.payment_status = 'SUCCESS'
             AND date_trunc('month', COALESCE(p.paid_at, p.created_at)) = b.bulan
             AND (i.owner_id = $1 OR pb.owner_id = $1)
         ) diterima ON true
         LEFT JOIN LATERAL (
           SELECT sum(i.total_amount) AS total
           FROM invoices i
           WHERE i.owner_id = $1
             AND i.invoice_status <> 'CANCELLED'
             AND date_trunc('month', COALESCE(i.issue_date, i.created_at)) = b.bulan
         ) ditagihkan ON true
         ORDER BY b.bulan ASC`,
        values,
      ),

      /** Hunian per properti, termasuk properti yang belum punya kamar. */
      query<Record<string, unknown>>(
        `SELECT p.id, p.name, p.city,
                count(r.id)::int AS kamar,
                COALESCE(count(r.id) FILTER (WHERE r.availability_status = 'OCCUPIED'), 0)::int AS terisi,
                COALESCE(count(r.id) FILTER (WHERE r.availability_status = 'AVAILABLE'), 0)::int AS tersedia,
                COALESCE(count(r.id) FILTER (WHERE r.availability_status = 'MAINTENANCE'), 0)::int AS perawatan,
                COALESCE(sum(r.monthly_price) FILTER (WHERE r.availability_status = 'OCCUPIED'), 0) AS nilai_terisi
         FROM properties p
         LEFT JOIN rooms r ON r.property_id = p.id
         WHERE p.owner_id = $1 AND p.deleted_at IS NULL
         GROUP BY p.id, p.name, p.city
         ORDER BY p.name ASC`,
        [userId],
      ),

      /**
       * Umur tagihan yang belum lunas.
       *
       * Dibagi per rentang, bukan satu angka rata-rata: tagihan yang lewat
       * tiga hari dan yang lewat tiga bulan sama-sama "belum lunas", tetapi
       * keduanya perlu tindakan yang berbeda. Rata-rata justru menyembunyikan
       * perbedaan itu.
       *
       * Tagihan tanpa jatuh tempo masuk kelompok pertama: belum ada tenggat
       * yang bisa dilewati, jadi belum bisa disebut terlambat.
       */
      queryOne<Record<string, unknown>>(
        `SELECT
           count(*) FILTER (WHERE due_date IS NULL OR due_date >= now())::int AS belum_jatuh_tempo,
           count(*) FILTER (WHERE due_date < now()
                              AND due_date >= now() - interval '7 days')::int AS lewat_1_7,
           count(*) FILTER (WHERE due_date < now() - interval '7 days'
                              AND due_date >= now() - interval '30 days')::int AS lewat_8_30,
           count(*) FILTER (WHERE due_date < now() - interval '30 days')::int AS lewat_lebih_30,
           count(*)::int AS jumlah,
           COALESCE(sum(total_amount), 0) AS total
         FROM invoices
         WHERE owner_id = $1 AND invoice_status IN ${BELUM_LUNAS}`,
        [userId],
      ),

      /**
       * Funnel booking tiga puluh hari terakhir.
       *
       * Jendelanya tiga puluh hari, bukan seluruh riwayat, supaya angkanya
       * menggambarkan keadaan sekarang. Booking yang ditolak setahun lalu tidak
       * lagi berguna untuk menilai apakah pengajuan hari ini diterima atau tidak.
       */
      queryOne<Record<string, unknown>>(
        `SELECT
           count(*)::int AS diajukan,
           count(*) FILTER (WHERE b.status IN
             ('APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED', 'COMPLETED'))::int AS disetujui,
           count(*) FILTER (WHERE b.status = 'REJECTED')::int AS ditolak,
           count(*) FILTER (WHERE b.status IN ('CANCELLED', 'EXPIRED'))::int AS batal
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
         WHERE p.owner_id = $1
           AND b.created_at >= now() - interval '30 days'`,
        [userId],
      ),

      /**
       * Laporan perbaikan: yang masih terbuka, yang selesai, dan lama
       * penyelesaiannya.
       *
       * Lamanya dihitung dari `updated_at` saat statusnya sudah selesai. Itu
       * perkiraan terbaik yang bisa didapat tanpa tabel riwayat status; kolom
       * itu ikut berubah kalau barisnya disunting setelah selesai, jadi angkanya
       * dibaca sebagai gambaran, bukan sebagai angka resmi.
       */
      queryOne<Record<string, unknown>>(
        `SELECT
           count(*) FILTER (WHERE status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED'))::int AS terbuka,
           count(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')
                              AND updated_at >= now() - interval '90 days')::int AS selesai_90,
           count(*)::int AS total,
           avg(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
             FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) AS rata_hari
         FROM maintenance_requests
         WHERE owner_id = $1`,
        [userId],
      ),
    ])

    const h = hunianRow ?? {}
    const kamar = angka(h.kamar)
    const kamarTerisi = angka(h.kamar_terisi)

    const pendapatanBulanIni = angka(h.pendapatan_bulan_ini)
    const pendapatanBulanLalu = angka(h.pendapatan_bulan_lalu)

    // Bulan lalu nol membuat persentase tidak berarti: naik berapa pun dari nol
    // tetap tak terhingga, dan menampilkannya sebagai angka akan menyesatkan.
    // Yang ditampilkan halaman adalah "belum ada pembanding" untuk keadaan itu.
    const perubahanPendapatan =
      pendapatanBulanLalu > 0
        ? Math.round(((pendapatanBulanIni - pendapatanBulanLalu) / pendapatanBulanLalu) * 100)
        : null

    const properti: HunianProperti[] = propertiRows.map((row) => {
      const jumlahKamar = angka(row.kamar)
      const terisi = angka(row.terisi)

      return {
        id: row.id as string,
        name: row.name as string,
        city: row.city as string,
        rooms: jumlahKamar,
        occupied: terisi,
        available: angka(row.tersedia),
        maintenance: angka(row.perawatan),
        tingkatHunian: jumlahKamar > 0 ? Math.round((terisi / jumlahKamar) * 100) : 0,
        nilaiTerisi: angka(row.nilai_terisi),
      }
    })

    const t = tagihanRow ?? {}

    return {
      bulan: params.bulan,
      deret: deretRows.map((row) => ({
        bulan: row.bulan as string,
        diterima: angka(row.diterima),
        ditagihkan: angka(row.ditagihkan),
      })),
      properti,
      tagihan: {
        belumJatuhTempo: angka(t.belum_jatuh_tempo),
        lewat1Sampai7: angka(t.lewat_1_7),
        lewat8Sampai30: angka(t.lewat_8_30),
        lewatLebih30: angka(t.lewat_lebih_30),
        totalBelumLunas: angka(t.total),
        jumlahBelumLunas: angka(t.jumlah),
      },
      booking: {
        diajukan: angka((bookingRow ?? {}).diajukan),
        disetujui: angka((bookingRow ?? {}).disetujui),
        ditolak: angka((bookingRow ?? {}).ditolak),
        batal: angka((bookingRow ?? {}).batal),
      },
      perbaikan: {
        terbuka: angka((perbaikanRow ?? {}).terbuka),
        selesai90Hari: angka((perbaikanRow ?? {}).selesai_90),
        total: angka((perbaikanRow ?? {}).total),
        rataHariSelesai: desimal((perbaikanRow ?? {}).rata_hari),
      },
      ringkasan: {
        kamar,
        kamarTerisi,
        kamarTersedia: angka(h.kamar_tersedia),
        tingkatHunian: kamar > 0 ? Math.round((kamarTerisi / kamar) * 100) : 0,
        pendapatanBulanIni,
        pendapatanBulanLalu,
        perubahanPendapatan,
      },
    }
  },
}
