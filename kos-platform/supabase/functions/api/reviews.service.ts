import { query, queryOne } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import type { AuthUser } from './_shared/auth.ts'
import { notificationsService } from './notifications.service.ts'
import type { NotificationKind } from './notifications.validator.ts'
import type {
  CreateReviewInput,
  ListReviewsQuery,
  ModerateReviewInput,
  UpdateReviewInput,
} from './reviews.validator.ts'

/**
 * Ulasan penghuni atas kos yang pernah atau sedang ia sewa.
 *
 * Aturan yang menentukan seluruh bentuk modul ini: ulasan lahir dari KONTRAK,
 * bukan dari properti. Siapa pun bisa membuka halaman kos dan menilai fotonya,
 * tetapi hanya orang yang benar-benar tinggal di sana yang tahu bagaimana airnya
 * jam enam pagi dan bagaimana pemiliknya menjawab keluhan. Karena itu yang boleh
 * menulis hanya penghuni dengan kontrak aktif atau selesai di properti itu, dan
 * satu kontrak melahirkan paling banyak satu ulasan.
 *
 * Ulasan baru selalu masuk `PENDING_MODERATION`, dan selama belum disetujui ia
 * hanya terlihat penulisnya dan admin. Ditinjau dulu, bukan langsung tayang,
 * karena halaman properti dibaca calon penghuni yang tidak punya cara memeriksa
 * tuduhan yang ditulis di sana.
 */

interface UlasanRow {
  id: string
  tenant_id: string
  tenant_name: string
  property_id: string
  property_name: string
  property_slug: string
  booking_id: string | null
  booking_code: string | null
  rating: number
  cleanliness_rating: number | null
  location_rating: number | null
  facilities_rating: number | null
  owner_service_rating: number | null
  review_content: string | null
  review_status: string
  moderation_notes: string | null
  moderated_at: Date | null
  moderated_by_name: string | null
  created_at: Date
  updated_at: Date
}

const KOLOM = `
  r.id, r.tenant_id, t.full_name AS tenant_name,
  r.property_id, p.name AS property_name, p.slug AS property_slug,
  r.booking_id, b.booking_code,
  r.rating, r.cleanliness_rating, r.location_rating,
  r.facilities_rating, r.owner_service_rating,
  r.review_content, r.review_status, r.moderation_notes,
  r.moderated_at, a.full_name AS moderated_by_name,
  r.created_at, r.updated_at
`

/**
 * Sambungan tabelnya ditulis terpisah dari sumbernya.
 *
 * Sama seperti modul perbaikan: query yang membaca hasil INSERT atau UPDATE
 * sendiri lewat CTE memakai nama tabel yang berbeda, sementara sambungannya
 * tetap sama persis. Menyalin blok JOIN untuk keperluan itu berarti dua tempat
 * yang harus ikut berubah setiap kali ada tabel yang disambungkan.
 */
const JOIN = `
  JOIN users t ON t.id = r.tenant_id
  JOIN properties p ON p.id = r.property_id
  LEFT JOIN bookings b ON b.id = r.booking_id
  LEFT JOIN users a ON a.id = r.moderated_by
`

const DARI = `FROM reviews r ${JOIN}`
const DARI_DIUBAH = `FROM diubah r ${JOIN}`
const DARI_BARU = `FROM baru r ${JOIN}`

const tanggal = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

/** Rata-rata dibulatkan satu angka di belakang koma; lebih dari itu pura-pura presisi. */
const angkaRata = (nilai: string | null): number | null =>
  nilai === null ? null : Math.round(Number(nilai) * 10) / 10

/**
 * Sebutan keputusan untuk pemberitahuan.
 *
 * Ditulis sebagai keadaan yang bisa dibaca penghuni, bukan sebagai nama status,
 * karena yang membacanya tidak pernah melihat daftar enumnya.
 */
