import { query, queryOne } from './_shared/db.ts'
import { distanceFromPoint, haversineSql, roundedDistanceSql, type GeoPoint } from './_shared/geo.ts'
import { HttpError } from './_shared/http.ts'
import { propertiesService } from './properties.service.ts'
import type {
  CampusDetailQuery,
  ListCampusesQuery,
  ListRegionsQuery,
} from './places.validator.ts'

/**
 * Acuan peta lokasi: kampus dan daerah, beserta jumlah kos di sekitarnya.
 *
 * Kedua daftar dihitung dalam SATU query masing-masing. Jumlah kosnya dihitung
 * lewat agregat di dalam database, bukan dengan menjalankan satu query hitung
 * per baris, karena daftar ini bisa memuat puluhan daerah dan kampus sekaligus.
 *
 * Tidak ada satu pun nilai yang disisipkan ke dalam teks SQL; semuanya parameter.
 */

/**
 * Syarat properti yang boleh dihitung.
 *
 * Disamakan dengan syarat daftar properti publik di modul properties, supaya
 * angka "kos di sekitar kampus" tidak pernah lebih besar daripada jumlah kos
 * yang benar-benar bisa dibuka pengunjung.
 */
const SYARAT_PROPERTI_PUBLIK = `
  p.deleted_at IS NULL
  AND p.publication_status = 'PUBLISHED'
  AND p.verification_status = 'VERIFIED'
`

interface CampusRow {
  id: string
  name: string
  slug: string
  abbreviation: string | null
  city: string
  province: string
  latitude: string
  longitude: string
  distance_km: string | null
  property_count: number
}

interface RegionRow {
  id: string
  name: string
  slug: string
  type: string
  city: string | null
  province: string | null
  latitude: string | null
  longitude: string | null
  property_count: number
}

/** Kolom numeric dikembalikan driver sebagai string; null tetap null. */
const angka = (nilai: string | null): number | null => (nilai === null ? null : Number(nilai))

