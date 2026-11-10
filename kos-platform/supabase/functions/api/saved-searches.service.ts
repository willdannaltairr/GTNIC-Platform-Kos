import { query, queryOne } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import { notificationsService } from './notifications.service.ts'
import type { CreateSavedSearchInput } from './saved-searches.validator.ts'

/**
 * Pencarian tersimpan beserta pemberitahuan kos baru.
 *
 * Penyaringnya disimpan apa adanya sebagai JSON, lalu dicocokkan di sini, bukan
 * di SQL. Alasannya kepraktisan yang menguntungkan kebenaran: penyaringnya
 * dipakai ulang persis seperti yang dikirim halaman pencarian, sedangkan kalau
 * dicocokkan di SQL setiap penyaring baru menuntut satu klausa tambahan di dua
 * tempat - di pencarian dan di pencocokan - dan keduanya cepat atau lambat
 * berbeda. Jumlah pencarian tersimpan per orang kecil, jadi mencocokkannya di
 * sini tidak membebani apa pun.
 *
 * Pemberitahuannya dikirim saat properti PERTAMA KALI terbit. Properti yang
 * ditarik pemiliknya lalu diterbitkan ulang tidak diberitakan dua kali, dan itu
 * memang yang diharapkan pembacanya: yang ia tunggu adalah kos yang baru muncul,
 * bukan yang muncul kembali.
 */

/** Fakta satu properti yang dipakai mencocokkan penyaring. */
interface FaktaKos {
  id: string
  name: string
  slug: string
  ownerId: string
  address: string
  city: string
  district: string
  propertyType: string
  /** Satu baris per kamar: harganya dan jenis kamar mandinya. */
  kamar: { monthlyPrice: number; bathroomType: string }[]
  /** Gabungan fasilitas properti dan fasilitas kamarnya. */
  fasilitas: string[]
}

/** Samakan perbandingan teks: pencarian memakai ILIKE, jadi huruf besar-kecil diabaikan. */
const sama = (kiri: string, kanan: string): boolean =>
  kiri.toLowerCase() === kanan.toLowerCase()

/** ILIKE '%nilai%' untuk kota, kecamatan, dan kata kunci. */
const memuat = (nilai: string, dicari: string): boolean =>
  nilai.toLowerCase().includes(dicari.toLowerCase())

/**
 * Apakah satu kos cocok dengan penyaring satu pencarian tersimpan.
 *
 * Aturannya sengaja dibuat sama persis dengan penyaring di halaman cari kos,
 * termasuk yang mungkin tidak terduga: syarat kamar (kamar mandi dan rentang
 * harga) harus dipenuhi oleh SATU kamar yang sama, bukan oleh dua kamar
 * berbeda. Kalau tidak, kos berharga murah berkamar mandi luar akan lolos pada
 * pencarian "kamar mandi dalam dengan harga di bawah sekian" hanya karena kedua
 * syaratnya dipenuhi kamar yang berbeda.
 */
const cocok = (penyaring: Record<string, unknown>, kos: FaktaKos): boolean => {
  const teks = (nilai: unknown): string => (typeof nilai === 'string' ? nilai : '')

  const q = teks(penyaring.q)
  if (q) {
    const cocokKata =
      memuat(kos.name, q) ||
      memuat(kos.city, q) ||
      memuat(kos.district, q) ||
      memuat(kos.address, q)
    if (!cocokKata) return false
  }

  const city = teks(penyaring.city)
  if (city && !memuat(kos.city, city)) return false

  const district = teks(penyaring.district)
  if (district && !memuat(kos.district, district)) return false

  const type = teks(penyaring.type)
  if (type && !sama(kos.propertyType, type)) return false

  const bathroom = teks(penyaring.bathroom)
  const minPrice = typeof penyaring.minPrice === 'number' ? penyaring.minPrice : undefined
  const maxPrice = typeof penyaring.maxPrice === 'number' ? penyaring.maxPrice : undefined

  if (bathroom || minPrice !== undefined || maxPrice !== undefined) {
    const adaKamar = kos.kamar.some((kamar) => {
      if (bathroom && !sama(kamar.bathroomType, bathroom)) return false
      if (minPrice !== undefined && kamar.monthlyPrice < minPrice) return false
      if (maxPrice !== undefined && kamar.monthlyPrice > maxPrice) return false
      return true
    })

    if (!adaKamar) return false
  }

  const fasilitas = teks(penyaring.facilities)
  if (fasilitas) {
    const diminta = fasilitas
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean)

    // Seluruh fasilitas yang diminta harus ada, bukan sebagian: pencarian yang
    // meminta Wi-Fi dan AC tidak boleh memberitahukan kos yang cuma ber-Wi-Fi.
    if (diminta.some((slug) => !kos.fasilitas.includes(slug))) return false
  }

  return true
}

