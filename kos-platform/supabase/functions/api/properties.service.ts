import { randomUUID } from 'node:crypto'

import { query, queryOne, withTransaction } from './_shared/db.ts'
import { distanceFromPoint, roundedDistanceSql, type GeoPoint } from './_shared/geo.ts'
import { HttpError } from './_shared/http.ts'
import type { AuthUser } from './_shared/auth.ts'
import { buildCostSummary, type CostComponentInput } from './cost-summary.ts'
import type {
  CreatePropertyInput,
  ListMyPropertiesQuery,
  ListPropertiesQuery,
  UpdatePropertyInput,
} from './properties.validator.ts'

/** Kos dianggap perlu konfirmasi ulang bila ketersediaan belum diperbarui 14 hari. */
const AVAILABILITY_STALE_DAYS = 14

const daysSince = (date: Date | null): number | null => {
  if (!date) return null
  const waktu = date instanceof Date ? date.getTime() : new Date(date).getTime()
  const diffMs = Date.now() - waktu
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Ubah sepasang koordinat menjadi titik, bila keduanya benar-benar terisi.
 *
 * Validator sudah menolak koordinat yang datang tidak berpasangan, tetapi
 * penolong ini tetap diperlukan karena tipe `ListPropertiesQuery` membuat
 * keduanya opsional; tanpa penyatuan di sini, setiap pemakaian harus memeriksa
 * `undefined` sendiri dan mudah terlewat di salah satunya.
 */
const titik = (lat?: number, lng?: number): GeoPoint | undefined =>
  lat !== undefined && lng !== undefined ? { lat, lng } : undefined

const titikPengunjung = (params: ListPropertiesQuery): GeoPoint | undefined =>
  titik(params.nearLat, params.nearLng)

const titikAsal = (params: ListPropertiesQuery): GeoPoint | undefined =>
  titik(params.originLat, params.originLng)

/** Kolom koordinat properti, dipakai bersama saat menyusun ekspresi jarak. */
const KOLOM_KOORDINAT = { lat: 'p.latitude', lng: 'p.longitude' }

/**
 * Susun klausa WHERE untuk pencarian publik.
 *
 * Seluruh filter benar-benar diterapkan di database. Nilai selalu lewat
 * parameter ($1, $2, ...), tidak ada satu pun yang disisipkan ke dalam teks SQL,
 * sehingga tidak ada celah injeksi meski jumlah filternya berubah-ubah.
 */
const buildWhere = (params: ListPropertiesQuery) => {
  const conditions: string[] = [
    'p.deleted_at IS NULL',
    "p.publication_status = 'PUBLISHED'",
    "p.verification_status = 'VERIFIED'",
  ]
  const values: unknown[] = []

  if (params.q) {
    values.push(`%${params.q}%`)
    const i = values.length
    conditions.push(
      `(p.name ILIKE $${i} OR p.city ILIKE $${i} OR p.district ILIKE $${i} OR p.address ILIKE $${i})`,
    )
  }

  if (params.city) {
    values.push(`%${params.city}%`)
    conditions.push(`p.city ILIKE $${values.length}`)
  }

  if (params.district) {
    values.push(`%${params.district}%`)
    conditions.push(`p.district ILIKE $${values.length}`)
  }

  if (params.type) {
    values.push(params.type)
    conditions.push(`p.property_type = $${values.length}`)
  }

  // Filter kamar harus dipenuhi satu kamar yang sama, bukan dua kamar berbeda.
  const roomConditions: string[] = []
  if (params.bathroomType) {
    values.push(params.bathroomType)
    roomConditions.push(`r.bathroom_type = $${values.length}`)
  }
  if (params.minPrice !== undefined) {
    values.push(params.minPrice)
    roomConditions.push(`r.monthly_price >= $${values.length}`)
  }
  if (params.maxPrice !== undefined) {
    values.push(params.maxPrice)
    roomConditions.push(`r.monthly_price <= $${values.length}`)
  }
  if (roomConditions.length > 0) {
    conditions.push(
      `EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND ${roomConditions.join(' AND ')})`,
    )
  }

  if (params.facilities) {
    const slugs = params.facilities
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean)

    for (const slug of slugs) {
      values.push(slug)
      const i = values.length
      // Fasilitas boleh ada di level properti maupun di level kamar.
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM property_facilities pf
          JOIN facilities f ON f.id = pf.facility_id
          WHERE pf.property_id = p.id AND f.slug = $${i}
        )
        OR EXISTS (
          SELECT 1 FROM rooms r
          JOIN room_facilities rf ON rf.room_id = r.id
          JOIN facilities f ON f.id = rf.facility_id
          WHERE r.property_id = p.id AND f.slug = $${i}
        )
      )`)
    }
  }

  // Penyaringan jarak mendaftarkan parameternya sendiri, dan hanya di sini -
  // sehingga `values` selalu berisi tepat parameter yang benar-benar dirujuk
  // `whereSql`. Itu bukan kerapian belaka: query hitung (`SELECT count(*)`)
  // memakai `values` yang sama, dan satu parameter yang terdaftar tanpa dirujuk
  // membuat PostgreSQL menolak seluruh query dengan "bind message supplies N
  // parameters, but prepared statement requires 0".
  if (params.maxDistanceKm !== undefined) {
    const nearExpr = distanceFromPoint(values, titikPengunjung(params), KOLOM_KOORDINAT)
    values.push(params.maxDistanceKm)
    // Disaring di database, bukan setelah query. Kalau disaring di kode,
    // `meta.total` dan jumlah halamannya akan menghitung kos yang sebenarnya
    // tidak ditampilkan. Kos tanpa koordinat tersingkir sendiri karena jaraknya
    // NULL, dan `NULL <= nilai` tidak pernah benar.
    conditions.push(`${nearExpr} <= $${values.length}`)
  }

  return { whereSql: `WHERE ${conditions.join(' AND ')}`, values }
}

interface ListRow {
  id: string
  name: string
  slug: string
  city: string
  district: string
  property_type: string
  gender_policy: string
  verification_status: string
  cost_confidence: string
  last_availability_confirmation_at: Date | null
  min_monthly_price: string | null
  max_monthly_price: string | null
  available_rooms: number
  total_rooms: number
  bathroom_types: string[]
  facility_names: string[]
  facility_slugs: string[]
  image_url: string | null
  image_alt: string | null
  distance_km: string | null
  distance_from_origin_km: string | null
}

const toListItem = (row: ListRow) => {
  const days = daysSince(row.last_availability_confirmation_at)

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    district: row.district,
    propertyType: row.property_type,
    genderPolicy: row.gender_policy,
    verificationStatus: row.verification_status,
    costConfidence: row.cost_confidence,
    imageUrl: row.image_url,
    imageAlt: row.image_alt ?? row.name,
    minMonthlyPrice: row.min_monthly_price === null ? null : Number(row.min_monthly_price),
    maxMonthlyPrice: row.max_monthly_price === null ? null : Number(row.max_monthly_price),
    availableRooms: row.available_rooms,
    totalRooms: row.total_rooms,
    bathroomTypes: row.bathroom_types,
    facilities: row.facility_names,
    facilitySlugs: row.facility_slugs,
    availabilityConfirmedDaysAgo: days,
    isAvailabilityStale: days === null || days > AVAILABILITY_STALE_DAYS,
    // Keduanya selalu ada di hasil, bernilai null bila titiknya tidak diminta -
    // supaya bentuk itemnya tidak berubah-ubah dan frontend tidak perlu
    // memeriksa keberadaan kolomnya lebih dulu.
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    distanceFromOriginKm:
      row.distance_from_origin_km === null ? null : Number(row.distance_from_origin_km),
  }
}

/**
 * Alasan satu kos muncul di daftar "kos serupa".
 *
 * Ditulis sebagai kalimat pendek yang bisa dibaca apa adanya di kartunya.
 * Urutannya mengikuti urutan pengurutan di query: yang paling menentukan
 * disebut lebih dulu. Kalau tidak ada satu pun yang cocok, daftarnya kosong dan
 * kartunya tidak menampilkan baris alasan sama sekali, bukan menampilkan
 * keterangan kosong yang membingungkan.
 */
const alasanSerupa = (row: {
  kecamatan_sama: boolean
  kota_sama: boolean
  provinsi_sama: boolean
  tipe_sama: boolean
  gender_sama: boolean
  ada_kamar: boolean
}): string[] => {
  const alasan: string[] = []

  if (row.kecamatan_sama) alasan.push('Kecamatan yang sama')
  else if (row.kota_sama) alasan.push('Kota yang sama')
  else if (row.provinsi_sama) alasan.push('Provinsi yang sama')

  if (row.tipe_sama) alasan.push('Jenis kos yang sama')
  if (row.gender_sama) alasan.push('Penghuni yang diterima sama')
  if (row.ada_kamar) alasan.push('Ada kamar tersedia')

  return alasan
}

/** Bentuk baris properti untuk halaman pengelolaan pemilik. */
type PropertiKelolaRow = {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  address: string
  province: string
  city: string
  district: string
  subdistrict: string | null
  postal_code: string | null
  latitude: string | null
  longitude: string | null
  property_type: string
  gender_policy: string
  verification_status: string
  publication_status: string
  cost_confidence: string
  created_at: Date
  updated_at: Date
  total_kamar: number
  kamar_tersedia: number
  kamar_terisi: number
  harga_terendah: string | null
  primary_photo_url: string | null
}

/** Kolom properti untuk pengelolaan, dipakai bersama oleh daftar dan detail. */
const KOLOM_KELOLA = `
  p.id, p.owner_id, p.name, p.slug, p.description, p.address, p.province, p.city,
  p.district, p.subdistrict, p.postal_code, p.latitude, p.longitude, p.property_type,
  p.gender_policy, p.verification_status, p.publication_status, p.cost_confidence,
  p.created_at, p.updated_at,
  COALESCE(k.total_kamar, 0)::int AS total_kamar,
  COALESCE(k.kamar_tersedia, 0)::int AS kamar_tersedia,
  COALESCE(k.kamar_terisi, 0)::int AS kamar_terisi,
  k.harga_terendah,
  img.image_url AS primary_photo_url
`

/**
 * Sumber data pengelolaan.
 *
 * Agregat kamar dan foto utama dihitung di database, jadi satu halaman daftar
 * tetap satu query meski propertinya banyak.
 */
const DARI_KELOLA = `
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
`

const toPropertiKelola = (row: PropertiKelolaRow) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  address: row.address,
  province: row.province,
  city: row.city,
  district: row.district,
  subdistrict: row.subdistrict,
  postalCode: row.postal_code,
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  propertyType: row.property_type,
  genderPolicy: row.gender_policy,
  verificationStatus: row.verification_status,
  publicationStatus: row.publication_status,
  costConfidence: row.cost_confidence,
  totalRooms: row.total_kamar,
  availableRooms: row.kamar_tersedia,
  occupiedRooms: row.kamar_terisi,
  minMonthlyPrice: row.harga_terendah === null ? null : Number(row.harga_terendah),
  primaryPhotoUrl: row.primary_photo_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/**
 * Ambil properti dan pastikan pemanggilnya berhak mengelolanya.
 *
 * Properti milik orang lain dijawab 404, bukan 403. Jawaban 403 mengonfirmasi
 * bahwa properti dengan id itu memang ada, dan itu sudah cukup bagi orang yang
 * menebak-nebak id untuk memetakan properti siapa saja yang terdaftar.
 *
 * Admin dilewatkan: admin memang bertugas meninjau properti orang lain.
 */
const pastikanPemilik = async (user: AuthUser, propertyId: string): Promise<PropertiKelolaRow> => {
  const row = await queryOne<PropertiKelolaRow>(
    `SELECT ${KOLOM_KELOLA} ${DARI_KELOLA}
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [propertyId],
  )

  if (!row) {
    throw new HttpError(404, 'Properti tidak ditemukan')
  }

  if (user.role !== 'ADMIN' && row.owner_id !== user.userId) {
    throw new HttpError(404, 'Properti tidak ditemukan')
  }

  return row
}

