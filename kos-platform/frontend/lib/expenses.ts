/**
 * Klien data keuangan properti.
 *
 * Dipakai halaman keuangan pemilik: catatan pengeluaran usaha kosnya, dan
 * ringkasan untung-rugi beberapa bulan. Penyaring perannya ada di server, jadi
 * fungsi di sini tidak menerima id pengguna.
 *
 * Seperti klien lain, fungsi baca mengembalikan `null` bila API tidak dapat
 * dihubungi, sedangkan fungsi tulis melempar pesan server karena sebab
 * kegagalannya spesifik (kategori di luar daftar, jumlah nol, properti bukan
 * miliknya) dan penggunanya perlu membacanya.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type KategoriBiaya =
  | 'LISTRIK_AIR'
  | 'INTERNET'
  | 'PERBAIKAN'
  | 'PERABOT'
  | 'KEBERSIHAN'
  | 'PAJAK'
  | 'GAJI'
  | 'LAINNYA'

/** Sebutan tiap kategori, disalin dari validator server supaya sama persis. */
export const KATEGORI_BIAYA: { nilai: KategoriBiaya; label: string }[] = [
  { nilai: 'LISTRIK_AIR', label: 'Listrik, air, dan gas' },
  { nilai: 'INTERNET', label: 'Internet' },
  { nilai: 'PERBAIKAN', label: 'Perbaikan dan renovasi' },
  { nilai: 'PERABOT', label: 'Perabot dan perlengkapan' },
  { nilai: 'KEBERSIHAN', label: 'Kebersihan dan sampah' },
  { nilai: 'PAJAK', label: 'Pajak dan retribusi' },
  { nilai: 'GAJI', label: 'Gaji penjaga' },
  { nilai: 'LAINNYA', label: 'Lainnya' },
]

const LABEL_KATEGORI: Record<string, string> = Object.fromEntries(
  KATEGORI_BIAYA.map((item) => [item.nilai, item.label]),
)

export const labelKategoriBiaya = (kategori: string): string =>
  LABEL_KATEGORI[kategori] ?? kategori

export interface Biaya {
  id: string
  propertyId: string
  propertyName: string
  /** Kategori datang dari server sebagai teks; sebutannya lewat `labelKategoriBiaya`. */
  category: string
  amount: number
  description: string | null
  date: string | null
  createdAt: string
}

export interface DaftarBiaya {
  items: Biaya[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    /** Jumlah seluruh pengeluaran yang cocok penyaringnya, bukan halaman ini. */
    totalPengeluaran: number
  }
}

export interface BulanKeuangan {
  bulan: string
  pemasukan: number
  pengeluaran: number
  selisih: number
}

export interface RingkasanKeuangan {
  bulanan: BulanKeuangan[]
  totalPemasukan: number
  totalPengeluaran: number
  selisih: number
  perKategori: { category: string; jumlah: number; jumlahBaris: number }[]
  /** Tagihan yang belum lunas: uang yang masih berjalan, bukan pemasukan. */
  belumLunas: number
  jumlahTagihanBelumLunas: number
}

export interface BiayaInput {
  propertyId: string
  category: KategoriBiaya
  amount: number
  description?: string
  date?: string
}

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message?: string }[] }
    return data.errors?.[0]?.message ?? data.message ?? fallback
  }
  return fallback
}

export async function fetchBiaya(
  params: { propertyId?: string; category?: KategoriBiaya } = {},
): Promise<DaftarBiaya | null> {
  try {
    const query = new URLSearchParams({ limit: '100' })
    if (params.propertyId) query.set('propertyId', params.propertyId)
    if (params.category) query.set('category', params.category)

    const response = await fetch(`${API_BASE}/api/v1/expenses?${query.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data: Biaya[]
      meta: DaftarBiaya['meta']
    }

    return { items: payload.data ?? [], meta: payload.meta }
  } catch {
    return null
  }
}

/**
 * Ringkasan untung-rugi beberapa bulan terakhir.
 *
 * `bulan` menentukan panjang deretnya, dan bulan tanpa transaksi tetap muncul
 * dengan nilai nol dari server.
 */
export async function fetchRingkasanKeuangan(bulan = 6): Promise<RingkasanKeuangan | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/expenses/ringkasan?bulan=${bulan}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: RingkasanKeuangan }
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

export async function catatBiaya(input: BiayaInput): Promise<Biaya> {
  return kirim<Biaya>('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function ubahBiaya(id: string, input: Partial<BiayaInput>): Promise<Biaya> {
  return kirim<Biaya>(`/expenses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function hapusBiaya(id: string): Promise<{ id: string }> {
  return kirim<{ id: string }>(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
