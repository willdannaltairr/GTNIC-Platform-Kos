/**
 * Klien data ulasan kos.
 *
 * Dipakai tiga peran dengan kebutuhan yang berbeda, dan perbedaannya ditentukan
 * server: penghuni melihat ulasannya sendiri beserta catatan moderasinya,
 * pemilik melihat ulasan yang sudah tayang di propertinya, dan admin melihat
 * antrean moderasi. Fungsi di sini karena itu tidak menerima id pengguna.
 *
 * Seperti klien lain, fungsi baca mengembalikan `null` bila API tidak dapat
 * dihubungi, sedangkan fungsi tulis melempar pesan server karena sebab
 * kegagalannya spesifik (belum pernah menyewa, sudah pernah mengulas, ulasan
 * disembunyikan admin) dan penggunanya perlu membacanya.
 *
 * Bentuk data yang dibaca pembaca umum sengaja tidak punya `tenantId` maupun
 * `moderationNotes`; keduanya `optional` di sini supaya halaman yang menampilkan
 * daftar publik tidak perlu memeriksa satu per satu.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type UlasanStatus = 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED' | 'HIDDEN'

export type KeputusanModerasi = 'APPROVED' | 'REJECTED' | 'HIDDEN'

export interface Ulasan {
  id: string
  tenantName: string
  rating: number
  cleanlinessRating: number | null
  locationRating: number | null
  facilitiesRating: number | null
  ownerServiceRating: number | null
  content: string | null
  createdAt: string
  /** Hanya ada pada bentuk penuh: daftar milik penghuni, dan antrean admin. */
  tenantId?: string
  propertyId?: string
  propertyName?: string
  propertySlug?: string
  bookingId?: string | null
  bookingCode?: string | null
  status?: UlasanStatus
  moderationNotes?: string | null
  moderatedByName?: string | null
  moderatedAt?: string | null
  updatedAt?: string
}

/** Ringkasan penilaian, dihitung server dari ulasan yang tayang saja. */
export interface RingkasanUlasan {
  jumlahTayang: number
  rataRata: number | null
  kebersihan: number | null
  lokasi: number | null
  fasilitas: number | null
  layananPemilik: number | null
}

export interface DaftarUlasan {
  items: Ulasan[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    ringkasan: RingkasanUlasan
  }
}

export interface UlasanInput {
  contractId: string
  rating: number
  cleanlinessRating?: number
  locationRating?: number
  facilitiesRating?: number
  ownerServiceRating?: number
  content?: string
}

/** Aspek yang dinilai, dipakai formulir dan tampilan detail. */
export type AspekUlasan =
  | 'rating'
  | 'cleanlinessRating'
  | 'locationRating'
  | 'facilitiesRating'
  | 'ownerServiceRating'

export const ASPEK_ULASAN: { kunci: AspekUlasan; label: string; hint: string }[] = [
  { kunci: 'rating', label: 'Keseluruhan', hint: 'Gambaran umum kos ini menurut Anda' },
  { kunci: 'cleanlinessRating', label: 'Kebersihan', hint: 'Kamar, kamar mandi, dan area bersama' },
  { kunci: 'locationRating', label: 'Lokasi', hint: 'Akses jalan, transportasi, dan lingkungan' },
  { kunci: 'facilitiesRating', label: 'Fasilitas', hint: 'Yang dijanjikan dibanding yang didapat' },
  { kunci: 'ownerServiceRating', label: 'Layanan pemilik', hint: 'Kecepatan menanggapi keluhan' },
]

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

/**
 * Ulasan sebuah properti, untuk halaman kos.
 *
 * Yang tampil hanya ulasan yang sudah lolos tinjauan, dan itu ditentukan server
 * walaupun pemanggilnya sedang masuk sebagai admin sekalipun.
 */
export async function fetchUlasanProperti(slug: string): Promise<DaftarUlasan | null> {
  try {
    const query = new URLSearchParams({ propertySlug: slug, limit: '20' })
    const response = await fetch(`${API_BASE}/api/v1/reviews?${query.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data: Ulasan[]
      meta: DaftarUlasan['meta']
    }

    return { items: payload.data ?? [], meta: payload.meta }
  } catch {
    return null
  }
}

/**
 * Ulasan milik pembaca sendiri.
 *
 * Penghuni menerima ulasannya, pemilik menerima ulasan yang tayang di
 * propertinya. Admin memakai `fetchAntreanUlasan` untuk antrean moderasi.
 */
export async function fetchUlasanSaya(): Promise<Ulasan[] | null> {
  return ambil<Ulasan[]>('/reviews?limit=50')
}

/**
 * Satu ulasan.
 *
 * Dipakai halaman penyuntingan untuk mengisi formulirnya dengan nilai yang
 * sudah ada, bukan dengan nilai kosong: menyunting dari keadaan kosong berarti
 * penulisnya mengetik ulang hal yang sudah ia tulis.
 */
export async function fetchUlasanDetail(id: string): Promise<Ulasan | null> {
  return ambil<Ulasan>(`/reviews/${encodeURIComponent(id)}`)
}

/**
 * Antrean moderasi admin.
 *
 * Tanpa penyaring status, yang tampil adalah seluruh ulasan dari yang terbaru;
 * dengan penyaring, hanya yang berstatus itu. Antrean sebenarnya adalah
 * `PENDING_MODERATION`, dan itulah yang diminta halaman moderasi.
 */
export async function fetchAntreanUlasan(status?: UlasanStatus): Promise<Ulasan[] | null> {
  const query = status ? `?status=${status}&limit=50` : '?limit=50'
  return ambil<Ulasan[]>(`/reviews${query}`)
}

export async function tulisUlasan(input: UlasanInput): Promise<Ulasan> {
  return kirim<Ulasan>('/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/** Mengubah ulasan mengembalikannya ke antrean moderasi, dan server yang menentukan. */
export async function ubahUlasan(id: string, input: Omit<UlasanInput, 'contractId'>): Promise<Ulasan> {
  return kirim<Ulasan>(`/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/**
 * Keputusan moderasi admin.
 *
 * Penolakan dan penyembunyian wajib disertai alasan; server menolak yang tanpa
 * alasan, dan pesannya ditampilkan apa adanya.
 */
export async function moderasiUlasan(
  id: string,
  keputusan: { status: KeputusanModerasi; notes?: string },
): Promise<Ulasan> {
  return kirim<Ulasan>(`/admin/ulasan/${encodeURIComponent(id)}/moderasi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keputusan),
  })
}