const KABAR: Record<string, string> = {
  APPROVED: 'tayang di halaman kos',
  REJECTED: 'ditolak',
  HIDDEN: 'disembunyikan',
}

const KEPUTUSAN_JENIS: Record<string, NotificationKind> = {
  APPROVED: 'REVIEW_APPROVED',
  REJECTED: 'REVIEW_REJECTED',
  HIDDEN: 'REVIEW_HIDDEN',
}

const keBentuk = (row: UlasanRow) => ({
  id: row.id,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  propertySlug: row.property_slug,
  bookingId: row.booking_id,
  bookingCode: row.booking_code,
  rating: row.rating,
  cleanlinessRating: row.cleanliness_rating,
  locationRating: row.location_rating,
  facilitiesRating: row.facilities_rating,
  ownerServiceRating: row.owner_service_rating,
  content: row.review_content,
  status: row.review_status,
  /**
   * Catatan moderasi ikut terkirim bersama ulasannya sendiri, karena yang
   * berkepentingan membacanya hanya penulisnya. Daftar publik menyaringnya
   * keluar sebelum dikirim.
   */
  moderationNotes: row.moderation_notes,
  moderatedByName: row.moderated_by_name,
  moderatedAt: tanggal(row.moderated_at),
  createdAt: tanggal(row.created_at),
  updatedAt: tanggal(row.updated_at),
})

/**
 * Bentuk untuk pembaca umum.
 *
 * Tanpa id penghuni dan tanpa catatan moderasi: yang pertama tidak diperlukan
 * calon penghuni berikutnya, dan yang kedua urusan penulis ulasan dengan admin.
 */
const keBentukPublik = (row: UlasanRow) => ({
  id: row.id,
  tenantName: row.tenant_name,
  rating: row.rating,
  cleanlinessRating: row.cleanliness_rating,
  locationRating: row.location_rating,
  facilitiesRating: row.facilities_rating,
  ownerServiceRating: row.owner_service_rating,
  content: row.review_content,
  createdAt: tanggal(row.created_at),
})

/**
 * Ambil satu ulasan dengan pemeriksaan hak akses.
 *
 * Ulasan yang sudah tayang boleh dibaca siapa saja. Yang belum diputuskan,
 * ditolak, atau disembunyikan hanya boleh dibaca penulisnya dan admin, dan
 * pihak lain dijawab 404 supaya keberadaannya tidak bocor lewat perbedaan 403
 * dan 404.
 */
const ambil = async (user: AuthUser | null, id: string): Promise<UlasanRow> => {
  const row = await queryOne<UlasanRow>(`SELECT ${KOLOM} ${DARI} WHERE r.id = $1`, [id])

  if (!row) throw new HttpError(404, 'Ulasan tidak ditemukan')

  const boleh =
    row.review_status === 'APPROVED' ||
    (user !== null && (user.role === 'ADMIN' || row.tenant_id === user.userId))

  if (!boleh) throw new HttpError(404, 'Ulasan tidak ditemukan')

  return row
}

