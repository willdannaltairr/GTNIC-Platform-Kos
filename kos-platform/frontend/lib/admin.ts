/**
 * Klien data panel admin.
 *
 * Semua fungsi baca mengembalikan `null` bila API tidak dapat dihubungi atau
 * sesinya bukan sesi admin, sama seperti klien lain. Halaman yang memakainya
 * lalu menampilkan penjelasan keadaan, bukan layar kosong.
 *
 * Fungsi tulis melempar pesan dari server, karena sebab kegagalannya spesifik
 * (catatan penolakan kurang panjang, akun admin tidak boleh diubah) dan
 * adminnya perlu membaca yang mana.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface RingkasanAdmin {
  totalPengguna: number
  penggunaAktif: number
  totalPemilik: number
  pemilikBelumTerverifikasi: number
  totalProperti: number
  propertiMenungguVerifikasi: number
  totalBooking: number
  bookingBulanIni: number
  totalTransaksi: number
  nilaiTransaksi: number
}

export interface PropertiAdmin {
  id: string
  name: string
  slug: string
  city: string
  district: string
  verificationStatus: string
  publicationStatus: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  totalRooms: number
  primaryPhotoUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PenggunaAdmin {
  id: string
  fullName: string
  email: string
  phoneNumber: string | null
  role: string
  accountStatus: string
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string | null
}

export interface AktivitasAdmin {
  id: string
  action: string
  entityType: string
  entityId: string
  actorName: string
  actorEmail: string | null
  reason: string | null
  createdAt: string | null
}

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message: string }[] }
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

export async function fetchRingkasanAdmin(): Promise<RingkasanAdmin | null> {
  return ambil<RingkasanAdmin>('/admin/ringkasan')
}

export async function fetchPropertiAdmin(params: {
  status?: string
  q?: string
} = {}): Promise<PropertiAdmin[] | null> {
  const query = new URLSearchParams({ limit: '50' })
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)

  return ambil<PropertiAdmin[]>(`/admin/properti?${query.toString()}`)
}

export async function fetchPenggunaAdmin(params: {
  role?: string
  status?: string
  q?: string
} = {}): Promise<PenggunaAdmin[] | null> {
  const query = new URLSearchParams({ limit: '50' })
  if (params.role) query.set('role', params.role)
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)

  return ambil<PenggunaAdmin[]>(`/admin/pengguna?${query.toString()}`)
}

export async function fetchAktivitasAdmin(limit = 20): Promise<AktivitasAdmin[] | null> {
  return ambil<AktivitasAdmin[]>(`/admin/aktivitas?limit=${limit}`)
}

export async function verifikasiProperti(
  id: string,
  status: 'VERIFIED' | 'UNDER_REVIEW' | 'REJECTED' | 'SUSPENDED',
  notes?: string,
): Promise<unknown> {
  return kirim(`/admin/properti/${encodeURIComponent(id)}/verifikasi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  })
}

export async function ubahStatusPengguna(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  reason: string,
): Promise<unknown> {
  return kirim(`/admin/pengguna/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reason }),
  })
}
