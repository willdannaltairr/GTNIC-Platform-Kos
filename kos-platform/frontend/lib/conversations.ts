/**
 * Klien data percakapan.
 *
 * Dipakai dua peran dan keduanya berkepentingan: penghuni menanyakan kos yang
 * dilihatnya, pemilik menjawab dari kotak masuknya. Penyaring perannya ada di
 * server, jadi fungsi di sini tidak menerima id pengguna.
 *
 * Seperti klien lain, fungsi baca mengembalikan `null` bila API tidak dapat
 * dihubungi, sedangkan fungsi tulis melempar pesan server karena sebab
 * kegagalannya spesifik (bukan penghuni yang boleh memulai, pesan terlalu
 * panjang) dan penggunanya perlu membacanya.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export interface Percakapan {
  id: string
  tenantId: string
  tenantName: string
  ownerId: string
  ownerName: string
  propertyId: string
  propertyName: string
  propertySlug: string
  /** Nama lawan bicara dari sudut pandang pembaca, bukan selalu pemiliknya. */
  lawanBicara: string
  pesanTerakhir: string | null
  belumDibaca: number
  lastMessageAt: string | null
  createdAt: string
}

export interface Pesan {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  readAt: string | null
  createdAt: string
}

export interface PercakapanDetail extends Percakapan {
  pesan: Pesan[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface DaftarPercakapan {
  items: Percakapan[]
  meta: { page: number; limit: number; total: number; totalPages: number; belumDibaca: number }
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
 * Kotak masuk pada lingkup peran yang sedang masuk.
 *
 * `belumDibaca` di meta mencakup seluruh percakapan, bukan halaman yang sedang
 * tampil, jadi angkanya bisa dipakai sebagai penanda di luar halaman ini.
 */
export async function fetchPercakapanList(): Promise<DaftarPercakapan | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/percakapan?limit=50`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data: Percakapan[]
      meta: DaftarPercakapan['meta']
    }

    return { items: payload.data ?? [], meta: payload.meta }
  } catch {
    return null
  }
}

/**
 * Satu percakapan beserta pesannya.
 *
 * Pesan yang dibuka penerimanya ditandai terbaca oleh server saat rute ini
 * dipanggil, jadi tidak ada permintaan kedua yang perlu diingat pemanggilnya.
 */
export async function fetchPercakapanDetail(id: string): Promise<PercakapanDetail | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/percakapan/${encodeURIComponent(id)}?limit=100`,
      { credentials: 'include', cache: 'no-store' },
    )

    if (!response.ok) return null

    const payload = (await response.json()) as { data: PercakapanDetail }
    return payload.data
  } catch {
    return null
  }
}

/**
 * Buka percakapan tentang satu properti, atau ambil yang sudah ada.
 *
 * Aman dipanggil ulang: percakapan yang sudah ada dipakai kembali, bukan
 * dibuat kedua.
 */
export async function mulaiPercakapan(input: {
  propertyId: string
  pesan?: string
}): Promise<PercakapanDetail> {
  return kirim<PercakapanDetail>('/percakapan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function kirimPesan(id: string, isi: string): Promise<Pesan> {
  return kirim<Pesan>(`/percakapan/${encodeURIComponent(id)}/pesan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pesan: isi }),
  })
}
