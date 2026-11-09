/**
 * Klien data pengelolaan properti milik pemilik.
 *
 * Dipisahkan dari `lib/api.ts` yang khusus halaman publik: endpoint di sini
 * menuntut sesi dan sebagian besar hanya boleh dibuka pemilik properti yang
 * bersangkutan, jadi `null` di sini bisa berarti tiga hal yang berbeda (API
 * mati, belum masuk, atau bukan miliknya). Halaman yang memakainya
 * membedakannya lewat halaman detail yang memang membalas 404 untuk properti
 * milik orang lain.
 *
 * Fungsi tulis melempar pesan dari server, bukan mengembalikan null: sebab
 * kegagalannya spesifik (nama terlalu pendek, koordinat tidak lengkap,
 * properti sudah terverifikasi) dan pemiliknya perlu membaca yang mana.
 */

// Relatif terhadap situs sendiri: permintaannya diteruskan ke Edge Function
// oleh `next.config.ts`, supaya cookie sesi tetap first-party dan ikut terkirim.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface PropertiKelola {
  id: string
  name: string
  slug: string
  description: string | null
  address: string
  province: string
  city: string
  district: string
  subdistrict: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  propertyType: string
  genderPolicy: string
  verificationStatus: string
  publicationStatus: string
  costConfidence: string
  totalRooms: number
  availableRooms: number
  occupiedRooms: number
  minMonthlyPrice: number | null
  primaryPhotoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface KamarRingkas {
  id: string
  roomNumber: string
  roomName: string | null
  roomType: string
  monthlyPrice: number
  maximumOccupants: number
  bathroomType: string
  availabilityStatus: string
}

export interface PropertiKelolaDetail extends PropertiKelola {
  images: { id: string; url: string | null; alt: string; isPrimary: boolean }[]
  rules: { id: string; title: string; description: string | null; isMandatory: boolean }[]
  costs: {
    id: string
    name: string
    amount: number
    billingType: string
    isMandatory: boolean
    isRefundable: boolean
    confidence: string
    description: string | null
  }[]
  rooms: KamarRingkas[]
}

/** Isian yang dikirim ke API, sudah dalam nama kolom yang dipakai validator. */
export interface PropertiInput {
  name: string
  description?: string
  address: string
  province: string
  city: string
  district: string
  subdistrict?: string
  postalCode?: string
  latitude?: number
  longitude?: number
  propertyType: string
  genderPolicy: string
}

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

/** Properti milik pengguna yang sedang masuk, termasuk yang masih draf. */
export async function fetchMyProperties(): Promise<PropertiKelola[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/properties/mine?limit=50`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: PropertiKelola[] }
    return payload.data
  } catch {
    return null
  }
}

export async function fetchMyProperty(id: string): Promise<PropertiKelolaDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/properties/mine/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: PropertiKelolaDetail }
    return payload.data
  } catch {
    return null
  }
}

export async function createProperty(input: PropertiInput): Promise<PropertiKelola> {
  return kirim<PropertiKelola>('/properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function updateProperty(id: string, input: PropertiInput): Promise<PropertiKelola> {
  return kirim<PropertiKelola>(`/properties/mine/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function submitPropertyForReview(id: string): Promise<PropertiKelola> {
  return kirim<PropertiKelola>(`/properties/mine/${encodeURIComponent(id)}/submit`, { method: 'POST' })
}

export async function setPropertyPublication(
  id: string,
  publicationStatus: 'PUBLISHED' | 'UNPUBLISHED',
): Promise<PropertiKelola> {
  return kirim<PropertiKelola>(`/properties/mine/${encodeURIComponent(id)}/publication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicationStatus }),
  })
}
