/**
 * Klien data pembayaran.
 *
 * Satu hal yang menentukan bentuk berkas ini: tidak ada fungsi yang mengirim
 * status. Status pembayaran hanya berubah dari notifikasi penyedia pembayaran
 * yang tanda tangannya sudah diperiksa server, atau lewat simulasi yang hanya
 * tersedia di pengembangan. Yang bisa dilakukan klien cuma membuat pembayaran,
 * menanyakan keadaannya, dan (di pengembangan) meminta pelunasan disimulasikan.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export interface Pembayaran {
  id: string
  paymentCode: string
  invoiceId: string | null
  invoiceNumber: string | null
  bookingId: string | null
  bookingCode: string | null
  tenantId: string
  tenantName: string
  amount: number
  currency: string
  provider: string
  method: string | null
  status: PaymentStatus
  providerTransactionId: string | null
  paidAt: string | null
  expiredAt: string | null
  createdAt: string
  /** Hanya terisi saat membuat pembayaran baru. */
  redirectUrl?: string | null
  providerReady?: boolean
  pesan?: string
}

export interface RiwayatPembayaran {
  id: string
  previousStatus: string | null
  newStatus: string
  source: string | null
  description: string | null
  createdAt: string
}

export interface PembayaranDetail extends Pembayaran {
  history: RiwayatPembayaran[]
}

export interface KonfigurasiPembayaran {
  provider: string
  mode: string
  ready: boolean
  simulasiTersedia: boolean
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

/** Keadaan penyedia pembayaran, supaya layar bisa menjelaskan apa adanya. */
export async function fetchKonfigurasiPembayaran(): Promise<KonfigurasiPembayaran | null> {
  return ambil<KonfigurasiPembayaran>('/payments/konfigurasi')
}

export async function fetchPembayaran(params: {
  status?: PaymentStatus
  invoiceId?: string
} = {}): Promise<Pembayaran[] | null> {
  const query = new URLSearchParams({ limit: '50' })
  if (params.status) query.set('status', params.status)
  if (params.invoiceId) query.set('invoiceId', params.invoiceId)

  return ambil<Pembayaran[]>(`/payments?${query.toString()}`)
}

export async function fetchPembayaranDetail(id: string): Promise<PembayaranDetail | null> {
  return ambil<PembayaranDetail>(`/payments/${encodeURIComponent(id)}`)
}

/**
 * Buat pembayaran untuk satu tagihan atau satu booking.
 *
 * Jumlahnya tidak dikirim untuk booking: server yang menentukan dari sisa yang
 * tercatat, dan itu satu-satunya angka yang boleh dipercaya.
 */
export async function buatPembayaran(input: {
  invoiceId?: string
  bookingId?: string
  amount?: number
  method?: string
}): Promise<Pembayaran> {
  return kirim<Pembayaran>('/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/**
 * Tandai pembayaran berhasil tanpa penyedia pembayaran.
 *
 * Hanya ada di pengembangan; di produksi rutenya tidak terdaftar sama sekali
 * sehingga panggilan ini akan gagal.
 */
export async function simulasiLunas(id: string): Promise<PembayaranDetail> {
  return kirim<PembayaranDetail>(`/payments/${encodeURIComponent(id)}/simulasi`, { method: 'POST' })
}
