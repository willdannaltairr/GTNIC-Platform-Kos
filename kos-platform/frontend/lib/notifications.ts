/**
 * Klien data notifikasi.
 *
 * Meta daftarnya membawa jumlah yang belum dibaca untuk SELURUH akun, bukan
 * hanya halaman yang sedang tampil. Angka itu yang dipakai lonceng di navbar,
 * dan kalau diambil dari halaman berjalan, angkanya berubah setiap kali
 * halaman berganti.
 */

// Relatif terhadap situs sendiri: permintaannya diteruskan ke Edge Function
// oleh `next.config.ts`, supaya cookie sesi tetap first-party dan ikut terkirim.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface Notifikasi {
  id: string
  type: string
  title: string
  message: string
  /** Jenis entitas terkait, mis. "booking", dipakai menyusun tautan. */
  relatedEntityType: string | null
  relatedEntityId: string | null
  isRead: boolean
  createdAt: string
}

export interface MetaNotifikasi {
  page: number
  limit: number
  total: number
  totalPages: number
  belumDibaca: number
}

export interface HasilNotifikasi {
  items: Notifikasi[]
  meta: MetaNotifikasi
}

/** Daftar notifikasi; `hanyaBelumDibaca` untuk lonceng, tanpa untuk halaman. */
export async function fetchNotifications(
  params: { belumDibaca?: boolean; limit?: number } = {},
): Promise<HasilNotifikasi | null> {
  const query = new URLSearchParams()

  if (params.belumDibaca) query.set('belumDibaca', 'true')
  if (params.limit !== undefined) query.set('limit', String(params.limit))

  try {
    const response = await fetch(`${API_BASE}/api/v1/notifications?${query.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as HasilNotifikasi
    return { items: payload.items ?? [], meta: payload.meta }
  } catch {
    return null
  }
}

/** Tandai satu notifikasi sudah dibaca. */
export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH', credentials: 'include' },
    )

    return response.ok
  } catch {
    return false
  }
}

/** Tandai semua notifikasi sudah dibaca; mengembalikan berapa yang berubah. */
export async function markAllNotificationsRead(): Promise<number | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: { jumlah: number } }
    return payload.data.jumlah
  } catch {
    return null
  }
}

/** Hapus satu notifikasi. */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    return response.ok
  } catch {
    return false
  }
}
