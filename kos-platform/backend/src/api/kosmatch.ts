/**
 * Rumus KosMatch: persentase kecocokan yang bisa diperiksa penggunanya.
 *
 * Berkas ini sengaja hanya berisi perhitungan, tanpa akses database sama
 * sekali, supaya satu-satunya tempat rumusnya hidup adalah di sini. Kalau
 * angkanya dihitung di dalam query, tidak ada yang bisa menjelaskan kepada
 * pengguna dari mana sebuah persentase datang, dan justru itu yang dilarang:
 * kecocokan tidak boleh berupa angka acak.
 *
 * Aturan yang dipegang:
 * - Bobotnya tetap dan ditulis terbuka: anggaran 35, lokasi 30, fasilitas 20,
 *   preferensi kamar 15. Angka ini sama dengan yang tampil di landing.
 * - Faktor yang tidak diminta pengguna TIDAK dihitung, bukan diberi nol. Bobot
 *   faktor yang tersisa dinormalkan ulang, dan bobot yang benar-benar dipakai
 *   ikut dikembalikan supaya bisa diperiksa.
 * - Setiap faktor membawa alasannya sendiri dalam bahasa manusia, bukan hanya
 *   angkanya.
 */

export const BOBOT = {
  anggaran: 35,
  lokasi: 30,
  fasilitas: 20,
  preferensi: 15,
} as const

export type IdFaktor = keyof typeof BOBOT

export const LABEL_FAKTOR: Record<IdFaktor, string> = {
  anggaran: 'Anggaran',
  lokasi: 'Lokasi',
  fasilitas: 'Fasilitas',
  preferensi: 'Preferensi kamar',
}

/**
 * Seberapa jauh di atas anggaran sebuah kos masih ditampilkan.
 *
 * Di atas batas ini, kosnya tidak lagi bisa disebut cocok: skornya sudah nol
 * pada faktor anggaran, dan menampilkannya hanya memenuhi daftar dengan pilihan
 * yang pasti tidak dipakai. Batasnya dikembalikan ke pengguna di `meta`.
 */
export const BATAS_ANGGARAN = 1.3

/** Jarak yang membuat skor lokasi penuh, dan jarak yang membuatnya nol. */
export const LOKASI_SKOR_PENUH_KM = 0.5
export const LOKASI_NOL_KM = 6

export interface Kandidat {
  id: string
  hargaTermurah: number | null
  kamarTersedia: number
  kamarMandi: string[]
  penghuniMaks: number | null
  jarakKm: number | null
  fasilitas: { slug: string; name: string }[]
  genderPolicy: string
}

export interface Preferensi {
  maxPrice?: number
  memakaiLokasi: boolean
  fasilitas: string[]
  bathroomType?: 'private' | 'shared'
  minOccupants?: number
  genderPolicy?: 'putra' | 'putri' | 'campur'
}

export interface Faktor {
  id: IdFaktor
  label: string
  bobot: number
  /** `null` berarti faktor ini tidak dihitung, bukan dihitung sebagai nol. */
  skor: number | null
  alasan: string
}

export interface HasilSkor {
  skorTotal: number
  faktor: Faktor[]
  bobotDipakai: number
  faktorTidakDihitung: { id: IdFaktor; label: string; sebab: string }[]
}

const rupiah = (nilai: number): string => `Rp${Math.round(nilai).toLocaleString('id-ID')}`

const angka = (nilai: number): string =>
  nilai.toLocaleString('id-ID', { maximumFractionDigits: 1 })

/** Bulatkan ke satu desimal; semua skor faktor memakai satuan yang sama. */
const bulat1 = (nilai: number): number => Math.round(nilai * 10) / 10

/**
 * Skor anggaran: harga di dalam anggaran bernilai penuh, di atasnya turun
 * sampai nol pada batas toleransi.
 *
 * Harga yang jauh di bawah anggaran tidak diberi nilai lebih tinggi: yang
 * dicari pengguna adalah kos yang muat di anggarannya, bukan yang paling murah.
 * Menilai lebih tinggi hanya karena lebih murah akan menyembunyikan pilihan
 * yang lebih baik pada faktor lain.
 */