/**
 * Alamat halaman yang unik untuk properti baru.
 *
 * Nama dijadikan slug supaya alamatnya bisa dibaca, lalu dipastikan belum
 * dipakai lewat query. Kalau sudah dipakai, potongan id ditambahkan: nama kos
 * yang sama di kota yang sama memang sering muncul, dan menolak simpan hanya
 * karena namanya kembar akan menyulitkan pemilik yang tidak bersalah.
 */
const slugUnik = async (nama: string, id: string): Promise<string> => {
  const dasar =
    nama
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'kos'

  const terpakai = await queryOne<{ ada: boolean }>(
    `SELECT true AS ada FROM properties WHERE slug = $1 LIMIT 1`,
    [dasar],
  )

  return terpakai ? `${dasar}-${id.slice(0, 8)}` : dasar
}

/**
 * Ambil data lengkap untuk sekumpulan id properti, lalu kembalikan sesuai
 * urutan id yang diminta.
 *
 * Agregat kamar, fasilitas, dan foto dihitung di database lewat subquery,
 * sehingga satu halaman hasil hanya butuh satu query, bukan satu query per
 * properti.
 *
 * Titik koordinatnya didaftarkan ulang di sini, bukan memakai ulang nomor
 * parameter dari `buildWhere`: query ini memakai `$1` untuk daftar id, sehingga
 * nomor parameter penyaring tadi sudah tidak berlaku. Menyalin ekspresinya akan
 * menghasilkan query yang menunjuk parameter yang salah.
 */