export const reviewsService = {
  /**
   * Tulis ulasan dari satu kontrak.
   *
   * Hanya penghuni, dan hanya dari kontraknya sendiri yang sudah berjalan atau
   * sudah selesai. Kontrak yang baru diajukan belum membuktikan apa pun:
   * penghuni yang belum pernah menempati kamarnya tidak punya bahan untuk
   * dinilai.
   */
  async create(user: AuthUser, input: CreateReviewInput) {
    if (user.role !== 'TENANT') {
      throw new HttpError(
        403,
        'Ulasan ditulis penghuni yang pernah menempati kamarnya. Pemilik properti membacanya di halaman kosnya, bukan menulisnya.',
      )
    }

    const kontrak = await queryOne<{
      id: string
      booking_id: string
      booking_code: string
      property_id: string
      property_name: string
      owner_id: string
      contract_status: string
    }>(
      `SELECT c.id, c.booking_id, b.booking_code, c.property_id,
              p.name AS property_name, c.owner_id, c.contract_status
       FROM contracts c
       JOIN properties p ON p.id = c.property_id
       JOIN bookings b ON b.id = c.booking_id
       WHERE c.id = $1 AND c.tenant_id = $2 AND p.deleted_at IS NULL`,
      [input.contractId, user.userId],
    )

    if (!kontrak) {
      throw new HttpError(
        404,
        'Kontrak sewa itu tidak ditemukan di akun Anda. Ulasan hanya bisa ditulis untuk sewa yang Anda jalani sendiri.',
      )
    }

    if (kontrak.contract_status !== 'ACTIVE' && kontrak.contract_status !== 'COMPLETED') {
      throw new HttpError(
        409,
        'Ulasan bisa ditulis setelah sewa berjalan atau selesai. Kontrak yang belum aktif belum ada yang bisa dinilai.',
      )
    }

    const sudah = await queryOne<{ id: string }>(`SELECT id FROM reviews WHERE booking_id = $1`, [
      kontrak.booking_id,
    ])

    if (sudah) {
      throw new HttpError(
        409,
        'Anda sudah memberi ulasan untuk sewa ini. Ulasan yang ada bisa Anda ubah, dan sesudah diubah akan ditinjau ulang.',
      )
    }

    const row = await queryOne<UlasanRow>(
      `WITH baru AS (
         INSERT INTO reviews (
           tenant_id, property_id, booking_id, rating,
           cleanliness_rating, location_rating, facilities_rating,
           owner_service_rating, review_content
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *
       )
       SELECT ${KOLOM} ${DARI_BARU}`,
      [
        user.userId,
        kontrak.property_id,
        kontrak.booking_id,
        input.rating,
        input.cleanlinessRating ?? null,
        input.locationRating ?? null,
        input.facilitiesRating ?? null,
        input.ownerServiceRating ?? null,
        input.content ?? null,
      ],
    )

    if (!row) throw new HttpError(500, 'Ulasan gagal disimpan')

    /**
     * Tidak ada pemberitahuan ke pemilik di sini, dan itu disengaja: ulasannya
     * belum bisa dibaca siapa-siapa selain admin sampai diputuskan, jadi
     * memberi tahu pemilik sekarang hanya membuatnya mencari ulasan yang tidak
     * bisa ia buka. Yang diberitahu saat keputusan keluar adalah penulisnya,
     * dan pemilik membaca ulasan yang sudah tayang di halaman kosnya.
     */
    return keBentuk(row)
  },

  /**
   * Daftar ulasan.
   *
   * Tiga lingkup dalam satu rute, karena yang membedakannya hanya siapa yang
   * memanggil dan apa yang ia minta: halaman properti meminta ulasan sebuah kos,
   * penghuni meminta ulasannya sendiri, dan admin meminta antrean moderasi.
   * Penyaringnya ditentukan peran, bukan diserahkan ke pemanggil.
   */
  async list(user: AuthUser | null, params: ListReviewsQuery) {
    const kondisi: string[] = []
    const values: unknown[] = []

    const menyaringProperti = params.propertyId !== undefined || params.propertySlug !== undefined

    if (user?.role === 'ADMIN') {
      // Admin melihat antrean moderasi, dan boleh menyaringnya per status.
      if (params.status) {
        values.push(params.status)
        kondisi.push(`r.review_status = $${values.length}`)
      }
    } else if (menyaringProperti) {
      // Halaman properti: apa pun peran yang membukanya, yang tampil hanya
      // ulasan yang sudah lolos tinjauan.
      kondisi.push(`r.review_status = 'APPROVED'`)
    } else if (user?.role === 'OWNER') {
      // Pemilik yang membuka tanpa penyaring properti sedang melihat ulasan
      // yang masuk ke kosnya, dan hanya yang sudah tayang: antrean moderasi
      // bukan miliknya.
      values.push(user.userId)
      kondisi.push(`p.owner_id = $${values.length}`)
      kondisi.push(`r.review_status = 'APPROVED'`)
    } else if (user) {
      // Penghuni yang membuka tanpa penyaring properti sedang melihat ulasannya
      // sendiri, apa pun statusnya.
      values.push(user.userId)
      kondisi.push(`r.tenant_id = $${values.length}`)
    } else {
      kondisi.push(`r.review_status = 'APPROVED'`)
    }

    if (params.propertyId) {
      values.push(params.propertyId)
      kondisi.push(`r.property_id = $${values.length}`)
    }

    if (params.propertySlug) {
      values.push(params.propertySlug)
      kondisi.push(`p.slug = $${values.length}`)
    }

    const where = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : ''

    const hitung = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total ${DARI} ${where}`,
      values,
    )

    /**
     * Rata-rata SELALU dihitung dari ulasan yang tayang, termasuk waktu yang
     * membacanya admin. Angka di halaman kos harus sama dengan yang dihitung
     * dari ulasan yang benar-benar terlihat calon penghuni; menyertakan yang
     * belum diputuskan akan membuat nilainya berubah-ubah tanpa ada yang
     * mengubah ulasan tayangnya.
     */
    const ringkas = await queryOne<{
      jumlah: number
      rata_rata: string | null
      kebersihan: string | null
      lokasi: string | null
      fasilitas: string | null
      layanan: string | null
    }>(
      `SELECT
         count(*)::int AS jumlah,
         avg(rating) AS rata_rata,
         avg(cleanliness_rating) AS kebersihan,
         avg(location_rating) AS lokasi,
         avg(facilities_rating) AS fasilitas,
         avg(owner_service_rating) AS layanan
       ${DARI}
       ${where ? `${where} AND r.review_status = 'APPROVED'` : `WHERE r.review_status = 'APPROVED'`}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    const nilaiHalaman = [...values, params.limit, offset]

    const rows = await query<UlasanRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY r.created_at DESC
       LIMIT $${nilaiHalaman.length - 1} OFFSET $${nilaiHalaman.length}`,
      nilaiHalaman,
    )

    const total = hitung?.total ?? 0

    /**
     * Bentuk penuhnya dipakai admin (antrean moderasi) dan penulisnya sendiri
     * (daftar ulasan saya): keduanya perlu membaca catatan keputusan. Pemilik
     * properti tidak: yang ia baca adalah ulasan yang sudah tayang, dan catatan
     * moderasi adalah urusan penulisnya dengan admin.
     */
    const bentukPenuh =
      user?.role === 'ADMIN' || (user !== null && user.role !== 'OWNER' && !menyaringProperti)

    return {
      items: bentukPenuh ? rows.map(keBentuk) : rows.map(keBentukPublik),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
        /** Ringkasan penilaian, dihitung dari ulasan yang tayang saja. */
        ringkasan: {
          jumlahTayang: ringkas?.jumlah ?? 0,
          rataRata: angkaRata(ringkas?.rata_rata ?? null),
          kebersihan: angkaRata(ringkas?.kebersihan ?? null),
          lokasi: angkaRata(ringkas?.lokasi ?? null),
          fasilitas: angkaRata(ringkas?.fasilitas ?? null),
          layananPemilik: angkaRata(ringkas?.layanan ?? null),
        },
      },
    }
  },

  /** Satu ulasan. Yang belum tayang hanya untuk penulisnya dan admin. */
  async detail(user: AuthUser | null, id: string) {
    return keBentuk(await ambil(user, id))
  },

  /**
   * Ubah ulasan yang sudah ditulis.
   *
   * Hanya penulisnya, dan tidak selama disembunyikan admin. Setiap perubahan
   * mengembalikan ulasannya ke antrean moderasi, termasuk yang sudah tayang:
   * tanpa itu, ulasan yang lolos tinjauan bisa diganti isinya dengan apa pun
   * sesudahnya, dan moderasi yang sudah dijalankan tidak lagi berarti. Catatan
   * keputusan sebelumnya ikut dihapus karena keputusan itu berlaku untuk tulisan
   * yang sudah tidak ada.
   */
  async update(user: AuthUser, id: string, input: UpdateReviewInput) {
    const ulasan = await ambil(user, id)

    if (ulasan.tenant_id !== user.userId) {
      throw new HttpError(403, 'Ulasan hanya bisa diubah oleh yang menulisnya')
    }

    if (ulasan.review_status === 'HIDDEN') {
      throw new HttpError(
        409,
        'Ulasan ini disembunyikan admin dan tidak bisa diubah lagi. Hubungi pengelola lewat laporan bila Anda tidak setuju.',
      )
    }

    const row = await queryOne<UlasanRow>(
      `WITH diubah AS (
         UPDATE reviews SET
           rating = COALESCE($2, rating),
           cleanliness_rating = COALESCE($3, cleanliness_rating),
           location_rating = COALESCE($4, location_rating),
           facilities_rating = COALESCE($5, facilities_rating),
           owner_service_rating = COALESCE($6, owner_service_rating),
           review_content = COALESCE($7, review_content),
           review_status = 'PENDING_MODERATION',
           moderated_by = NULL,
           moderated_at = NULL,
           moderation_notes = NULL
         WHERE id = $1
         RETURNING *
       )
       SELECT ${KOLOM} ${DARI_DIUBAH}`,
      [
        id,
        input.rating ?? null,
        input.cleanlinessRating ?? null,
        input.locationRating ?? null,
        input.facilitiesRating ?? null,
        input.ownerServiceRating ?? null,
        input.content ?? null,
      ],
    )

    if (!row) throw new HttpError(500, 'Ulasan gagal diperbarui')

    return keBentuk(row)
  },

  /**
   * Putuskan moderasi.
   *
   * Hanya admin, dan keputusannya boleh diberikan berulang kali: ulasan yang
   * sudah tayang kadang perlu disembunyikan kemudian, dan menutup jalan itu
   * berarti satu-satunya cara menariknya kembali adalah menghapus barisnya,
   * padahal yang dibutuhkan justru catatan bahwa ulasan itu pernah ada.
   *
   * Penulisnya diberitahu setiap kali keputusannya berubah. Untuk penolakan dan
   * penyembunyian alasannya wajib, dan ikut terbaca di pemberitahuannya.
   */
  async moderate(user: AuthUser, id: string, input: ModerateReviewInput) {
    const ulasan = await ambil(user, id)

    if (ulasan.review_status === input.status) {
      throw new HttpError(
        409,
        `Ulasan ini sudah berstatus ${input.status.toLowerCase()}, tidak ada yang berubah.`,
      )
    }

    const row = await queryOne<UlasanRow>(
      `WITH diubah AS (
         UPDATE reviews SET
           review_status = $2,
           moderated_by = $3,
           moderated_at = now(),
           moderation_notes = $4
         WHERE id = $1
         RETURNING *
       )
       SELECT ${KOLOM} ${DARI_DIUBAH}`,
      [id, input.status, user.userId, input.notes ?? null],
    )

    if (!row) throw new HttpError(500, 'Keputusan moderasi gagal disimpan')

    await notificationsService.create({
      userId: ulasan.tenant_id,
      jenis: KEPUTUSAN_JENIS[input.status] ?? 'REVIEW_APPROVED',
      judul:
        input.status === 'APPROVED'
          ? 'Ulasan Anda tayang'
          : input.status === 'REJECTED'
            ? 'Ulasan Anda ditolak'
            : 'Ulasan Anda disembunyikan',
      pesan: `Ulasan Anda untuk ${ulasan.property_name} ${KABAR[input.status] ?? 'diperbarui'}.${input.notes ? ` Alasan dari admin: ${input.notes}` : ''}`,
      entityType: 'review',
      entityId: ulasan.id,
    })

    return keBentuk(row)
  },
}