/** Ambil fakta satu properti yang dibutuhkan pencocokan. */
const muatFakta = async (propertyId: string): Promise<FaktaKos | null> => {
  const properti = await queryOne<{
    id: string
    name: string
    slug: string
    owner_id: string
    address: string
    city: string
    district: string
    property_type: string
  }>(
    `SELECT id, name, slug, owner_id, address, city, district, property_type
     FROM properties
     WHERE id = $1 AND deleted_at IS NULL
       AND publication_status = 'PUBLISHED'
       AND verification_status = 'VERIFIED'`,
    [propertyId],
  )

  // Properti yang tidak terbit atau tidak terverifikasi tidak diberitakan sama
  // sekali. Pemberitahuan yang menautkan ke halaman yang tidak bisa dibuka
  // lebih buruk daripada tidak ada pemberitahuan.
  if (!properti) return null

  const [kamar, fasilitasProperti, fasilitasKamar] = await Promise.all([
    query<{ monthly_price: string; bathroom_type: string }>(
      `SELECT monthly_price, bathroom_type FROM rooms WHERE property_id = $1`,
      [propertyId],
    ),
    query<{ slug: string }>(
      `SELECT f.slug
       FROM property_facilities pf
       JOIN facilities f ON f.id = pf.facility_id
       WHERE pf.property_id = $1`,
      [propertyId],
    ),
    query<{ slug: string }>(
      `SELECT DISTINCT f.slug
       FROM rooms r
       JOIN room_facilities rf ON rf.room_id = r.id
       JOIN facilities f ON f.id = rf.facility_id
       WHERE r.property_id = $1`,
      [propertyId],
    ),
  ])

  return {
    id: properti.id,
    name: properti.name,
    slug: properti.slug,
    ownerId: properti.owner_id,
    address: properti.address,
    city: properti.city,
    district: properti.district,
    propertyType: properti.property_type,
    kamar: kamar.map((row) => ({
      monthlyPrice: Number(row.monthly_price),
      bathroomType: row.bathroom_type,
    })),
    fasilitas: [...new Set([...fasilitasProperti, ...fasilitasKamar].map((f) => f.slug))],
  }
}

export const savedSearchesService = {
  /** Pencarian tersimpan milik satu pengguna, terbaru lebih dulu. */
  async list(userId: string) {
    const rows = await query<{
      id: string
      name: string
      filters: Record<string, unknown>
      last_notified_at: Date | null
      created_at: Date
    }>(
      `SELECT id, name, filters, last_notified_at, created_at
       FROM saved_searches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    )

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        filters: row.filters,
        lastNotifiedAt: row.last_notified_at === null ? null : row.last_notified_at.toISOString(),
        createdAt: row.created_at.toISOString(),
      })),
      meta: { total: rows.length },
    }
  },

  /**
   * Simpan pencarian baru.
   *
   * Batasnya dua puluh per pengguna. Bukan karena penyimpanannya mahal,
   * melainkan karena setiap pencarian tersimpan menambah satu pencocokan pada
   * setiap kos baru yang terbit: yang tidak dibatasi akan membuat satu orang
   * menerima puluhan pemberitahuan yang tidak lagi dibacanya.
   */
  async create(userId: string, input: CreateSavedSearchInput) {
    const jumlah = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM saved_searches WHERE user_id = $1`,
      [userId],
    )

    if ((jumlah?.total ?? 0) >= 20) {
      throw new HttpError(
        409,
        'Pencarian tersimpan sudah mencapai batas 20. Hapus salah satu dulu untuk menyimpan yang baru.',
      )
    }

    const row = await queryOne<{
      id: string
      name: string
      filters: Record<string, unknown>
      created_at: Date
    }>(
      `INSERT INTO saved_searches (user_id, name, filters)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, name, filters, created_at`,
      [userId, input.name, JSON.stringify(input.filters)],
    )

    return {
      id: row?.id ?? '',
      name: row?.name ?? input.name,
      filters: row?.filters ?? input.filters,
      lastNotifiedAt: null,
      createdAt: (row?.created_at ?? new Date()).toISOString(),
    }
  },

  /** Hapus satu pencarian; milik orang lain dijawab 404, bukan 403. */
  async remove(userId: string, id: string) {
    const rows = await query<{ id: string }>(
      `DELETE FROM saved_searches WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    )

    if (rows.length === 0) {
      throw new HttpError(404, 'Pencarian tersimpan tidak ditemukan')
    }

    return { id }
  },

  /**
   * Beri tahu pemilik pencarian tersimpan bahwa ada kos baru yang cocok.
   *
   * Dipanggil saat properti pertama kali terbit. Kegagalannya tidak pernah
   * melempar ke pemanggil: penerbitan properti sudah berhasil, dan itu yang
   * penting bagi pemiliknya - pemberitahuan yang gagal tidak boleh membatalkan
   * sesuatu yang sudah tersimpan.
   *
   * Pemilik kosnya sendiri dikecualikan: tidak ada gunanya memberitahukan
   * seseorang bahwa kosnya sendiri baru muncul.
   */
  async beriTahuKosBaru(propertyId: string): Promise<number> {
    try {
      const kos = await muatFakta(propertyId)
      if (!kos) return 0

      const pencarian = await query<{
        id: string
        user_id: string
        name: string
        filters: Record<string, unknown>
      }>(
        `SELECT id, user_id, name, filters
         FROM saved_searches
         WHERE user_id <> $1`,
        [kos.ownerId],
      )

      let terkirim = 0

      for (const item of pencarian) {
        if (!cocok(item.filters, kos)) continue

        await notificationsService.create({
          userId: item.user_id,
          jenis: 'SAVED_SEARCH_MATCH',
          judul: 'Kos baru sesuai pencarian Anda',
          pesan: `${kos.name} di ${kos.district}, ${kos.city} cocok dengan pencarian "${item.name}".`,
          entityType: 'property',
          entityId: kos.slug,
        })

        await query(`UPDATE saved_searches SET last_notified_at = now() WHERE id = $1`, [item.id])
        terkirim += 1
      }

      return terkirim
    } catch (error) {
      console.error('[saved-searches] gagal mengirim pemberitahuan:', (error as Error).message)
      return 0
    }
  },
}