const skorAnggaran = (harga: number | null, anggaran: number | undefined): Faktor => {
  const dasar = { id: 'anggaran' as const, label: LABEL_FAKTOR.anggaran, bobot: BOBOT.anggaran }

  if (anggaran === undefined) {
    return {
      ...dasar,
      skor: null,
      alasan: 'Anggaran bulanan tidak diisi.',
    }
  }

  if (harga === null) {
    return {
      ...dasar,
      skor: null,
      alasan: 'Belum ada kamar tersedia yang punya harga.',
    }
  }

  if (harga <= anggaran) {
    return {
      ...dasar,
      skor: 100,
      alasan: `Harga kamar termurah ${rupiah(harga)} masih di dalam anggaran ${rupiah(anggaran)}.`,
    }
  }

  const rasio = harga / anggaran
  const skor = Math.max(0, (BATAS_ANGGARAN - rasio) / (BATAS_ANGGARAN - 1)) * 100
  const persen = Math.round((rasio - 1) * 100)

  return {
    ...dasar,
    skor: bulat1(skor),
    alasan: `Harga kamar termurah ${rupiah(harga)} melewati anggaran ${rupiah(anggaran)} sebesar ${persen} persen.`,
  }
}

/**
 * Skor lokasi: turun lurus terhadap jarak antara titik jenuh dan titik nol.
 *
 * Dipilih lurus, bukan melengkung, karena pengguna harus bisa memperkirakan
 * sendiri: 1,8 km selalu berarti angka yang sama, dan itu bisa diperiksa dengan
 * penggaris di peta.
 */
const skorLokasi = (jarak: number | null, diminta: boolean): Faktor => {
  const dasar = { id: 'lokasi' as const, label: LABEL_FAKTOR.lokasi, bobot: BOBOT.lokasi }

  if (!diminta) {
    return { ...dasar, skor: null, alasan: 'Titik acuan lokasi tidak diisi.' }
  }

  if (jarak === null) {
    return {
      ...dasar,
      skor: null,
      alasan: 'Kos ini belum punya koordinat, jadi jaraknya tidak bisa dihitung.',
    }
  }

  const rentang = LOKASI_NOL_KM - LOKASI_SKOR_PENUH_KM
  const skor = Math.max(0, Math.min(1, (LOKASI_NOL_KM - jarak) / rentang)) * 100

  return {
    ...dasar,
    skor: bulat1(skor),
    alasan:
      jarak <= LOKASI_SKOR_PENUH_KM
        ? `${angka(jarak)} km dari titik acuan Anda, masih di bawah ${angka(LOKASI_SKOR_PENUH_KM)} km.`
        : `${angka(jarak)} km dari titik acuan Anda. Skor penuh sampai ${angka(LOKASI_SKOR_PENUH_KM)} km, nol pada ${angka(LOKASI_NOL_KM)} km.`,
  }
}

/**
 * Skor fasilitas: bagian yang tersedia dari yang diminta.
 *
 * Fasilitas dihitung dari properti maupun kamarnya sekaligus, karena penyewa
 * tidak membedakan letak sebuah fasilitas saat mencarinya.
 */
const skorFasilitas = (kandidat: Kandidat, diminta: string[]): Faktor => {
  const dasar = { id: 'fasilitas' as const, label: LABEL_FAKTOR.fasilitas, bobot: BOBOT.fasilitas }

  if (diminta.length === 0) {
    return { ...dasar, skor: null, alasan: 'Tidak ada fasilitas khusus yang diminta.' }
  }

  const tersedia = new Set(kandidat.fasilitas.map((item) => item.slug))
  const cocok = diminta.filter((slug) => tersedia.has(slug))
  const kurang = diminta.filter((slug) => !tersedia.has(slug))

  const nama = (slug: string): string =>
    kandidat.fasilitas.find((item) => item.slug === slug)?.name ?? slug

  return {
    ...dasar,
    skor: bulat1((cocok.length / diminta.length) * 100),
    alasan:
      kurang.length === 0
        ? `Semua ${diminta.length} fasilitas yang Anda minta tersedia.`
        : `${cocok.length} dari ${diminta.length} fasilitas yang Anda minta tersedia. Belum ada: ${kurang.map(nama).join(', ')}.`,
  }
}

/**
 * Skor preferensi kamar: rata-rata bagian yang diminta dan terpenuhi.
 *
 * Tiap bagian dinilai lulus atau tidak, bukan bertingkat, karena inilah yang
 * benar-benar menentukan sebuah kamar bisa dipakai atau tidak: kamar mandi luar
 * tidak menjadi "setengah dalam", dan kamar untuk satu orang tidak "setengah"
 * cukup untuk dua.
 */
