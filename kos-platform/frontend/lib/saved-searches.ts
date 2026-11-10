/**
 * Klien pencarian tersimpan.
 *
 * Bentuk penyaringnya sengaja tidak dikunci sebagai tipe di sini: yang disimpan
 * adalah potongan URL pencarian apa adanya, dan halaman yang membacanya (halaman
 * cari kos) yang tahu bagaimana menerjemahkannya kembali. Mengunci bentuknya di
 * dua tempat membuat penambahan penyaring baru menuntut perubahan di keduanya.
 */

import { API_BASE } from './api-alamat'

export interface PencarianTersimpan {
  id: string
  name: string
  /** Penyaring pencarian, bentuknya sama dengan kueri di halaman /kos. */
  filters: Record<string, string | number | undefined>
  /** Kapan pencarian ini terakhir menghasilkan pemberitahuan; null bila belum pernah. */
  lastNotifiedAt: string | null
  createdAt: string
}

const json = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => null)) as { data?: T } | null
  return payload?.data as T
}

/** Daftar pencarian tersimpan milik pengguna yang sedang masuk. */
export async function fetchPencarianTersimpan(): Promise<PencarianTersimpan[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/saved-searches`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null
    return await json<PencarianTersimpan[]>(response)
  } catch {
    return null
  }
}

/**
 * Simpan satu pencarian.
 *
 * Melempar `Error` berisi pesan dari server supaya batas dua puluh pencarian
 * bisa ditampilkan apa adanya, bukan sebagai "gagal menyimpan".
 */
export async function simpanPencarian(
  name: string,
  filters: Record<string, string | number | undefined>,
): Promise<PencarianTersimpan> {
  // Penyaring yang kosong dibuang sebelum dikirim: server menerima bentuk yang
  // sama dengan yang diketik pengguna, dan menyimpan kunci berisi string kosong
  // akan membuat pencocokannya menganggap penyaring itu diisi.
  const bersih: Record<string, string | number> = {}
  for (const [kunci, nilai] of Object.entries(filters)) {
    if (nilai !== undefined && nilai !== '') bersih[kunci] = nilai
  }

  const response = await fetch(`${API_BASE}/api/v1/saved-searches`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, filters: bersih }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { data?: PencarianTersimpan; message?: string }
    | null

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Pencarian tidak bisa disimpan')
  }

  return payload?.data as PencarianTersimpan
}

/** Hapus satu pencarian tersimpan. */
export async function hapusPencarian(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/saved-searches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Ubah penyaring menjadi kueri alamat halaman cari kos.
 *
 * Dipakai tombol "buka hasil" di daftar pencarian tersimpan. Dibuat di sini,
 * bukan di halamannya, supaya bentuk penyaring dan bentuk alamat yang saling
 * bersesuaian hanya ditulis sekali.
 */
export const keKueriKos = (filters: Record<string, string | number | undefined>): string => {
  const query = new URLSearchParams()

  for (const [kunci, nilai] of Object.entries(filters)) {
    if (nilai !== undefined && nilai !== '') query.set(kunci, String(nilai))
  }

  return query.toString()
}

/**
 * Ringkasan penyaring untuk ditampilkan di daftar.
 *
 * Ditulis sebagai kalimat pendek, bukan sebagai dump kunci-nilai: yang dibaca
 * pengguna adalah "Bandung, di bawah Rp2.000.000", bukan
 * `city=Bandung&maxPrice=2000000`.
 */
export const ringkasPenyaring = (filters: Record<string, string | number | undefined>): string[] => {
  const bagian: string[] = []
  const teks = (nilai: unknown): string => (nilai === undefined || nilai === '' ? '' : String(nilai))

  const q = teks(filters.q)
  if (q) bagian.push(`"${q}"`)

  const city = teks(filters.city)
  if (city) bagian.push(city)

  const district = teks(filters.district)
  if (district) bagian.push(district)

  const type = teks(filters.type)
  if (type) {
    bagian.push(
      type === 'KOS_PUTRA' ? 'Kos putra' : type === 'KOS_PUTRI' ? 'Kos putri' : 'Kos campur',
    )
  }

  const bathroom = teks(filters.bathroom)
  if (bathroom) bagian.push(bathroom === 'private' ? 'KM dalam' : 'KM luar')

  const min = Number(filters.minPrice)
  const max = Number(filters.maxPrice)
  const rupiah = (nilai: number): string => `Rp${nilai.toLocaleString('id-ID')}`

  if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
    bagian.push(`${rupiah(min)} sampai ${rupiah(max)}`)
  } else if (Number.isFinite(max) && max > 0) {
    bagian.push(`di bawah ${rupiah(max)}`)
  } else if (Number.isFinite(min) && min > 0) {
    bagian.push(`di atas ${rupiah(min)}`)
  }

  const fasilitas = teks(filters.facilities)
  if (fasilitas) {
    const jumlah = fasilitas.split(',').filter(Boolean).length
    bagian.push(`${jumlah} fasilitas`)
  }

  return bagian
}
