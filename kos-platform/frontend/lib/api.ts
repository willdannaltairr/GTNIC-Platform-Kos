/**
 * Klien API untuk seluruh halaman frontend.
 *
 * Semua fungsi mengembalikan `null` (bukan melempar) ketika API tidak dapat
 * dihubungi atau membalas error, supaya halaman tetap dapat dirender dengan
 * empty state yang jujur alih-alih layar putih.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type CostConfidence = 'COMPLETE' | 'PARTIAL' | 'NEEDS_CONFIRMATION'

export interface PropertyListItem {
  id: string
  name: string
  slug: string
  city: string
  district: string
  propertyType: 'KOS_PUTRA' | 'KOS_PUTRI' | 'KOS_CAMPUR'
  genderPolicy: string
  verificationStatus: string
  costConfidence: CostConfidence
  imageUrl: string | null
  imageAlt: string
  minMonthlyPrice: number | null
  maxMonthlyPrice: number | null
  availableRooms: number
  totalRooms: number
  bathroomTypes: string[]
  facilities: string[]
  facilitySlugs: string[]
  availabilityConfirmedDaysAgo: number | null
  isAvailabilityStale: boolean
  /** Jarak dari titik pengunjung bila `nearLat`/`nearLng` dikirim. */
  distanceKm: number | null
  /** Jarak dari titik asal pada pencarian "dari lokasi ke lokasi". */
  distanceFromOriginKm: number | null
}

/**
 * Kos serupa: kartu properti yang sama seperti daftar pencarian, ditambah
 * alasan mengapa kos itu muncul di daftar ini.
 *
 * Alasannya diisi server karena yang menentukan sebuah kos masuk daftar itu
 * adalah urutan penyaring di SQL. Menyimpulkannya ulang di frontend akan
 * menghasilkan keterangan yang berbeda dari kenyataan.
 */
export interface PropertySerupa extends PropertyListItem {
  alasan: string[]
}

/** Kampus acuan beserta jumlah kos terverifikasi di sekitarnya. */
export interface CampusPlace {
  id: string
  name: string
  slug: string
  abbreviation: string | null
  city: string
  province: string
  latitude: number | null
  longitude: number | null
  distanceKm: number | null
  propertyCount: number
}

/** Daerah acuan (kota atau kecamatan) beserta jumlah kosnya. */
export interface RegionPlace {
  id: string
  name: string
  slug: string
  type: 'CITY' | 'DISTRICT'
  city: string | null
  province: string | null
  latitude: number | null
  longitude: number | null
  propertyCount: number
}

export interface PropertyListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PropertyListResult {
  items: PropertyListItem[]
  meta: PropertyListMeta
}

export interface CostProjection {
  months: number
  total: number
}

/**
 * Satu komponen biaya yang dicatat pemilik.
 *
 * Dikirim satu per satu, bukan hanya totalnya, supaya halaman yang menghitung
 * biaya bisa memisahkan yang sudah dikonfirmasi dari yang masih perkiraan.
 */
export interface CostComponent {
  id: string
  name: string
  amount: number
  billingType: 'MONTHLY' | 'FIXED' | 'VARIABLE' | 'ONE_TIME'
  isMandatory: boolean
  isRefundable: boolean
  confidence: CostConfidence
  description: string | null
}

export interface CostSummary {
  monthlyRent: number | null
  monthlyFixed: number
  monthlyEstimated: number
  monthlyTotalMin: number
  monthlyTotalEstimated: number
  depositAmount: number
  oneTimeOther: number
  upfrontTotal: number
  projections: CostProjection[]
  confidence: CostConfidence
  unknowns: string[]
  formulas: { monthly: string; upfront: string; projection: string }
}

export interface PropertyDetail {
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
  costConfidence: CostConfidence
  totalRooms: number
  owner: { id: string; name: string; businessName: string | null; verified: boolean }
  images: { id: string; url: string | null; alt: string; isPrimary: boolean }[]
  facilities: { name: string; slug: string; category: 'PROPERTY' | 'ROOM' }[]
  rules: { id: string; title: string; description: string | null; isMandatory: boolean }[]
  rooms: {
    id: string
    roomNumber: string
    roomName: string | null
    roomType: string
    monthlyPrice: number
    maximumOccupants: number
    bathroomType: string
    areaWidth: number | null
    areaLength: number | null
    floorNumber: number | null
    availabilityStatus: string
    facilities: string[]
  }[]
  costSummary: CostSummary
  costs: CostComponent[]
  availabilityConfirmedDaysAgo: number | null
  isAvailabilityStale: boolean
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
  role: 'TENANT' | 'OWNER'
  /**
   * Kos pertama pemilik, diisi sekalian saat mendaftar.
   *
   * Hanya bermakna untuk peran OWNER; server mengabaikannya untuk peran lain.
   * Fasilitasnya dikirim sebagai slug, bukan id: slug sudah dipakai di seluruh
   * penyaring platform, sedangkan id fasilitas tidak pernah tampil di layar
   * mana pun.
   */
  property?: {
    name: string
    description?: string
    address: string
    province: string
    city: string
    district: string
    propertyType: 'KOS_PUTRA' | 'KOS_PUTRI' | 'KOS_CAMPUR'
    genderPolicy: 'putra' | 'putri' | 'campur'
    facilitySlugs?: string[]
  }
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ApiError {
  message: string
  fields: { field: string; message: string }[]
}

const asApiError = (payload: unknown, fallback: string): ApiError => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { field: string; message: string }[] }
    return { message: data.message ?? fallback, fields: data.errors ?? [] }
  }
  return { message: fallback, fields: [] }
}

