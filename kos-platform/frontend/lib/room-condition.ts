/**
 * Klien data Room Passport (kondisi kamar).
 *
 * Dipakai dua peran dan keduanya berkepentingan: penghuni mengisi keadaan tiap
 * bagian kamarnya beserta fotonya, pemilik menyetujui atau mengajukan
 * keberatan. Penyaring perannya ada di server, jadi fungsi di sini tidak
 * menerima id pengguna.
 *
 * Seperti klien lain, fungsi baca mengembalikan `null` bila API tidak dapat
 * dihubungi, sedangkan fungsi tulis melempar pesan server karena sebab
 * kegagalannya spesifik (pemeriksaan sudah disetujui, daftar periksa kosong,
 * bukan kamar yang disewa) dan penggunanya perlu membacanya.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type JenisPemeriksaan = 'CHECK_IN' | 'CHECK_OUT' | 'PERIODIC_INSPECTION'

export type StatusPemeriksaan = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'DISPUTED' | 'COMPLETED'

export type KeadaanButir = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'TIDAK_ADA'

/** Sebutan tiap jenis pemeriksaan, disalin dari validator server. */
export const JENIS_PEMERIKSAAN: { nilai: JenisPemeriksaan; label: string; keterangan: string }[] = [
  {
    nilai: 'CHECK_IN',
    label: 'Pemeriksaan masuk',
    keterangan: 'Keadaan kamar saat Anda mulai menempatinya.',
  },
  {
    nilai: 'CHECK_OUT',
    label: 'Pemeriksaan keluar',
    keterangan: 'Keadaan kamar saat Anda mengakhirinya. Biasanya saat serah terima kunci.',
  },
  {
    nilai: 'PERIODIC_INSPECTION',
    label: 'Pemeriksaan berkala',
    keterangan: 'Pemeriksaan di tengah masa sewa, misalnya setiap enam bulan.',
  },
]

export const LABEL_JENIS: Record<string, string> = Object.fromEntries(
  JENIS_PEMERIKSAAN.map((item) => [item.nilai, item.label]),
)

/** Pilihan keadaan satu butir periksa, urut dari yang paling baik. */
export const KEADAAN_BUTIR: { nilai: KeadaanButir; label: string }[] = [
  { nilai: 'BAIK', label: 'Baik' },
  { nilai: 'RUSAK_RINGAN', label: 'Rusak ringan' },
  { nilai: 'RUSAK_BERAT', label: 'Rusak berat' },
  { nilai: 'TIDAK_ADA', label: 'Tidak ada' },
]

/**
 * Butir periksa bawaan, disalin dari validator server.
 *
 * Ditawarkan sebagai isian awal supaya penghuni tidak mulai dari halaman
 * kosong; daftarnya boleh diubah dan ditambah, dan server tidak membatasinya.
 */
export const BUTIR_BAWAAN = [
  'Dinding dan cat',
  'Lantai',
  'Pintu dan kunci',
  'Jendela',
  'Tempat tidur dan kasur',
  'Lemari',
  'Meja dan kursi',
  'Lampu',
  'Stopkontak',
  'Kran dan shower',
  'Kloset',
  'Ventilasi',
]

export interface PemeriksaanKondisi {
  id: string
  roomId: string
  roomNumber: string
  tenantId: string
  tenantName: string
  ownerId: string | null
  ownerName: string | null
  contractId: string | null
  contractNumber: string | null
  propertyId: string
  propertyName: string
  reportType: JenisPemeriksaan
  reportDate: string | null
  generalCondition: string | null
  notes: string | null
  status: StatusPemeriksaan
  createdAt: string
  updatedAt: string
}

export interface ButirPeriksa {
  id: string
  itemName: string
  conditionStatus: KeadaanButir | null
  notes: string | null
}