export const placesService = {
  async listCampuses(params: ListCampusesQuery, titik?: GeoPoint) {
    const values: unknown[] = []

    // Radius didaftarkan lebih dulu karena dipakai di dalam subquery penghitung,
    // dan nomor parameter ditentukan urutan pendaftaran, bukan urutan
    // pemakaian di teks SQL.
    values.push(params.radiusKm)
    const radiusParam = `$${values.length}`

    // Jarak ke pemanggil. Bila titiknya tidak dikirim, ekspresinya `NULL` dan
    // kolomnya tetap ada berisi null, bentuk responsnya tidak berubah-ubah.
    const jarakPemanggil = distanceFromPoint(values, titik, {
      lat: 'c.latitude',
      lng: 'c.longitude',
    })

    // Jarak kampus ke tiap properti dihitung antarkolom, bukan dari parameter:
    // yang diukur adalah jarak properti ke kampus itu sendiri.
    const jarakKeProperti = haversineSql(
      { lat: 'c.latitude', lng: 'c.longitude' },
      { lat: 'p.latitude', lng: 'p.longitude' },
    )

    values.push(params.limit)
    const limitParam = `$${values.length}`

    const rows = await query<CampusRow>(
      `SELECT
         c.id, c.name, c.slug, c.abbreviation, c.city, c.province, c.latitude, c.longitude,
         ${roundedDistanceSql(jarakPemanggil)} AS distance_km,
         COALESCE(hitung.jumlah, 0)::int AS property_count
       FROM campuses c
       LEFT JOIN LATERAL (
         SELECT count(*) AS jumlah
         FROM properties p
         WHERE ${SYARAT_PROPERTI_PUBLIK}
           AND ${jarakKeProperti} <= ${radiusParam}
       ) hitung ON true
       ORDER BY c.is_popular DESC, property_count DESC, c.name ASC
       LIMIT ${limitParam}`,
      values,
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      abbreviation: row.abbreviation,
      city: row.city,
      province: row.province,
      latitude: angka(row.latitude),
      longitude: angka(row.longitude),
      distanceKm: angka(row.distance_km),
      propertyCount: row.property_count,
    }))
  },

  /**
   * Satu kampus beserta kos terverifikasi di sekitarnya, terdekat lebih dulu.
   *
   * Jaraknya diukur dari kampus, bukan dari lokasi pengunjung: halaman ini
   * menjawab "kos mana yang dekat kampus ini", dan jawabannya harus sama untuk
   * semua orang yang membukanya. Kalau diukur dari lokasi pembaca, urutannya
   * berubah-ubah dan angkanya tidak bisa dibandingkan dengan apa pun.
   *
   * Radius dan batas barisnya datang dari query, jadi pengunjung bisa
   * melonggarkan sendiri ketika radius bawaannya terlalu sempit.
   */
  async campusDetail(slug: string, params: CampusDetailQuery) {
    const kampus = await queryOne<{
      id: string
      name: string
      slug: string
      abbreviation: string | null
      city: string
      province: string
      latitude: string
      longitude: string
    }>(
      `SELECT id, name, slug, abbreviation, city, province, latitude, longitude
       FROM campuses
       WHERE slug = $1`,
      [slug],
    )

    if (!kampus) {
      throw new HttpError(404, 'Kampus tidak ditemukan')
    }

    const titik: GeoPoint = { lat: Number(kampus.latitude), lng: Number(kampus.longitude) }

    // Jarak kampus ke properti dihitung antarkolom, dengan titik kampus sebagai
    // parameter. Ekspresinya dipakai tiga kali (pilih, saring, urut) dan itu
    // memang tujuannya: satu rumus untuk ketiganya, sehingga yang disaring dan
    // yang diurutkan tidak pernah berbeda hasilnya.
    const jarak = haversineSql(
      { lat: '$1::double precision', lng: '$2::double precision' },
      { lat: 'p.latitude', lng: 'p.longitude' },
    )

    const rows = await query<{ id: string; jarak_km: string | null }>(
      `SELECT p.id, ${roundedDistanceSql(jarak)} AS jarak_km
       FROM properties p
       WHERE ${SYARAT_PROPERTI_PUBLIK}
         AND ${jarak} <= $3
       ORDER BY ${jarak} ASC NULLS LAST, p.created_at DESC
       LIMIT $4`,
      [titik.lat, titik.lng, params.radiusKm, params.limit],
    )

    // Bentuk kartunya diambil dari fungsi yang sama dengan daftar pencarian,
    // dan urutannya dipertahankan dari query di atas.
    const items = await propertiesService.listPublicByIdsAround(
      rows.map((row) => row.id),
      titik,
    )

    return {
      campus: {
        id: kampus.id,
        name: kampus.name,
        slug: kampus.slug,
        abbreviation: kampus.abbreviation,
        city: kampus.city,
        province: kampus.province,
        latitude: titik.lat,
        longitude: titik.lng,
      },
      items,
      radiusKm: params.radiusKm,
    }
  },

  async listRegions(params: ListRegionsQuery) {
    // Pencocokan daerah ke properti bergantung pada jenisnya: kota dicocokkan ke
    // kolom `city`, kecamatan ke kolom `district`. Ditulis sebagai satu `CASE`
    // di dalam subquery supaya kedua jenis tetap terhitung dalam satu kali
    // jalan; memisahkannya menjadi dua query lalu menggabungkan hasilnya di
    // kode akan kehilangan urutan yang jadi tanggung jawab database.
    //
    // Perbandingannya tanpa memperhatikan besar-kecil huruf: data lama ada yang
    // menulis "Jakarta selatan", dan area yang sama tidak boleh terhitung
    // sebagai dua daerah berbeda.
    const rows = await query<RegionRow>(
      `SELECT
         r.id, r.name, r.slug, r.type, r.city, r.province, r.latitude, r.longitude,
         COALESCE(hitung.jumlah, 0)::int AS property_count
       FROM regions r
       LEFT JOIN LATERAL (
         SELECT count(*) AS jumlah
         FROM properties p
         WHERE ${SYARAT_PROPERTI_PUBLIK}
           AND (
             CASE WHEN r.type = 'CITY'
                  THEN p.city ILIKE r.name
                  ELSE p.district ILIKE r.name
             END
           )
       ) hitung ON true
       ORDER BY property_count DESC, r.is_popular DESC, r.name ASC
       LIMIT $1`,
      [params.limit],
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      city: row.city,
      province: row.province,
      latitude: angka(row.latitude),
      longitude: angka(row.longitude),
      propertyCount: row.property_count,
    }))
  },

  /**
   * Daftar fasilitas yang bisa dipilih untuk kamar atau properti.
   *
   * Isinya data acuan yang diisi lewat seed, sama seperti kampus dan daerah,
   * tetapi tidak dihitung jumlah kosnya: halaman yang memakainya sedang mengisi
   * formulir, dan angka di sebelah centang hanya mengalihkan pandangan dari
   * yang sedang dikerjakan.
   */
  async listFacilities(kategori?: 'PROPERTY' | 'ROOM') {
    const rows = await query<{ id: string; name: string; slug: string; category: string }>(
      `SELECT id, name, slug, category
       FROM facilities
       ${kategori ? 'WHERE category = $1' : ''}
       ORDER BY category ASC, name ASC`,
      kategori ? [kategori] : [],
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
    }))
  },
}
