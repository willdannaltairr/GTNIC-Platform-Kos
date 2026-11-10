import { query } from './_shared/db.ts'
import { distanceFromPoint, roundedDistanceSql, type GeoPoint } from './_shared/geo.ts'
import { BOBOT, BATAS_ANGGARAN, hitungSkor, RUMUS, type Kandidat, type Preferensi } from './kosmatch.ts'
import { daftarFasilitasDiminta, type MatchQuery } from './match.validator.ts'

/**
 * KosMatch: memeringkat kos menurut preferensi yang diisi penggunanya.
 *
 * Dua keputusan yang membentuk berkas ini:
 *
 *  1. Penyaringan yang tegas (kos terbit dan terverifikasi, ada kamar tersedia,
 *     jenis kos, kota, dan batas anggaran) dikerjakan database. Yang lolos dari
 *     saringan itu adalah himpunan yang benar-benar mungkin cocok.
 *  2. Pemeringkatannya dikerjakan di aplikasi lewat `hitungSkor`, bukan di
 *     dalam SQL. Rumusnya harus bisa ditampilkan dan diperiksa pengguna, dan
 *     rumus yang tertanam di teks SQL tidak bisa diuji maupun dibaca dari satu
 *     tempat. Untuk jumlah kos yang lolos saringan, seluruh himpunan itu
 *     diambil sekaligus lalu diurutkan di sini; kalau kelak jumlahnya ribuan,
 *     rumusnya perlu dipindahkan ke SQL dan itu perubahan yang disengaja,
 *     bukan sesuatu yang terjadi diam-diam.
 *
 * Tidak ada kolom yang dihitung dari data pribadi: seluruh masukan rumusnya
 * adalah data publik properti dan preferensi yang diketik penggunanya sendiri.
 */

/** Kolom koordinat properti, sama seperti modul properties. */
const KOLOM_KOORDINAT = { lat: 'p.latitude', lng: 'p.longitude' }

interface KandidatRow {
  id: string
  name: string
  slug: string
  city: string
  district: string
  property_type: string
  gender_policy: string
  image_url: string | null
  image_alt: string | null
  harga_terendah: string | null
  kamar_tersedia: number
  kamar_mandi: string[] | null
  penghuni_maks: number | null
  jarak_km: string | null
}

/**
 * Ambil properti yang lolos saringan tegas, beserta fakta yang dinilai rumus.
 *
 * Seluruh nilainya parameter; tidak ada satu pun yang disisipkan ke teks SQL.
 */
const ambilKandidat = async (params: MatchQuery, titik?: GeoPoint): Promise<KandidatRow[]> => {
  const values: unknown[] = []

  // Jarak didaftarkan lebih dulu supaya nomor parameternya pasti, dan hanya
  // didaftarkan bila titiknya memang ada: parameter yang terdaftar tanpa
  // dirujuk membuat PostgreSQL menolak seluruh query.
  const jarak = distanceFromPoint(values, titik, KOLOM_KOORDINAT)

  const conditions: string[] = [
    'p.deleted_at IS NULL',
    "p.publication_status = 'PUBLISHED'",
    "p.verification_status = 'VERIFIED'",
    // Kamar tersedia dihitung di subquery `k`; kos yang seluruh kamarnya
    // terisi tidak mungkin dipilih, jadi tidak ikut dinilai.
    'k.kamar_tersedia > 0',
  ]

  if (params.city) {
    values.push(`%${params.city}%`)
    conditions.push(`p.city ILIKE $${values.length}`)
  }

  if (params.maxPrice !== undefined) {
    values.push(Math.round(params.maxPrice * BATAS_ANGGARAN))
    conditions.push(`k.harga_terendah <= $${values.length}`)
  }

  return await query<KandidatRow>(
    `SELECT
       p.id, p.name, p.slug, p.city, p.district, p.property_type, p.gender_policy,
       img.image_url, img.alt_text AS image_alt,
       k.harga_terendah, k.kamar_tersedia, k.kamar_mandi, k.penghuni_maks,
       ${roundedDistanceSql(jarak)} AS jarak_km
     FROM properties p
     LEFT JOIN LATERAL (
       SELECT
         min(r.monthly_price) AS harga_terendah,
         count(*)::int AS kamar_tersedia,
         array_agg(DISTINCT r.bathroom_type) AS kamar_mandi,
         max(r.maximum_occupants)::int AS penghuni_maks
       FROM rooms r
       WHERE r.property_id = p.id AND r.availability_status = 'AVAILABLE'
     ) k ON true
     LEFT JOIN LATERAL (
       SELECT pi.image_url, pi.alt_text
       FROM property_images pi
       WHERE pi.property_id = p.id
       ORDER BY pi.display_order ASC
       LIMIT 1
     ) img ON true
     WHERE ${conditions.join(' AND ')}`,
    values,
  )
}

/**
 * Fasilitas tiap kandidat, diambil dalam satu query terpisah lalu dikelompokkan
 * di sini.
 *
 * Bukan lewat agregat JSON di dalam query utama: bentuk nilai JSON yang
 * dikembalikan driver tidak diperiksa tipe apa pun, dan satu perubahan kecil
 * pada driver akan membuat pengelompokannya gagal tanpa suara. Cara ini juga
 * menghindari satu query tambahan per kandidat.
 */