export interface FotoKondisi {
  id: string
  areaName: string | null
  description: string | null
  uploadedBy: string
  uploaderName: string
  createdAt: string | null
  /**
   * URL bertanda tangan yang berlaku lima menit.
   *
   * Fotonya ada di bucket privat, jadi tautannya bisa saja sudah kedaluwarsa
   * saat halaman ini dibuka lama. Yang menampilkannya karena itu harus
   * menyediakan keadaan "tidak bisa dimuat", bukan kotak rusak.
   */
  signedUrl: string | null
}

export interface PersetujuanKondisi {
  id: string
  userId: string
  userName: string
  type: 'TENANT' | 'OWNER'
  notes: string | null
  acknowledgedAt: string
}

export interface RingkasanKondisi {
  BAIK: number
  RUSAK_RINGAN: number
  RUSAK_BERAT: number
  TIDAK_ADA: number
  belumDiperiksa: number
}

export interface PemeriksaanDetail extends PemeriksaanKondisi {
  checklist: ButirPeriksa[]
  photos: FotoKondisi[]
  acknowledgements: PersetujuanKondisi[]
  ringkasan: RingkasanKondisi
}

export interface ButirInput {
  itemName: string
  conditionStatus: KeadaanButir
  notes?: string
}

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message?: string }[] }
    return data.errors?.[0]?.message ?? data.message ?? fallback
  }
  return fallback
}

async function ambil<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1${path}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: T }
    return payload.data
  } catch {
    return null
  }
}

async function kirim<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    credentials: 'include',
    ...init,
  })

  const payload = (await response.json().catch(() => null)) as { data?: T } | null

  if (!response.ok) {
    throw new Error(pesan(payload, 'Permintaan tidak berhasil'))
  }

  return payload?.data as T
}

/** Daftar pemeriksaan pada lingkup peran yang sedang masuk. */
export async function fetchPemeriksaan(params: {
  status?: StatusPemeriksaan
  reportType?: JenisPemeriksaan
  contractId?: string
} = {}): Promise<PemeriksaanKondisi[] | null> {
  const query = new URLSearchParams({ limit: '50' })
  if (params.status) query.set('status', params.status)
  if (params.reportType) query.set('reportType', params.reportType)
  if (params.contractId) query.set('contractId', params.contractId)

  return ambil<PemeriksaanKondisi[]>(`/kondisi-kamar?${query.toString()}`)
}

export async function fetchPemeriksaanDetail(id: string): Promise<PemeriksaanDetail | null> {
  return ambil<PemeriksaanDetail>(`/kondisi-kamar/${encodeURIComponent(id)}`)
}

export async function buatPemeriksaan(input: {
  contractId: string
  reportType: JenisPemeriksaan
  generalCondition?: string
  notes?: string
}): Promise<PemeriksaanKondisi> {
  return kirim<PemeriksaanKondisi>('/kondisi-kamar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function ubahPemeriksaan(
  id: string,
  input: { generalCondition?: string; notes?: string; reportDate?: string },
): Promise<PemeriksaanKondisi> {
  return kirim<PemeriksaanKondisi>(`/kondisi-kamar/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/** Simpan seluruh daftar periksa sekaligus; isinya diganti, bukan ditambahi. */
export async function simpanChecklist(
  id: string,
  items: ButirInput[],
): Promise<PemeriksaanDetail> {
  return kirim<PemeriksaanDetail>(`/kondisi-kamar/${encodeURIComponent(id)}/checklist`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
}

export async function kirimPemeriksaan(
  id: string,
  generalCondition?: string,
): Promise<PemeriksaanKondisi> {
  return kirim<PemeriksaanKondisi>(`/kondisi-kamar/${encodeURIComponent(id)}/kirim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generalCondition }),
  })
}

/**
 * Setujui atau ajukan keberatan.
 *
 * Keberatan wajib disertai alasan minimal 10 karakter; server menolak yang
 * tanpa alasan, dan pesannya ditampilkan apa adanya.
 */
