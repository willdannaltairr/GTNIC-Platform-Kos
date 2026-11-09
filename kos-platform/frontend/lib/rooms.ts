/**
 * Klien data kamar.
 *
 * Endpoint baca kamar boleh dibuka tanpa sesi, tetapi isinya berbeda untuk
 * pemilik properti dan admin: keduanya ikut melihat kamar yang propertinya
 * belum terbit. Karena itu semua permintaan dikirim dengan kredensial, dan
 * server yang memutuskan seberapa banyak yang boleh terlihat.
 *
 * Fungsi tulis melempar pesan dari server, bukan mengembalikan null: sebab
 * kegagalannya spesifik (nomor kamar sudah dipakai, kamar milik properti orang
 * lain, kamar masih terhubung kontrak) dan pemiliknya perlu membaca yang mana.
 */

// Relatif terhadap situs sendiri: permintaannya diteruskan ke Edge Function
// oleh `next.config.ts`, supaya cookie sesi tetap first-party dan ikut terkirim.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface Kamar {
  id: string
  propertyId: string
  propertySlug: string
  propertyName: string
  city: string
  district: string
  roomNumber: string
  roomName: string | null
  description: string | null
  roomType: string
  monthlyPrice: number
  maximumOccupants: number
  bathroomType: string
  areaWidth: number | null
  areaLength: number | null
  floorNumber: number | null
  availabilityStatus: string
  facilities: string[]
  primaryPhotoUrl: string | null
  photoCount: number
  createdAt: string
}

export interface FotoKamar {
  id: string
  url: string | null
  alt: string | null
  displayOrder: number
  isPrimary: boolean
}

export interface KamarDetail extends Kamar {
  photos: FotoKamar[]
}

export interface Fasilitas {
  id: string
  name: string
  slug: string
  category: 'PROPERTY' | 'ROOM'
}

export interface KamarInput {
  propertyId: string
  roomNumber: string
  roomName?: string
  description?: string
  roomType?: string
  areaWidth?: number
  areaLength?: number
  monthlyPrice: number
  maximumOccupants?: number
  bathroomType?: 'private' | 'shared'
  floorNumber?: number
  availabilityStatus?: string
  facilityIds?: string[]
}

/** Isian perubahan: seluruh kolom opsional, hanya yang dikirim yang diubah. */
export type KamarUbahInput = Omit<Partial<KamarInput>, 'propertyId'>

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message: string }[] }
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

/** Kamar dalam satu properti. Properti draf ikut terlihat oleh pemiliknya. */
export async function fetchRoomsBySlug(slug: string): Promise<Kamar[] | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/rooms?slug=${encodeURIComponent(slug)}&limit=50&sort=number_asc`,
      { credentials: 'include', cache: 'no-store' },
    )

    if (!response.ok) return null

    const payload = (await response.json()) as { data: Kamar[] }
    return payload.data
  } catch {
    return null
  }
}

export async function fetchRoom(id: string): Promise<KamarDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/rooms/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: KamarDetail }
    return payload.data
  } catch {
    return null
  }
}

export async function fetchFacilities(category?: 'PROPERTY' | 'ROOM'): Promise<Fasilitas[] | null> {
  try {
    const query = category ? `?category=${category}` : ''
    const response = await fetch(`${API_BASE}/api/v1/places/facilities${query}`, {
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: Fasilitas[] }
    return payload.data
  } catch {
    return null
  }
}

export async function createRoom(input: KamarInput): Promise<KamarDetail> {
  return kirim<KamarDetail>('/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function updateRoom(id: string, input: KamarUbahInput): Promise<KamarDetail> {
  return kirim<KamarDetail>(`/rooms/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function deleteRoom(id: string): Promise<{ id: string }> {
  return kirim<{ id: string }>(`/rooms/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/**
 * Unggah satu foto kamar.
 *
 * Dikirim sebagai multipart, bukan JSON berisi data gambar: berkasnya melewati
 * validasi isi di server, dan mengubahnya jadi teks akan menambah sepertiga
 * ukuran tanpa manfaat apa pun.
 */
export async function uploadRoomPhoto(
  id: string,
  file: File,
  meta: { altText?: string; isPrimary?: boolean } = {},
): Promise<FotoKamar> {
  const form = new FormData()
  form.append('photo', file)

  const query = new URLSearchParams({
    isPrimary: meta.isPrimary ? 'true' : 'false',
  })
  if (meta.altText) query.set('altText', meta.altText)

  const response = await fetch(
    `${API_BASE}/api/v1/rooms/${encodeURIComponent(id)}/photos?${query.toString()}`,
    { method: 'POST', credentials: 'include', body: form },
  )

  const payload = (await response.json().catch(() => null)) as { data?: FotoKamar } | null

  if (!response.ok) {
    throw new Error(pesan(payload, 'Foto tidak terunggah'))
  }

  return payload?.data as FotoKamar
}

export async function deleteRoomPhoto(id: string, photoId: string): Promise<{ id: string }> {
  return kirim<{ id: string }>(
    `/rooms/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
    { method: 'DELETE' },
  )
}