const fetchListRows = async (
  ids: string[],
  pengunjung?: GeoPoint,
  asal?: GeoPoint,
  hanyaPublik = false,
): Promise<ListRow[]> => {
  if (ids.length === 0) return []

  // $1 sudah dipakai daftar id; titik-titiknya menyusul setelahnya.
  const values: unknown[] = [ids]
  const nearExpr = distanceFromPoint(values, pengunjung, KOLOM_KOORDINAT)
  const originExpr = distanceFromPoint(values, asal, KOLOM_KOORDINAT)

  const rows = await query<ListRow>(
    `SELECT
       p.id, p.name, p.slug, p.city, p.district, p.property_type, p.gender_policy,
       p.verification_status, p.cost_confidence, p.last_availability_confirmation_at,
       rm.min_monthly_price, rm.max_monthly_price,
       COALESCE(rm.available_rooms, 0)::int AS available_rooms,
       COALESCE(rm.total_rooms, 0)::int     AS total_rooms,
       COALESCE(rm.bathroom_types, ARRAY[]::text[]) AS bathroom_types,
       COALESCE(fc.facility_names, ARRAY[]::text[]) AS facility_names,
       COALESCE(fc.facility_slugs, ARRAY[]::text[]) AS facility_slugs,
       img.image_url, img.alt_text AS image_alt,
       ${roundedDistanceSql(nearExpr)} AS distance_km,
       ${roundedDistanceSql(originExpr)} AS distance_from_origin_km
     FROM properties p
     LEFT JOIN (
       SELECT
         property_id,
         min(monthly_price) AS min_monthly_price,
         max(monthly_price) AS max_monthly_price,
         count(*) FILTER (WHERE availability_status = 'AVAILABLE') AS available_rooms,
         count(*) AS total_rooms,
         array_agg(DISTINCT bathroom_type) AS bathroom_types
       FROM rooms
       GROUP BY property_id
     ) rm ON rm.property_id = p.id
     LEFT JOIN (
       SELECT
         pf.property_id,
         array_agg(f.name ORDER BY f.name) AS facility_names,
         array_agg(f.slug ORDER BY f.name) AS facility_slugs
       FROM property_facilities pf
       JOIN facilities f ON f.id = pf.facility_id
       GROUP BY pf.property_id
     ) fc ON fc.property_id = p.id
     LEFT JOIN LATERAL (
       SELECT pi.image_url, pi.alt_text
       FROM property_images pi
       WHERE pi.property_id = p.id
       ORDER BY pi.display_order ASC
       LIMIT 1
     ) img ON true
     WHERE p.id = ANY($1::uuid[])
       ${
         hanyaPublik
           ? `AND p.deleted_at IS NULL
              AND p.publication_status = 'PUBLISHED'
              AND p.verification_status = 'VERIFIED'`
           : ''
       }`,
    values,
  )

  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.map((id) => byId.get(id)).filter((row): row is ListRow => row !== undefined)
}

