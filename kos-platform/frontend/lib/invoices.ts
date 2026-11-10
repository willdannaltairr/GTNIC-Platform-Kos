/**
 * Klien data tagihan sewa.
 *
 * Halaman yang memakainya dipakai dua peran sekaligus: penghuni melihat tagihan
 * yang ditujukan kepadanya, pemilik melihat tagihan yang ia terbitkan. Peran
 * mana yang berlaku ditentukan server, jadi tidak ada parameter peran di sini.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface Tagihan {
  id: string
  invoiceNumber: string
  tenantId: string
  tenantName: string
  ownerId: string
  ownerName: string
  bookingId: string | null
  bookingCode: string | null
  contractId: string | null
  contractNumber: string | null
  propertyName: string | null
  billingPeriodStart: string | null
  billingPeriodEnd: string | null
  issueDate: string | null
  dueDate: string | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: InvoiceStatus
  notes: string | null
  createdAt: string
}

export interface BarisTagihan {
  id: string
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  costType: string | null
}

export interface PembayaranRingkas {
  id: string
  paymentCode: string
  amount: number
  status: string
  method: string | null
  paidAt: string | null
  createdAt: string
}

export interface TagihanDetail extends Tagihan {
  items: BarisTagihan[]
  payments: PembayaranRingkas[]
}

export interface MetaTagihan {
  page: number
  limit: number
  total: number
  totalPages: number
  /** Sisa yang belum masuk, dijumlahkan dari seluruh tagihan pemilik ini. */
  totalBelumDibayar: number
  totalTerbayar: number
}

export interface HasilTagihan {
  items: Tagihan[]
  meta: MetaTagihan
}

export interface BarisBaru {
  description: string
  quantity: number
  unitPrice: number
  costType?: string
}

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message?: string }[] }
    return data.errors?.[0]?.message ?? data.message ?? fallback
  }
  return fallback
}

/** Daftar tagihan beserta ringkasan uangnya. */
export async function fetchTagihan(params: {
  status?: InvoiceStatus
} = {}): Promise<HasilTagihan | null> {
  const query = new URLSearchParams({ limit: '50' })
  if (params.status) query.set('status', params.status)

  try {
    const response = await fetch(`${API_BASE}/api/v1/invoices?${query.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: Tagihan[]; meta: MetaTagihan }
    return { items: payload.data, meta: payload.meta }
  } catch {
    return null
  }
}

export async function fetchTagihanDetail(id: string): Promise<TagihanDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/invoices/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: TagihanDetail }
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

/** Buat tagihan baru sebagai draf; hanya pemilik propertinya. */
export async function buatTagihan(input: {
  contractId?: string
  bookingId?: string
  billingPeriodStart?: string
  billingPeriodEnd?: string
  dueDate?: string
  items: BarisBaru[]
  discountAmount?: number
  notes?: string
}): Promise<TagihanDetail> {
  return kirim<TagihanDetail>('/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/** Kirim tagihan ke penghuni; draf berubah menjadi belum dibayar. */
export async function kirimTagihan(id: string): Promise<TagihanDetail> {
  return kirim<TagihanDetail>(`/invoices/${encodeURIComponent(id)}/kirim`, { method: 'POST' })
}

export async function batalkanTagihan(id: string, alasan: string): Promise<TagihanDetail> {
  return kirim<TagihanDetail>(`/invoices/${encodeURIComponent(id)}/batalkan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alasan }),
  })
}