const ambilFasilitas = async (ids: string[]): Promise<Map<string, { slug: string; name: string }[]>> => {
  const hasil = new Map<string, { slug: string; name: string }[]>()
  if (ids.length === 0) return hasil

  const rows = await query<{ property_id: string; slug: string; name: string }>(
    `SELECT x.property_id, x.slug, x.name
     FROM (
       SELECT pf.property_id, f.slug, f.name
       FROM property_facilities pf
       JOIN facilities f ON f.id = pf.facility_id
       WHERE pf.property_id = ANY($1::uuid[])
       UNION
       SELECT r.property_id, f.slug, f.name
       FROM room_facilities rf
       JOIN rooms r ON r.id = rf.room_id
       JOIN facilities f ON f.id = rf.facility_id
       WHERE r.property_id = ANY($1::uuid[])
     ) x
     ORDER BY x.slug ASC`,
    [ids],
  )

  for (const row of rows) {
    const daftar = hasil.get(row.property_id) ?? []
    daftar.push({ slug: row.slug, name: row.name })
    hasil.set(row.property_id, daftar)
  }

  return hasil
}

export const matchService = {
  /**
   * Cari kos yang paling cocok dengan preferensi yang diisi.
   *
   * Mengembalikan `items` terurut dari skor tertinggi, beserta `meta` yang
   * memuat rumus, bobot yang benar-benar dipakai, dan faktor yang tidak
   * dihitung supaya halaman hasil bisa menjelaskan dirinya sendiri.
   */
  async cari(params: MatchQuery) {
    const titik =
      params.nearLat !== undefined && params.nearLng !== undefined
        ? { lat: params.nearLat, lng: params.nearLng }
        : undefined

    const fasilitasDiminta = daftarFasilitasDiminta(params.facilities)

    const preferensi: Preferensi = {
      maxPrice: params.maxPrice,
      memakaiLokasi: titik !== undefined,
      fasilitas: fasilitasDiminta,
      bathroomType: params.bathroomType,
      minOccupants: params.minOccupants,
      genderPolicy: params.genderPolicy,
    }

    const rows = await ambilKandidat(params, titik)
    const fasilitas = await ambilFasilitas(rows.map((row) => row.id))

    const dinilai = rows.map((row) => {
      const kandidat: Kandidat = {
        id: row.id,
        hargaTermurah: row.harga_terendah === null ? null : Number(row.harga_terendah),
        kamarTersedia: row.kamar_tersedia,
        kamarMandi: row.kamar_mandi ?? [],
        penghuniMaks: row.penghuni_maks,
        jarakKm: row.jarak_km === null ? null : Number(row.jarak_km),
        fasilitas: fasilitas.get(row.id) ?? [],
        genderPolicy: row.gender_policy,
      }

      const skor = hitungSkor(kandidat, preferensi)

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        city: row.city,
        district: row.district,
        propertyType: row.property_type,
        genderPolicy: row.gender_policy,
        imageUrl: row.image_url,
        imageAlt: row.image_alt ?? row.name,
        hargaTermurah: kandidat.hargaTermurah,
        kamarTersedia: row.kamar_tersedia,
        jarakKm: kandidat.jarakKm,
        skorTotal: skor.skorTotal,
        faktor: skor.faktor,
      }
    })

    // Urutan seri diputus oleh nama, bukan dibiarkan apa adanya: dua kos dengan
    // skor sama yang bertukar tempat setiap kali halaman dimuat terbaca sebagai
    // daftar yang berubah-ubah isinya.
    dinilai.sort((a, b) => b.skorTotal - a.skorTotal || a.name.localeCompare(b.name, 'id'))

    const items = dinilai.slice(0, params.limit)

    // Faktor yang tidak diminta dihitung dari preferensinya, bukan dari
    // kandidat: daftar ini menjelaskan "mengapa faktor ini absen dari
    // perhitungan", dan sebabnya ada di permintaan penggunanya, bukan di kos
    // yang kebetulan diperiksa. Faktor yang absen karena datanya kosong (mis.
    // kos tanpa koordinat) tetap terlihat per kandidat lewat `faktor`.
    const faktorTidakDiminta: { id: string; label: string; sebab: string }[] = []
    if (params.maxPrice === undefined) {
      faktorTidakDiminta.push({
        id: 'anggaran',
        label: 'Anggaran',
        sebab: 'Tidak diisi, jadi harganya tidak ikut dinilai.',
      })
    }
    if (titik === undefined) {
      faktorTidakDiminta.push({
        id: 'lokasi',
        label: 'Lokasi',
        sebab: 'Titik acuan tidak dikirim, jadi jaraknya tidak ikut dinilai.',
      })
    }
    if (fasilitasDiminta.length === 0) {
      faktorTidakDiminta.push({
        id: 'fasilitas',
        label: 'Fasilitas',
        sebab: 'Tidak ada fasilitas yang diminta.',
      })
    }
    if (
      params.bathroomType === undefined &&
      params.minOccupants === undefined &&
      params.genderPolicy === undefined
    ) {
      faktorTidakDiminta.push({
        id: 'preferensi',
        label: 'Preferensi kamar',
        sebab: 'Jenis kamar mandi, kapasitas, dan jenis kos tidak diisi.',
      })
    }

    return {
      items,
      meta: {
        total: dinilai.length,
        ditampilkan: items.length,
        bobot: BOBOT,
        rumus: RUMUS,
        faktorTidakDiminta,
        batasAnggaran:
          params.maxPrice === undefined
            ? null
            : `Harga di atas ${Math.round(params.maxPrice * BATAS_ANGGARAN).toLocaleString('id-ID')} rupiah tidak diikutkan karena sudah di luar toleransi anggaran.`,
        preferensi: {
          maxPrice: params.maxPrice ?? null,
          memakaiLokasi: titik !== undefined,
          fasilitas: fasilitasDiminta,
          bathroomType: params.bathroomType ?? null,
          minOccupants: params.minOccupants ?? null,
          city: params.city ?? null,
          genderPolicy: params.genderPolicy ?? null,
        },
      },
    }
  },
}