export const propertiesService = {
  async listPublic(params: ListPropertiesQuery) {
    const { whereSql, values } = buildWhere(params)

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM properties p ${whereSql}`,
      values,
    )
    const total = countRow?.total ?? 0

    const limit = params.limit
    const offset = (params.page - 1) * params.limit

    // Pengurutan harga dihitung dari kamar termurah tiap properti, langsung di
    // database. Properti tanpa kamar selalu di urutan paling akhir.
    //
    // Salinan `values` dipakai untuk query id, bukan `values` itu sendiri:
    // `sort=distance` menambahkan parameter titik untuk ORDER BY, dan kalau
    // salinannya tidak dipisah, nomor parameter LIMIT/OFFSET ikut bergeser dan
    // menunjuk nilai yang salah. Klausa WHERE-nya tetap memakai `values` asli,
    // jadi query hitung di atas tidak terpengaruh.
    //
    // `NULLS LAST` wajib di sini: tanpa itu, kos yang belum punya koordinat
    // (jaraknya NULL) akan menempati urutan paling atas pada PostgreSQL, justru
    // tampil paling dekat padahal jaraknya tidak diketahui.
    const idValues = [...values]

    const urutan =
      params.sort === 'newest'
        ? 'p.created_at DESC'
        : params.sort === 'distance'
          ? `${distanceFromPoint(idValues, titikPengunjung(params), KOLOM_KOORDINAT)} ASC NULLS LAST, p.created_at DESC`
          : null

    const idSql =
      params.sort === 'newest' || params.sort === 'distance'
        ? `SELECT p.id
           FROM properties p
           ${whereSql}
           ORDER BY ${urutan}
           LIMIT $${idValues.length + 1} OFFSET $${idValues.length + 2}`
        : `SELECT p.id
           FROM properties p
           LEFT JOIN LATERAL (
             SELECT min(monthly_price) AS min_price FROM rooms WHERE property_id = p.id
           ) m ON true
           ${whereSql}
           ORDER BY m.min_price ${params.sort === 'price_asc' ? 'ASC' : 'DESC'} NULLS LAST,
                    p.created_at DESC
           LIMIT $${idValues.length + 1} OFFSET $${idValues.length + 2}`

    const idRows = await query<{ id: string }>(idSql, [...idValues, limit, offset])

    // Titik dioper terpisah supaya kolom jaraknya ikut terisi di hasil akhir.
    const rows = await fetchListRows(
      idRows.map((row) => row.id),
      titikPengunjung(params),
      titikAsal(params),
    )

    return {
      items: rows.map(toListItem),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /**
   * Beberapa properti sekaligus berdasarkan id, dalam bentuk kartu daftar.
   *
   * Dipakai halaman favorit. Pengunjung membuka halaman itu untuk melihat
   * kosnya, jadi mengirim daftar id saja memaksa frontend memanggil API sekali
   * lagi untuk setiap baris.
   *
   * Hanya properti yang masih terpublikasi dan terverifikasi yang dikembalikan.
   * Properti yang ditarik pemiliknya akan mengarah ke halaman yang tidak ada,
   * dan satu kartu seperti itu membuat seluruh daftar favorit terasa rusak.
   */
  async listPublicByIds(ids: string[]) {
    const rows = await fetchListRows(ids, undefined, undefined, true)
    return rows.map(toListItem)
  },

  /**
   * Kos lain yang mirip dengan satu properti.
   *
   * Kemiripannya diukur dari hal yang bisa diperiksa, bukan dari skor yang
   * dibuat-buat: kecamatan yang sama lebih dulu, lalu kota, provinsi, tipe kos,
   * peraturan penghuni, ada tidaknya kamar tersedia, dan harga yang tidak jauh
   * berbeda. Alasan setiap kos ikut dikirim supaya pembacanya bisa menilai
   * sendiri mengapa kos itu muncul di daftar ini.
   *
   * Jangkauannya sampai provinsi, bukan hanya kecamatan atau kota: kos
   * terverifikasi masih jarang, dan satu kecamatan sering hanya berisi satu
   * properti. Penyaring yang terlalu ketat membuat bagian ini selalu kosong,
   * dan bagian yang selalu kosong sama saja dengan tidak ada. Yang membedakan
   * tetap ditulis di alasannya, jadi pembaca tahu seberapa dekat kemiripannya.
   *
   * Harga acuan dipakai hanya sebagai pengurut terakhir. Kalau harga dijadikan
   * penyaring, kos yang sedikit lebih mahal tetapi persis di sebelah kos yang
   * dibuka justru hilang dari daftar, dan itu pembanding yang paling dicari.
   */
  async similar(slug: string, limit: number) {
    const acuan = await queryOne<{
      id: string
      city: string
      district: string
      province: string
      property_type: string
      gender_policy: string
      harga_terendah: string | null
    }>(
      `SELECT
         p.id, p.city, p.district, p.province, p.property_type, p.gender_policy,
         rm.harga AS harga_terendah
       FROM properties p
       LEFT JOIN LATERAL (
         SELECT min(monthly_price) AS harga FROM rooms WHERE property_id = p.id
       ) rm ON true
       WHERE p.slug = $1
         AND p.deleted_at IS NULL
         AND p.publication_status = 'PUBLISHED'
         AND p.verification_status = 'VERIFIED'`,
      [slug],
    )

    // Kos yang tidak terbit atau tidak terverifikasi dijawab 404, sama seperti
    // halaman detailnya. Bagian rekomendasi bukan jalan pintas untuk melihat
    // kos yang pemiliknya belum menerbitkannya.
    if (!acuan) {
      throw new HttpError(404, 'Properti tidak ditemukan')
    }

    const hargaAcuan = acuan.harga_terendah === null ? null : Number(acuan.harga_terendah)

    // Seluruh nilai lewat parameter; jumlah parameternya tetap, tidak berubah
    // menurut filter, sehingga penomorannya tidak pernah bergeser.
    const rows = await query<{
      id: string
      kecamatan_sama: boolean
      kota_sama: boolean
      provinsi_sama: boolean
      tipe_sama: boolean
      gender_sama: boolean
      ada_kamar: boolean
    }>(
      `SELECT
         p.id,
         (p.district = $2)      AS kecamatan_sama,
         (p.city = $3)          AS kota_sama,
         (p.province = $8)      AS provinsi_sama,
         (p.property_type = $4) AS tipe_sama,
         (p.gender_policy = $5) AS gender_sama,
         (COALESCE(rm.tersedia, 0) > 0) AS ada_kamar
       FROM properties p
       LEFT JOIN LATERAL (
         SELECT
           min(monthly_price) AS harga,
           count(*) FILTER (WHERE availability_status = 'AVAILABLE') AS tersedia
         FROM rooms
         WHERE property_id = p.id
       ) rm ON true
       WHERE p.id <> $1::uuid
         AND p.deleted_at IS NULL
         AND p.publication_status = 'PUBLISHED'
         AND p.verification_status = 'VERIFIED'
         AND (p.district = $2 OR p.city = $3 OR p.province = $8)
       ORDER BY
         (p.district = $2) DESC,
         (p.city = $3) DESC,
         (p.province = $8) DESC,
         (p.property_type = $4) DESC,
         (p.gender_policy = $5) DESC,
         (COALESCE(rm.tersedia, 0) > 0) DESC,
         CASE WHEN $6::numeric IS NULL THEN 0
              ELSE abs(COALESCE(rm.harga, 0) - $6::numeric) END ASC,
         p.created_at DESC
       LIMIT $7`,
      [
        acuan.id,
        acuan.district,
        acuan.city,
        acuan.property_type,
        acuan.gender_policy,
        hargaAcuan,
        limit,
        acuan.province,
      ],
    )

    if (rows.length === 0) return []

    // Bentuk kartunya diambil dari fungsi yang sama dengan daftar pencarian,
    // jadi kartu di bagian ini tidak pernah berbeda isi dari kartu di /kos.
    const items = await propertiesService.listPublicByIds(rows.map((row) => row.id))
    const alasanById = new Map(rows.map((row) => [row.id, alasanSerupa(row)]))

    return items.map((item) => ({ ...item, alasan: alasanById.get(item.id) ?? [] }))
  },

  /**
   * Properti milik satu pemilik, termasuk yang masih draf.
   *
   * Berbeda dari daftar publik yang hanya memuat properti terverifikasi dan
   * terbit: halaman pengelolaan justru harus memperlihatkan properti yang belum
   * lolos verifikasi. Kalau tidak, pemilik yang baru menambahkan properti akan
   * melihat halaman kosong dan mengira datanya hilang.
   */
  async listMine(userId: string, params: ListMyPropertiesQuery) {
    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM properties p
       WHERE p.owner_id = $1 AND p.deleted_at IS NULL`,
      [userId],
    )

    const offset = (params.page - 1) * params.limit

    const rows = await query<PropertiKelolaRow>(
      `SELECT ${KOLOM_KELOLA} ${DARI_KELOLA}
       WHERE p.owner_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, params.limit, offset],
    )

    const total = countRow?.total ?? 0

    return {
      items: rows.map(toPropertiKelola),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /** Tambah properti baru sebagai draf milik pemilik yang sedang masuk. */
  async create(user: AuthUser, input: CreatePropertyInput) {
    const id = randomUUID()

    // Slug dibuat dari nama, bukan diminta ke pemilik: nama properti sudah
    // cukup untuk alamat halaman, dan menambah satu isian lagi hanya menambah
    // satu kesempatan salah isi.
    const slug = await slugUnik(input.name, id)

    // Hasilnya dibaca ulang lewat `pastikanPemilik`, bukan dari `RETURNING`.
    // Daftar kolom pengelolaan dipakai bersama oleh daftar, detail, dan
    // formulir, dan menyalinnya ke dalam `RETURNING` berarti satu tempat lagi
    // yang harus ikut berubah setiap kali kolomnya bertambah. Yang lupa
    // disalin tidak error, hanya muncul sebagai kolom hilang di respons.
    await query(
      `INSERT INTO properties (
         id, owner_id, name, slug, description, address, province, city, district,
         subdistrict, postal_code, latitude, longitude, property_type, gender_policy,
         verification_status, publication_status
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15,
         'PENDING', 'DRAFT'
       )`,
      [
        id,
        user.userId,
        input.name,
        slug,
        input.description ?? null,
        input.address,
        input.province,
        input.city,
        input.district,
        input.subdistrict ?? null,
        input.postalCode ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.propertyType,
        input.genderPolicy,
      ],
    )

    return toPropertiKelola(await pastikanPemilik(user, id))
  },

  /** Ubah properti milik sendiri. Kepemilikan diperiksa sebelum apa pun ditulis. */
  async update(user: AuthUser, propertyId: string, input: UpdatePropertyInput) {
    await pastikanPemilik(user, propertyId)

    // Pemetaan tetap, bukan dirangkai dari nama field masukan, supaya nama
    // kolom tidak pernah bisa ditentukan oleh isi permintaan.
    const peta: [keyof UpdatePropertyInput, string][] = [
      ['name', 'name'],
      ['description', 'description'],
      ['address', 'address'],
      ['province', 'province'],
      ['city', 'city'],
      ['district', 'district'],
      ['subdistrict', 'subdistrict'],
      ['postalCode', 'postal_code'],
      ['latitude', 'latitude'],
      ['longitude', 'longitude'],
      ['propertyType', 'property_type'],
      ['genderPolicy', 'gender_policy'],
    ]

    const assignments: string[] = []
    const values: unknown[] = []

    for (const [field, kolom] of peta) {
      const nilai = input[field]
      if (nilai === undefined) continue
      values.push(nilai === '' ? null : nilai)
      assignments.push(`${kolom} = $${values.length}`)
    }

    if (assignments.length === 0) {
      throw new HttpError(400, 'Tidak ada perubahan yang dikirim')
    }

    values.push(propertyId)

    await query(
      `UPDATE properties SET ${assignments.join(', ')}, updated_at = now()
       WHERE id = $${values.length} AND deleted_at IS NULL`,
      values,
    )

    return this.detailMine(user, propertyId)
  },

  /**
   * Satu properti milik sendiri, dipakai halaman pengelolaan dan formulir ubah.
   *
   * Tidak memakai `detailPublic` karena properti draf tidak akan pernah lolos
   * penyaringnya, sehingga pemiliknya sendiri tidak bisa membuka propertinya
   * yang belum terbit.
   */
  async detailMine(user: AuthUser, propertyId: string) {
    const row = await pastikanPemilik(user, propertyId)

    const [gambar, aturan, biaya, kamar] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT id, image_url, alt_text, is_primary, display_order
         FROM property_images WHERE property_id = $1
         ORDER BY display_order ASC`,
        [propertyId],
      ),
      query<Record<string, unknown>>(
        `SELECT id, rule_title, rule_description, is_mandatory
         FROM property_rules WHERE property_id = $1
         ORDER BY is_mandatory DESC, rule_title ASC`,
        [propertyId],
      ),
      query<Record<string, unknown>>(
        `SELECT id, name, amount, billing_type, is_mandatory, is_refundable,
                cost_confidence, description
         FROM cost_components WHERE property_id = $1 ORDER BY name ASC`,
        [propertyId],
      ),
      query<Record<string, unknown>>(
        `SELECT id, room_number, room_name, room_type, monthly_price,
                maximum_occupants, bathroom_type, availability_status
         FROM rooms WHERE property_id = $1 ORDER BY room_number ASC`,
        [propertyId],
      ),
    ])

    return {
      ...toPropertiKelola(row),
      images: gambar.map((image) => ({
        id: image.id as string,
        url: image.image_url as string | null,
        alt: (image.alt_text as string | null) ?? (row.name as string),
        isPrimary: image.is_primary as boolean,
      })),
      rules: aturan.map((rule) => ({
        id: rule.id as string,
        title: rule.rule_title as string,
        description: rule.rule_description as string | null,
        isMandatory: rule.is_mandatory as boolean,
      })),
      costs: biaya.map((item) => ({
        id: item.id as string,
        name: item.name as string,
        amount: Number(item.amount),
        billingType: item.billing_type as string,
        isMandatory: item.is_mandatory as boolean,
        isRefundable: item.is_refundable as boolean,
        confidence: item.cost_confidence as string,
        description: item.description as string | null,
      })),
      rooms: kamar.map((room) => ({
        id: room.id as string,
        roomNumber: room.room_number as string,
        roomName: room.room_name as string | null,
        roomType: room.room_type as string,
        monthlyPrice: Number(room.monthly_price),
        maximumOccupants: room.maximum_occupants as number,
        bathroomType: room.bathroom_type as string,
        availabilityStatus: room.availability_status as string,
      })),
    }
  },

  /**
   * Ajukan properti untuk diverifikasi admin.
   *
   * Perpindahan statusnya dicatat di `property_verification_histories` supaya
   * admin bisa melihat properti ini pernah ditolak dan mengapa, tanpa harus
   * bertanya ke pemiliknya.
   */
  async submitForReview(user: AuthUser, propertyId: string) {
    const properti = await pastikanPemilik(user, propertyId)

    if (properti.verification_status === 'VERIFIED') {
      throw new HttpError(409, 'Properti ini sudah terverifikasi')
    }

    if (properti.verification_status === 'UNDER_REVIEW') {
      throw new HttpError(409, 'Properti ini sedang ditinjau admin')
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE properties
         SET verification_status = 'UNDER_REVIEW', updated_at = now()
         WHERE id = $1`,
        [propertyId],
      )

      await client.query(
        `INSERT INTO property_verification_histories
           (property_id, previous_status, new_status, notes)
         VALUES ($1, $2, 'UNDER_REVIEW', 'Diajukan pemilik untuk ditinjau')`,
        [propertyId, properti.verification_status],
      )
    })

    return this.detailMine(user, propertyId)
  },

  /**
   * Terbitkan atau tarik properti dari daftar publik.
   *
   * Hanya properti terverifikasi yang boleh terbit. Properti draf yang bisa
   * terbit akan tampil di halaman pencarian tanpa pernah diperiksa admin, dan
   * itu justru hal yang verifikasi ini ada untuk mencegahnya.
   */
  async setPublication(
    user: AuthUser,
    propertyId: string,
    publicationStatus: 'PUBLISHED' | 'UNPUBLISHED',
  ) {
    const properti = await pastikanPemilik(user, propertyId)

    if (publicationStatus === 'PUBLISHED' && properti.verification_status !== 'VERIFIED') {
      throw new HttpError(409, 'Properti harus terverifikasi dulu sebelum diterbitkan')
    }

    await query(
      `UPDATE properties
       SET publication_status = $2,
           published_at = CASE WHEN $2 = 'PUBLISHED' THEN COALESCE(published_at, now()) ELSE published_at END,
           updated_at = now()
       WHERE id = $1`,
      [propertyId, publicationStatus],
    )

    return this.detailMine(user, propertyId)
  },

  async detailPublic(slug: string) {
    const property = await queryOne<{
      id: string
      name: string
      slug: string
      description: string | null
      address: string
      province: string
      city: string
      district: string
      subdistrict: string | null
      postal_code: string | null
      latitude: string | null
      longitude: string | null
      property_type: string
      gender_policy: string
      verification_status: string
      publication_status: string
      cost_confidence: string
      last_availability_confirmation_at: Date | null
      owner_id: string
      owner_name: string
      owner_business_name: string | null
      owner_verified_at: Date | null
    }>(
      `SELECT
         p.id, p.name, p.slug, p.description, p.address, p.province, p.city, p.district,
         p.subdistrict, p.postal_code, p.latitude, p.longitude, p.property_type,
         p.gender_policy, p.verification_status, p.publication_status, p.cost_confidence,
         p.last_availability_confirmation_at,
         o.id AS owner_id, o.full_name AS owner_name,
         op.business_name AS owner_business_name, op.verified_at AS owner_verified_at
       FROM properties p
       JOIN users o ON o.id = p.owner_id
       LEFT JOIN owner_profiles op ON op.user_id = o.id
       WHERE p.slug = $1
         AND p.deleted_at IS NULL
         AND p.publication_status = 'PUBLISHED'
         AND p.verification_status = 'VERIFIED'`,
      [slug],
    )

    if (!property) {
      throw new HttpError(404, 'Properti tidak ditemukan')
    }

    // Bentuk properti sudah pasti ada, jadi relasinya boleh diambil paralel.
    const [images, facilities, rules, costRows, roomRows] = await Promise.all([
      query<{ id: string; image_url: string | null; alt_text: string | null; is_primary: boolean }>(
        `SELECT id, image_url, alt_text, is_primary
         FROM property_images
         WHERE property_id = $1
         ORDER BY display_order ASC`,
        [property.id],
      ),
      query<{ name: string; slug: string; category: string }>(
        `SELECT f.name, f.slug, f.category
         FROM property_facilities pf
         JOIN facilities f ON f.id = pf.facility_id
         WHERE pf.property_id = $1
         ORDER BY f.name ASC`,
        [property.id],
      ),
      query<{
        id: string
        rule_title: string
        rule_description: string | null
        is_mandatory: boolean
      }>(
        `SELECT id, rule_title, rule_description, is_mandatory
         FROM property_rules
         WHERE property_id = $1
         ORDER BY is_mandatory DESC, rule_title ASC`,
        [property.id],
      ),
      query<{
        id: string
        name: string
        amount: string
        billing_type: string
        is_mandatory: boolean
        is_refundable: boolean
        cost_confidence: string
        description: string | null
      }>(
        `SELECT id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description
         FROM cost_components
         WHERE property_id = $1
         ORDER BY name ASC`,
        [property.id],
      ),
      query<{
        id: string
        room_number: string
        room_name: string | null
        room_type: string
        monthly_price: string
        maximum_occupants: number
        bathroom_type: string
        area_width: string | null
        area_length: string | null
        floor_number: number | null
        availability_status: string
        facility_names: string[]
      }>(
        `SELECT
           r.id, r.room_number, r.room_name, r.room_type, r.monthly_price,
           r.maximum_occupants, r.bathroom_type, r.area_width, r.area_length,
           r.floor_number, r.availability_status,
           COALESCE(
             (SELECT array_agg(f.name ORDER BY f.name)
              FROM room_facilities rf
              JOIN facilities f ON f.id = rf.facility_id
              WHERE rf.room_id = r.id),
             ARRAY[]::text[]
           ) AS facility_names
         FROM rooms r
         WHERE r.property_id = $1
         ORDER BY r.room_number ASC`,
        [property.id],
      ),
    ])

    const prices = roomRows.map((room) => Number(room.monthly_price))
    const minMonthlyPrice = prices.length > 0 ? Math.min(...prices) : null
    const days = daysSince(property.last_availability_confirmation_at)

    const costInputs: CostComponentInput[] = costRows.map((component) => ({
      id: component.id,
      name: component.name,
      amount: Number(component.amount),
      billingType: component.billing_type as CostComponentInput['billingType'],
      isMandatory: component.is_mandatory,
      isRefundable: component.is_refundable,
      confidence: component.cost_confidence as CostComponentInput['confidence'],
      description: component.description,
    }))

    return {
      id: property.id,
      name: property.name,
      slug: property.slug,
      description: property.description,
      address: property.address,
      province: property.province,
      city: property.city,
      district: property.district,
      subdistrict: property.subdistrict,
      postalCode: property.postal_code,
      latitude: property.latitude === null ? null : Number(property.latitude),
      longitude: property.longitude === null ? null : Number(property.longitude),
      propertyType: property.property_type,
      genderPolicy: property.gender_policy,
      verificationStatus: property.verification_status,
      publicationStatus: property.publication_status,
      costConfidence: property.cost_confidence,
      totalRooms: roomRows.length,
      owner: {
        id: property.owner_id,
        name: property.owner_name,
        businessName: property.owner_business_name,
        verified: property.owner_verified_at !== null,
      },
      images: images.map((image) => ({
        id: image.id,
        url: image.image_url,
        alt: image.alt_text ?? property.name,
        isPrimary: image.is_primary,
      })),
      facilities: facilities.map((facility) => ({
        name: facility.name,
        slug: facility.slug,
        category: facility.category,
      })),
      rules: rules.map((rule) => ({
        id: rule.id,
        title: rule.rule_title,
        description: rule.rule_description,
        isMandatory: rule.is_mandatory,
      })),
      rooms: roomRows.map((room) => ({
        id: room.id,
        roomNumber: room.room_number,
        roomName: room.room_name,
        roomType: room.room_type,
        monthlyPrice: Number(room.monthly_price),
        maximumOccupants: room.maximum_occupants,
        bathroomType: room.bathroom_type,
        areaWidth: room.area_width === null ? null : Number(room.area_width),
        areaLength: room.area_length === null ? null : Number(room.area_length),
        floorNumber: room.floor_number,
        availabilityStatus: room.availability_status,
        facilities: room.facility_names,
      })),
      // Komponen biaya ikut dikirim satu per satu, bukan hanya totalnya.
      // Halaman simulasi biaya harus bisa menunjukkan biaya mana yang sudah
      // dikonfirmasi pemilik dan mana yang masih perkiraan; dari angka total
      // saja perbedaan itu hilang, dan seluruhnya terbaca sebagai satu angka
      // pasti. Isinya sama dengan yang sudah tampil di halaman properti.
      costs: costRows.map((component) => ({
        id: component.id,
        name: component.name,
        amount: Number(component.amount),
        billingType: component.billing_type,
        isMandatory: component.is_mandatory,
        isRefundable: component.is_refundable,
        confidence: component.cost_confidence,
        description: component.description,
      })),
      costSummary: buildCostSummary(costInputs, minMonthlyPrice),
      availabilityConfirmedDaysAgo: days,
      isAvailabilityStale: days === null || days > AVAILABILITY_STALE_DAYS,
    }
  },
}