const skorPreferensi = (kandidat: Kandidat, preferensi: Preferensi): Faktor => {
  const dasar = {
    id: 'preferensi' as const,
    label: LABEL_FAKTOR.preferensi,
    bobot: BOBOT.preferensi,
  }

  const bagian: { lulus: boolean; keterangan: string }[] = []

  if (preferensi.bathroomType) {
    const cocok = kandidat.kamarMandi.includes(preferensi.bathroomType)
    bagian.push({
      lulus: cocok,
      keterangan: cocok
        ? preferensi.bathroomType === 'private'
          ? 'Kamar mandi dalam tersedia.'
          : 'Kamar mandi bersama tersedia.'
        : preferensi.bathroomType === 'private'
          ? 'Kamar yang tersedia hanya berkamar mandi bersama.'
          : 'Kamar yang tersedia hanya berkamar mandi dalam.',
    })
  }

  if (preferensi.minOccupants !== undefined) {
    const cocok =
      kandidat.penghuniMaks !== null && kandidat.penghuniMaks >= preferensi.minOccupants
    bagian.push({
      lulus: cocok,
      keterangan: cocok
        ? `Ada kamar untuk minimal ${preferensi.minOccupants} orang.`
        : `Kamar yang tersedia paling banyak untuk ${kandidat.penghuniMaks ?? 0} orang.`,
    })
  }

  if (preferensi.genderPolicy) {
    const cocok = kandidat.genderPolicy === preferensi.genderPolicy
    bagian.push({
      lulus: cocok,
      keterangan: cocok
        ? `Kos ini ${kandidat.genderPolicy}.`
        : `Kos ini ${kandidat.genderPolicy}, bukan ${preferensi.genderPolicy}.`,
    })
  }

  if (bagian.length === 0) {
    return { ...dasar, skor: null, alasan: 'Tidak ada preferensi kamar yang diisi.' }
  }

  const lulus = bagian.filter((item) => item.lulus).length

  return {
    ...dasar,
    skor: bulat1((lulus / bagian.length) * 100),
    alasan: bagian.map((item) => item.keterangan).join(' '),
  }
}

/**
 * Hitung skor satu kos beserta rincian tiap faktornya.
 *
 * Mengembalikan `faktor` apa adanya, termasuk yang tidak dihitung, supaya
 * halaman yang menampilkannya bisa menjelaskan mengapa sebuah faktor absen
 * alih-alih menghilangkannya tanpa keterangan.
 */
export const hitungSkor = (kandidat: Kandidat, preferensi: Preferensi): HasilSkor => {
  const faktor: Faktor[] = [
    skorAnggaran(kandidat.hargaTermurah, preferensi.maxPrice),
    skorLokasi(kandidat.jarakKm, preferensi.memakaiLokasi),
    skorFasilitas(kandidat, preferensi.fasilitas),
    skorPreferensi(kandidat, preferensi),
  ]

  const dihitung = faktor.filter((item): item is Faktor & { skor: number } => item.skor !== null)
  const bobotDipakai = dihitung.reduce((total, item) => total + item.bobot, 0)

  // Bobot nol hanya mungkin bila keempat faktor absen, dan itu berarti
  // penggunanya belum mengisi satu preferensi pun. Skornya dikembalikan nol
  // tanpa pembagian, bukan NaN yang akan tampil sebagai "NaN%" di halaman.
  const skorTotal =
    bobotDipakai === 0
      ? 0
      : bulat1(
          dihitung.reduce((total, item) => total + item.skor * item.bobot, 0) / bobotDipakai,
        )

  return {
    skorTotal,
    faktor,
    bobotDipakai,
    faktorTidakDihitung: faktor
      .filter((item) => item.skor === null)
      .map((item) => ({ id: item.id, label: item.label, sebab: item.alasan })),
  }
}

/** Kalimat rumus yang ditampilkan apa adanya di halaman hasil. */
export const RUMUS =
  'Skor = (jumlah skor tiap faktor dikali bobotnya) dibagi jumlah bobot faktor yang dihitung. ' +
  `Bobot tetap: anggaran ${BOBOT.anggaran}, lokasi ${BOBOT.lokasi}, fasilitas ${BOBOT.fasilitas}, preferensi kamar ${BOBOT.preferensi}. ` +
  'Faktor yang tidak Anda isi tidak dihitung dan tidak dianggap nol, sehingga bobotnya ikut hilang dari pembagi.'