export async function putuskanPemeriksaan(
  id: string,
  keputusan: { setuju: boolean; notes?: string },
): Promise<PemeriksaanKondisi> {
  return kirim<PemeriksaanKondisi>(`/kondisi-kamar/${encodeURIComponent(id)}/persetujuan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keputusan),
  })
}

/**
 * Unggah satu foto kondisi.
 *
 * Area dan keterangannya lewat query string, bukan field formulir, karena
 * unggahan multipart di sini hanya membawa berkasnya.
 */
export async function unggahFotoKondisi(
  id: string,
  file: File,
  meta: { areaName?: string; description?: string } = {},
): Promise<FotoKondisi> {
  const form = new FormData()
  form.append('photo', file)

  const query = new URLSearchParams()
  if (meta.areaName) query.set('areaName', meta.areaName)
  if (meta.description) query.set('description', meta.description)

  const response = await fetch(
    `${API_BASE}/api/v1/kondisi-kamar/${encodeURIComponent(id)}/photos?${query.toString()}`,
    { method: 'POST', credentials: 'include', body: form },
  )

  const payload = (await response.json().catch(() => null)) as { data?: FotoKondisi } | null

  if (!response.ok) {
    throw new Error(pesan(payload, 'Foto kondisi tidak terunggah'))
  }

  return payload?.data as FotoKondisi
}

export async function hapusFotoKondisi(id: string, photoId: string): Promise<{ id: string }> {
  return kirim<{ id: string }>(
    `/kondisi-kamar/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
    { method: 'DELETE' },
  )
}

/**
 * Arah perubahan satu butir antara dua pemeriksaan.
 *
 * `BERBEDA` dipakai untuk perubahan yang tidak bisa diberi arah, misalnya dari
 * "tidak ada" menjadi "rusak ringan": bagian yang tadinya tidak ada tidak bisa
 * disebut membaik atau memburuk tanpa menebak maksud pencatatnya.
 */
export type ArahPerubahan =
  | 'MEMBURUK'
  | 'MEMBAIK'
  | 'SAMA'
  | 'BARU'
  | 'HILANG'
  | 'BELUM_LENGKAP'
  | 'BERBEDA'

export interface ButirPerbandingan {
  itemName: string
  dari: KeadaanButir | null
  ke: KeadaanButir | null
  arah: ArahPerubahan
}

export interface LaporanRiwayat extends PemeriksaanKondisi {
  jumlahButir: number
  jumlahFoto: number
  /** Keadaan butir pada pemeriksaan ITU, bukan keadaan kamar sekarang. */
  ringkasan: RingkasanKondisi
}

export interface RiwayatKamar {
  kamar: {
    id: string
    roomNumber: string
    propertyId: string
    propertyName: string
    propertySlug: string
  }
  /** Urut waktu naik: yang paling awal lebih dulu. */
  laporan: LaporanRiwayat[]
  /** Null selama belum ada dua pemeriksaan yang daftar periksanya terisi. */
  perbandingan: {
    dari: PemeriksaanKondisi
    ke: PemeriksaanKondisi
    butir: ButirPerbandingan[]
  } | null
  meta: {
    jumlahPemeriksaan: number
    jumlahBerisiButir: number
    belumDisetujui: number
    /** Butir rusak menurut pemeriksaan terakhir yang terisi. */
    rusakSekarang: number
    membaik: number
    memburuk: number
  }
}

/**
 * Riwayat kondisi satu kamar beserta perbandingannya.
 *
 * Dikerjakan server, bukan dirangkai dari daftar pemeriksaan: pembandingnya
 * mencocokkan nama butir antar pemeriksaan, dan pencocokan yang berbeda di dua
 * tempat akan menghasilkan angka yang berbeda pula untuk riwayat yang sama.
 */
export async function fetchRiwayatKamar(roomId: string): Promise<RiwayatKamar | null> {
  return ambil<RiwayatKamar>(`/kondisi-kamar/riwayat/${encodeURIComponent(roomId)}`)
}