/** GET data publik dari API; `null` bila API tidak dapat dihubungi. */
export async function fetchProperties(
  params: Record<string, string | number | undefined> = {},
): Promise<PropertyListResult | null> {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/properties?${query.toString()}`, {
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data: PropertyListItem[]
      meta: PropertyListMeta
    }

    return { items: payload.data, meta: payload.meta }
  } catch {
    return null
  }
}

/** GET detail properti; `null` bila tidak ditemukan atau API mati. */
export async function fetchProperty(slug: string): Promise<PropertyDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/properties/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: PropertyDetail }
    return payload.data
  } catch {
    return null
  }
}

/**
 * Kos yang mirip dengan satu properti, beserta alasan kemiripannya.
 *
 * `alasan` diisi server, bukan disimpulkan frontend dari daftar fasilitas:
 * yang menentukan sebuah kos masuk daftar ini adalah urutan penyaring di SQL,
 * dan menyimpulkannya ulang di sini akan menghasilkan keterangan yang berbeda
 * dari kenyataan. Alasan yang tidak bisa dipercaya lebih buruk daripada tidak
 * ada alasan sama sekali.
 */
export async function fetchSimilarProperties(slug: string): Promise<PropertySerupa[] | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/properties/${encodeURIComponent(slug)}/serupa`,
      { cache: 'no-store' },
    )

    if (!response.ok) return null

    const payload = (await response.json()) as { data: PropertySerupa[] }
    return payload.data
  } catch {
    return null
  }
}

/**
 * Daftar kampus acuan.
 *
 * `nearLat`/`nearLng` hanya memengaruhi `distanceKm`, jumlah kos di sekitar
 * kampus tetap dihitung dari koordinat kampus itu sendiri, bukan dari lokasi
 * pengunjung.
 */
export async function fetchCampuses(
  params: Record<string, string | number | undefined> = {},
): Promise<CampusPlace[] | null> {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/places/campuses?${query.toString()}`, {
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: CampusPlace[] }
    return payload.data
  } catch {
    return null
  }
}

/** Daftar daerah acuan, sudah urut dari yang paling banyak kosnya. */
export async function fetchRegions(limit = 12): Promise<RegionPlace[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/places/regions?limit=${limit}`, {
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: RegionPlace[] }
    return payload.data
  } catch {
    return null
  }
}

/** POST JSON ke endpoint autentikasi; melempar ApiError yang siap ditampilkan. */
async function postAuth<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as { data?: T } | null

  if (!response.ok) {
    throw asApiError(payload, 'Permintaan gagal, coba lagi')
  }

  return (payload?.data ?? null) as T
}

export async function registerAccount(payload: RegisterPayload) {
  return postAuth<{
    user: { id: string; full_name: string; email: string; role: string }
    /** Kos pertama pemilik; null bila bukan pemilik atau isiannya dilewati. */
    property: { id: string; name: string; slug: string } | null
    verifyToken?: string
  }>('/auth/register', payload)
}

export async function loginAccount(payload: LoginPayload) {
  return postAuth<{ user: { id: string; full_name: string; email: string; role: string } }>(
    '/auth/login',
    payload,
  )
}

/**
 * Minta tautan atur ulang sandi.
 *
 * Balasannya sengaja tidak membedakan email yang terdaftar dari yang tidak,
 * jadi formulirnya tidak bisa dipakai untuk menebak siapa saja yang punya akun
 * di sini. `devToken` hanya terisi saat API berjalan di mode pengembangan.
 */
export async function forgotPassword(payload: { email: string }) {
  return postAuth<{ devToken?: string } | null>('/auth/forgot-password', payload)
}

export async function resetPassword(payload: { token: string; password: string }) {
  return postAuth<null>('/auth/reset-password', payload)
}

/**
 * Pakai tautan verifikasi email.
 *
 * Endpoint ini tidak menuntut sesi, karena tautannya sering dibuka dari
 * aplikasi email di perangkat lain. Yang dibuktikan adalah kepemilikan atas
 * alamat emailnya, dan itu sudah dibuktikan tokennya sendiri.
 */
export async function verifyEmail(payload: { token: string }) {
  return postAuth<null>('/auth/verify-email', payload)
}

/**
 * Kirim ulang tautan verifikasi ke email akun yang sedang masuk.
 *
 * Alamatnya ditentukan server dari sesi, bukan dari isi permintaan, jadi
 * endpoint ini tidak bisa dipakai mengirim email ke sembarang orang.
 */
export async function resendEmailVerification() {
  return postAuth<{ devToken?: string } | null>('/auth/resend-verification', {})
}
