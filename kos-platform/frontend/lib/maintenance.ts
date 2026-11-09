/**
 * Klien data laporan perbaikan.
 *
 * Dipakai bersama dua peran dan keduanya berkepentingan: penghuni menuliskan
 * apa yang rusak beserta fotonya, pemilik memindahkan statusnya sampai selesai.
 * Penyaring perannya ada di server, jadi fungsi di sini tidak menerima id
 * pengguna.
 *
 * Seperti klien lain, fungsi baca mengembalikan `null` bila API tidak dapat
 * dihubungi, sedangkan fungsi tulis melempar pesan server karena sebab
 * kegagalannya spesifik (bukan kamar yang disewa, perpindahan status yang
 * tidak diizinkan, laporan sudah ditutup) dan penggunanya perlu membacanya.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type PerbaikanStatus =
  | 'OPEN'
  | 'REVIEWING'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PARTS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CLOSED'

export type PerbaikanPrioritas = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type PerbaikanKategori =
  | 'ELEKTRIK'
  | 'AIR'
  | 'BANGUNAN'
  | 'KEBERSIHAN'
  | 'PERABOT'
  | 'KEAMANAN'
  | 'INTERNET'
  | 'LAINNYA'

/** Sebutan tiap kategori, disalin dari validator server supaya sama persis. */
export const KATEGORI_PERBAIKAN: { nilai: PerbaikanKategori; label: string }[] = [
  { nilai: 'ELEKTRIK', label: 'Listrik dan lampu' },
  { nilai: 'AIR', label: 'Air dan saluran' },
  { nilai: 'BANGUNAN', label: 'Bangunan dan atap' },
  { nilai: 'KEBERSIHAN', label: 'Kebersihan' },
  { nilai: 'PERABOT', label: 'Perabot dan kasur' },
  { nilai: 'KEAMANAN', label: 'Keamanan dan kunci' },
  { nilai: 'INTERNET', label: 'Internet' },
  { nilai: 'LAINNYA', label: 'Lainnya' },
]

const LABEL_KATEGORI: Record<string, string> = Object.fromEntries(
  KATEGORI_PERBAIKAN.map((item) => [item.nilai, item.label]),
)

export const labelKategori = (kategori: string): string =>
  LABEL_KATEGORI[kategori] ?? kategori

export interface LaporanPerbaikan {
  id: string
  tenantId: string
  tenantName: string
  ownerId: string
  ownerName: string
  propertyId: string
  propertyName: string
  roomId: string | null
  roomNumber: string | null
  title: string
  description: string | null
  category: string
  priority: string
  status: PerbaikanStatus
  reportedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FotoLaporan {
  id: string
  uploadedBy: string
  uploaderName: string
  createdAt: string | null
  /**
   * URL bertanda tangan yang berlaku lima menit.
   *
   * Fotonya ada di bucket privat, jadi tautannya bisa saja sudah kedaluwarsa
   * saat halaman ini dibuka lama. Yang tampil karena itu harus menyediakan
   * keadaan "tidak bisa dimuat", bukan kotak rusak.
   */
  signedUrl: string | null
}

export interface RiwayatLaporan {
  id: string
  previousStatus: string | null
  newStatus: string
  notes: string | null
  changedByName: string | null
  createdAt: string | null
}

export interface LaporanDetail extends LaporanPerbaikan {
  photos: FotoLaporan[]
  riwayat: RiwayatLaporan[]
}

/** Daftar laporan beserta jumlah per status pada seluruh lingkup peran. */
export interface DaftarLaporan {
  items: LaporanPerbaikan[]
  ringkasan: Record<string, number>
}

export interface LaporanInput {
  propertyId: string
  roomId?: string
  title: string
  category: PerbaikanKategori
  description?: string
  priority?: PerbaikanPrioritas
}

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message?: string }[] }
    return data.errors?.[0]?.message ?? data.message ?? fallback
  }
  return fallback
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

/**
 * Laporan pada lingkup peran yang sedang masuk.
 *
 * Jumlah per status diambil dari `meta.ringkasan`, dan angka itu dihitung
 * server pada seluruh laporan, bukan pada halaman yang sedang tampil. Tanpa
 * itu tabnya menipu: "Selesai 3" padahal yang terlihat nol karena kebetulan
 * tidak ada di halaman pertama.
 */
export async function fetchLaporan(status?: PerbaikanStatus): Promise<DaftarLaporan | null> {
  try {
    const query = status ? `?status=${status}&limit=50` : '?limit=50'
    const response = await fetch(`${API_BASE}/api/v1/perbaikan${query}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data: LaporanPerbaikan[]
      meta?: { ringkasan?: Record<string, number> }
    }

    return { items: payload.data, ringkasan: payload.meta?.ringkasan ?? {} }
  } catch {
    return null
  }
}

export async function fetchLaporanDetail(id: string): Promise<LaporanDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/perbaikan/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: LaporanDetail }
    return payload.data
  } catch {
    return null
  }
}

export async function createLaporan(input: LaporanInput): Promise<LaporanPerbaikan> {
  return kirim<LaporanPerbaikan>('/perbaikan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/**
 * Pindahkan status laporan.
 *
 * Umumnya hanya pemilik propertinya yang boleh; server tetap memeriksa ulang
 * perpindahannya, jadi peta aturannya tidak disalin ke sini.
 */
export async function ubahStatusLaporan(
  id: string,
  status: PerbaikanStatus,
  opsi: { notes?: string; priority?: PerbaikanPrioritas } = {},
): Promise<LaporanPerbaikan> {
  return kirim<LaporanPerbaikan>(`/perbaikan/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...opsi }),
  })
}

/** Unggah satu foto bukti. Dikirim sebagai multipart, bukan JSON berisi gambar. */
export async function uploadFotoLaporan(id: string, file: File): Promise<FotoLaporan> {
  const form = new FormData()
  form.append('photo', file)

  const response = await fetch(`${API_BASE}/api/v1/perbaikan/${encodeURIComponent(id)}/photos`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  const payload = (await response.json().catch(() => null)) as { data?: FotoLaporan } | null

  if (!response.ok) {
    throw new Error(pesan(payload, 'Foto tidak terunggah'))
  }

  return payload?.data as FotoLaporan
}

export async function deleteFotoLaporan(id: string, photoId: string): Promise<{ id: string }> {
  return kirim<{ id: string }>(
    `/perbaikan/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
    { method: 'DELETE' },
  )
}
