import { query, queryOne } from '../../lib/db'

/**
 * Isi dashboard untuk kedua peran.
 *
 * Dua hal yang menentukan bentuk berkas ini:
 *
 * 1. Setiap query menyaring dengan id pengguna dari token, bukan dari parameter
 *    yang bisa dikirim klien. Dashboard adalah halaman yang isinya berbeda per
 *    orang, jadi satu penyaringan yang terlewat berarti data milik pengguna
 *    lain ikut tampil.
 * 2. Agregat dihitung di dalam database. Satu halaman dashboard hanya butuh
 *    beberapa query, bukan satu query hitung per baris.
 *
 * Kolom `numeric` dari PostgreSQL datang sebagai string, jadi semua nilai uang
 * dan jumlah dikonversi lewat `angka()` sebelum keluar dari service ini. Kalau
 * tidak, `"1500000"` akan sampai ke JSON sebagai teks dan frontend memformatnya
 * sebagai NaN.
 */

const angka = (nilai: unknown): number => {
  const n = Number(nilai ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** Status perbaikan yang dianggap masih berjalan. */
const PERBAIKAN_SELESAI = `('RESOLVED', 'REJECTED', 'CLOSED')`

/** Status tagihan yang belum lunas. */
const TAGIHAN_BELUM_LUNAS = `('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')`

const tanggal = (nilai: Date | null): string | null =>
  nilai === null ? null : nilai.toISOString()

export interface RingkasanTenant {
  bookingMenunggu: number
  sewaAktif: number
  tagihanBelumDibayar: number
  totalTagihanBelumDibayar: number
  perbaikanTerbuka: number
  favorit: number
  kunjunganTerjadwal: number
}

export interface RingkasanOwner {
  properti: number
  propertiTerverifikasi: number
  kamar: number
  kamarTersedia: number
  kamarTerisi: number
  bookingMenunggu: number
  tagihanBelumDibayar: number
  totalTagihanBelumDibayar: number
  perbaikanTerbuka: number
  pendapatanBulanIni: number
}

export const dashboardService = {
  /** Ringkasan dan daftar terbaru untuk penghuni atau pencari kos. */
  async tenant(userId: string) {
    const ringkasanRow = await queryOne<Record<string, unknown>>(
      `SELECT
         (SELECT count(*) FROM bookings
           WHERE tenant_id = $1 AND status = 'PENDING') AS booking_menunggu,
         (SELECT count(*) FROM contracts
           WHERE tenant_id = $1 AND contract_status = 'ACTIVE') AS sewa_aktif,
         (SELECT count(*) FROM invoices
           WHERE tenant_id = $1 AND invoice_status IN ${TAGIHAN_BELUM_LUNAS}) AS tagihan_belum_dibayar,
         (SELECT COALESCE(sum(total_amount), 0) FROM invoices
           WHERE tenant_id = $1 AND invoice_status IN ${TAGIHAN_BELUM_LUNAS}) AS total_tagihan,
         (SELECT count(*) FROM maintenance_requests
           WHERE tenant_id = $1 AND status NOT IN ${PERBAIKAN_SELESAI}) AS perbaikan_terbuka,
         (SELECT count(*) FROM favorites WHERE user_id = $1) AS favorit,
         (SELECT count(*) FROM visits
           WHERE tenant_id = $1 AND visit_status = 'SCHEDULED') AS kunjungan`,
      [userId],
    )

    const [sewa, tagihan, perbaikan, kunjungan] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT c.id, p.name AS property_name, r.room_number,
                c.start_date, c.end_date, c.monthly_rent, c.contract_status
         FROM contracts c
         JOIN properties p ON p.id = c.property_id
         JOIN rooms r ON r.id = c.room_id
         WHERE c.tenant_id = $1 AND c.contract_status IN ('ACTIVE', 'PENDING_SIGNATURE')
         ORDER BY c.created_at DESC
         LIMIT 5`,
        [userId],
      ),
      // Invoice tidak menyimpan id properti; jalurnya lewat kontrak atau
      // booking. Keduanya diambil dengan LEFT JOIN karena invoice bisa
      // terbit sebelum kontraknya ditandatangani, dan COALESCE memilih yang ada.
      query<Record<string, unknown>>(
        `SELECT i.id, i.invoice_number, i.due_date, i.total_amount, i.invoice_status,
                COALESCE(pk.name, pb.name) AS property_name,
                COALESCE(rk.room_number, rb.room_number) AS room_number
         FROM invoices i
         LEFT JOIN contracts ct ON ct.id = i.contract_id
         LEFT JOIN bookings bk ON bk.id = i.booking_id
         LEFT JOIN properties pk ON pk.id = ct.property_id
         LEFT JOIN properties pb ON pb.id = bk.property_id
         LEFT JOIN rooms rk ON rk.id = ct.room_id
         LEFT JOIN rooms rb ON rb.id = bk.room_id
         WHERE i.tenant_id = $1 AND i.invoice_status IN ${TAGIHAN_BELUM_LUNAS}
         ORDER BY i.due_date ASC NULLS LAST
         LIMIT 5`,
        [userId],
      ),
      query<Record<string, unknown>>(
        `SELECT m.id, p.name AS property_name, r.room_number,
                m.title, m.priority, m.status, m.created_at
         FROM maintenance_requests m
         JOIN properties p ON p.id = m.property_id
         LEFT JOIN rooms r ON r.id = m.room_id
         WHERE m.tenant_id = $1 AND m.status NOT IN ${PERBAIKAN_SELESAI}
         ORDER BY m.created_at DESC
         LIMIT 5`,
        [userId],
      ),
      query<Record<string, unknown>>(
        `SELECT v.id, p.name AS property_name, v.scheduled_at, v.visit_status
         FROM visits v
         JOIN properties p ON p.id = v.property_id
         WHERE v.tenant_id = $1 AND v.visit_status = 'SCHEDULED'
         ORDER BY v.scheduled_at ASC NULLS LAST
         LIMIT 5`,
        [userId],
      ),
    ])

    const r = ringkasanRow ?? {}

    return {
      ringkasan: {
        bookingMenunggu: angka(r.booking_menunggu),
        sewaAktif: angka(r.sewa_aktif),
        tagihanBelumDibayar: angka(r.tagihan_belum_dibayar),
        totalTagihanBelumDibayar: angka(r.total_tagihan),
        perbaikanTerbuka: angka(r.perbaikan_terbuka),
        favorit: angka(r.favorit),
        kunjunganTerjadwal: angka(r.kunjungan),
      } satisfies RingkasanTenant,
      sewa: sewa.map((row) => ({
        id: row.id as string,
        propertyName: row.property_name as string,
        roomNumber: row.room_number as string,
        startDate: tanggal(row.start_date as Date | null),
        endDate: tanggal(row.end_date as Date | null),
        monthlyRent: angka(row.monthly_rent),
        status: row.contract_status as string,
      })),
      tagihan: tagihan.map((row) => ({
        id: row.id as string,
        invoiceNumber: row.invoice_number as string,
        propertyName: (row.property_name as string | null) ?? 'Properti',
        roomNumber: (row.room_number as string | null) ?? '-',
        dueDate: tanggal(row.due_date as Date | null),
        totalAmount: angka(row.total_amount),
        status: row.invoice_status as string,
      })),
      perbaikan: perbaikan.map((row) => ({
        id: row.id as string,
        propertyName: row.property_name as string,
        roomNumber: (row.room_number as string | null) ?? '-',
        title: row.title as string,
        priority: row.priority as string,
        status: row.status as string,
        createdAt: tanggal(row.created_at as Date | null),
      })),
      kunjungan: kunjungan.map((row) => ({
        id: row.id as string,
        propertyName: row.property_name as string,
        scheduledAt: tanggal(row.scheduled_at as Date | null),
        status: row.visit_status as string,
      })),
    }
  },

  /** Ringkasan dan daftar terbaru untuk pemilik kos. */
  async owner(userId: string) {
    const ringkasanRow = await queryOne<Record<string, unknown>>(
      `SELECT
         (SELECT count(*) FROM properties
           WHERE owner_id = $1 AND deleted_at IS NULL) AS properti,
         (SELECT count(*) FROM properties
           WHERE owner_id = $1 AND deleted_at IS NULL
             AND verification_status = 'VERIFIED') AS properti_terverifikasi,
         (SELECT count(*) FROM rooms r
           JOIN properties p ON p.id = r.property_id
           WHERE p.owner_id = $1 AND p.deleted_at IS NULL) AS kamar,
         (SELECT count(*) FROM rooms r
           JOIN properties p ON p.id = r.property_id
           WHERE p.owner_id = $1 AND p.deleted_at IS NULL
             AND r.availability_status = 'AVAILABLE') AS kamar_tersedia,
         (SELECT count(*) FROM rooms r
           JOIN properties p ON p.id = r.property_id
           WHERE p.owner_id = $1 AND p.deleted_at IS NULL
             AND r.availability_status = 'OCCUPIED') AS kamar_terisi,
         (SELECT count(*) FROM bookings b
           JOIN properties p ON p.id = b.property_id
           WHERE p.owner_id = $1 AND b.status = 'PENDING') AS booking_menunggu,
         (SELECT count(*) FROM invoices
           WHERE owner_id = $1 AND invoice_status IN ${TAGIHAN_BELUM_LUNAS}) AS tagihan_belum_dibayar,
         (SELECT COALESCE(sum(total_amount), 0) FROM invoices
           WHERE owner_id = $1 AND invoice_status IN ${TAGIHAN_BELUM_LUNAS}) AS total_tagihan,
         (SELECT count(*) FROM maintenance_requests
           WHERE owner_id = $1 AND status NOT IN ${PERBAIKAN_SELESAI}) AS perbaikan_terbuka,
         (SELECT COALESCE(sum(total_amount), 0) FROM invoices
           WHERE owner_id = $1 AND invoice_status = 'PAID'
             AND issue_date >= date_trunc('month', now())) AS pendapatan_bulan_ini`,
      [userId],
    )

    const [properti, booking, tagihan, perbaikan] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT p.id, p.name, p.slug, p.city, p.verification_status, p.publication_status,
                COALESCE(k.total_kamar, 0)::int AS total_kamar,
                COALESCE(k.kamar_tersedia, 0)::int AS kamar_tersedia,
                COALESCE(k.kamar_terisi, 0)::int AS kamar_terisi,
                k.harga_terendah,
                img.image_url
         FROM properties p
         LEFT JOIN (
           SELECT property_id,
                  count(*) AS total_kamar,
                  count(*) FILTER (WHERE availability_status = 'AVAILABLE') AS kamar_tersedia,
                  count(*) FILTER (WHERE availability_status = 'OCCUPIED') AS kamar_terisi,
                  min(monthly_price) AS harga_terendah
           FROM rooms
           GROUP BY property_id
         ) k ON k.property_id = p.id
         LEFT JOIN LATERAL (
           SELECT pi.image_url
           FROM property_images pi
           WHERE pi.property_id = p.id
           ORDER BY pi.display_order ASC
           LIMIT 1
         ) img ON true
         WHERE p.owner_id = $1 AND p.deleted_at IS NULL
         ORDER BY p.created_at DESC
         LIMIT 10`,
        [userId],
      ),
      query<Record<string, unknown>>(
        `SELECT b.id, u.full_name AS tenant_name, p.name AS property_name,
                r.room_number, b.start_date, b.status, b.created_at
         FROM bookings b
         JOIN users u ON u.id = b.tenant_id
         JOIN properties p ON p.id = b.property_id
         JOIN rooms r ON r.id = b.room_id
         WHERE p.owner_id = $1 AND b.status = 'PENDING'
         ORDER BY b.created_at DESC
         LIMIT 5`,
        [userId],
      ),
      query<Record<string, unknown>>(
        `SELECT i.id, i.invoice_number, i.due_date, i.total_amount, i.invoice_status,
                u.full_name AS tenant_name,
                COALESCE(pk.name, pb.name) AS property_name,
                COALESCE(rk.room_number, rb.room_number) AS room_number
         FROM invoices i
         JOIN users u ON u.id = i.tenant_id
         LEFT JOIN contracts ct ON ct.id = i.contract_id
         LEFT JOIN bookings bk ON bk.id = i.booking_id
         LEFT JOIN properties pk ON pk.id = ct.property_id
         LEFT JOIN properties pb ON pb.id = bk.property_id
         LEFT JOIN rooms rk ON rk.id = ct.room_id
         LEFT JOIN rooms rb ON rb.id = bk.room_id
         WHERE i.owner_id = $1 AND i.invoice_status IN ${TAGIHAN_BELUM_LUNAS}
         ORDER BY i.due_date ASC NULLS LAST
         LIMIT 5`,
        [userId],
      ),
      query<Record<string, unknown>>(
        `SELECT m.id, p.name AS property_name, r.room_number,
                m.title, m.priority, m.status, m.created_at
         FROM maintenance_requests m
         JOIN properties p ON p.id = m.property_id
         LEFT JOIN rooms r ON r.id = m.room_id
         WHERE m.owner_id = $1 AND m.status NOT IN ${PERBAIKAN_SELESAI}
         ORDER BY m.created_at DESC
         LIMIT 5`,
        [userId],
      ),
    ])

    const r = ringkasanRow ?? {}

    return {
      ringkasan: {
        properti: angka(r.properti),
        propertiTerverifikasi: angka(r.properti_terverifikasi),
        kamar: angka(r.kamar),
        kamarTersedia: angka(r.kamar_tersedia),
        kamarTerisi: angka(r.kamar_terisi),
        bookingMenunggu: angka(r.booking_menunggu),
        tagihanBelumDibayar: angka(r.tagihan_belum_dibayar),
        totalTagihanBelumDibayar: angka(r.total_tagihan),
        perbaikanTerbuka: angka(r.perbaikan_terbuka),
        pendapatanBulanIni: angka(r.pendapatan_bulan_ini),
      } satisfies RingkasanOwner,
      properti: properti.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        city: row.city as string,
        verificationStatus: row.verification_status as string,
        publicationStatus: row.publication_status as string,
        totalRooms: angka(row.total_kamar),
        availableRooms: angka(row.kamar_tersedia),
        occupiedRooms: angka(row.kamar_terisi),
        minMonthlyPrice: row.harga_terendah === null ? null : angka(row.harga_terendah),
        primaryPhotoUrl: (row.image_url as string | null) ?? null,
      })),
      booking: booking.map((row) => ({
        id: row.id as string,
        tenantName: row.tenant_name as string,
        propertyName: row.property_name as string,
        roomNumber: row.room_number as string,
        checkInDate: tanggal(row.start_date as Date | null),
        status: row.status as string,
        createdAt: tanggal(row.created_at as Date | null),
      })),
      tagihan: tagihan.map((row) => ({
        id: row.id as string,
        invoiceNumber: row.invoice_number as string,
        tenantName: row.tenant_name as string,
        propertyName: (row.property_name as string | null) ?? 'Properti',
        roomNumber: (row.room_number as string | null) ?? '-',
        dueDate: tanggal(row.due_date as Date | null),
        totalAmount: angka(row.total_amount),
        status: row.invoice_status as string,
      })),
      perbaikan: perbaikan.map((row) => ({
        id: row.id as string,
        propertyName: row.property_name as string,
        roomNumber: (row.room_number as string | null) ?? '-',
        title: row.title as string,
        priority: row.priority as string,
        status: row.status as string,
        createdAt: tanggal(row.created_at as Date | null),
      })),
    }
  },
}
