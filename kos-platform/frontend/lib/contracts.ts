/**
 * Klien data kontrak sewa.
 *
 * Sama seperti klien lain: fungsi baca mengembalikan `null` bila API tidak
 * dapat dihubungi atau sesinya bukan pihak dalam kontrak itu, sedangkan fungsi
 * tulis melempar pesan dari server karena sebab kegagalannya spesifik
 * (kontrak belum ditandatangani, penghuni tidak boleh menandai selesai) dan
 * penggunanya perlu membaca yang mana.
 *
 * Peta perpindahan status tidak disalin ke sini. Yang ditampilkan hanyalah
 * tombol untuk status yang memang mungkin dari keadaan kontraknya, dan server
 * tetap menolak kalau tombolnya salah: menyalin aturannya berarti dua tempat
 * yang harus diubah setiap kali aturannya berubah.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'TERMINATED'
  | 'CANCELLED'

export interface Kontrak {
  id: string
  contractNumber: string
  bookingId: string
  bookingCode: string
  tenantId: string
  tenantName: string
  ownerId: string
  ownerName: string
  propertyId: string
  propertyName: string
  propertySlug: string
  roomId: string
  roomNumber: string
  startDate: string
  endDate: string | null
  monthlyRent: number
  depositAmount: number
  status: ContractStatus
  signedAt: string | null
  createdAt: string
}

/** Tagihan ringkas yang menempel pada satu kontrak. */
export interface TagihanKontrak {
  id: string
  invoiceNumber: string
  totalAmount: number
  status: string
  dueDate: string | null
}

/** Satu langkah pada riwayat status kontrak. */
export interface RiwayatKontrak {
  id: string
  previousStatus: string | null
  newStatus: string
  notes: string | null
  createdAt: string
}

export interface KontrakDetail extends Kontrak {
  invoices: TagihanKontrak[]
  riwayat: RiwayatKontrak[]
}

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

/** Kontrak milik pengguna yang sedang masuk, atau seluruhnya bila admin. */
export async function fetchKontrak(status?: ContractStatus): Promise<Kontrak[] | null> {
  const query = status ? `?status=${status}&limit=50` : '?limit=50'
  return ambil<Kontrak[]>(`/contracts${query}`)
}

export async function fetchKontrakDetail(id: string): Promise<KontrakDetail | null> {
  return ambil<KontrakDetail>(`/contracts/${encodeURIComponent(id)}`)
}

/**
 * Buat kontrak dari booking yang sudah dikonfirmasi.
 *
 * Hanya pemilik propertinya (atau admin) yang boleh memanggilnya; penghuni
 * ditolak server, dan pesannya ditampilkan apa adanya.
 */
export async function buatKontrak(input: {
  bookingId: string
  startDate?: string
  durasiBulan?: number
}): Promise<Kontrak> {
  return kirim<Kontrak>('/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/** Ubah status kontrak. Alasannya dipakai pada pengakhiran dan pembatalan. */
export async function ubahStatusKontrak(
  id: string,
  status: ContractStatus,
  alasan?: string,
): Promise<Kontrak> {
  return kirim<Kontrak>(`/contracts/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, alasan }),
  })
}
