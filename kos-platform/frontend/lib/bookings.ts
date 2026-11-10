/**
 * Klien data booking.
 *
 * Status booking punya delapan nilai dan perpindahannya dibatasi di backend.
 * Frontend tidak mengulang peta perpindahannya di sini: yang ditampilkan hanya
 * tombol untuk status yang memang mungkin, dan backend tetap menolak kalau
 * tombolnya salah. Menyalin peta itu ke klien berarti dua tempat harus diubah
 * setiap kali aturannya berubah.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED'

export interface Booking {
  id: string
  bookingCode: string
  tenantId: string
  tenantName: string
  propertyId: string
  propertyName: string
  propertySlug: string
  roomId: string
  roomNumber: string
  startDate: string
  endDate: string | null
  monthlyPrice: number
  depositAmount: number
  additionalCost: number
  totalAmount: number
  status: BookingStatus
  tenantNotes: string | null
  ownerNotes: string | null
  createdAt: string
}

export interface RiwayatBooking {
  id: string
  previousStatus: string | null
  newStatus: string
  reason: string | null
  createdAt: string
}

export interface BookingDetail extends Booking {
  riwayat: RiwayatBooking[]
}

export interface MetaBooking {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AjukanBookingInput {
  propertyId: string
  roomId: string
  startDate: string
  durasiBulan: number
  catatan?: string
}

export async function fetchBookings(status?: BookingStatus): Promise<Booking[] | null> {
  const query = status ? `?status=${status}` : ''

  try {
    const response = await fetch(`${API_BASE}/api/v1/bookings${query}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: Booking[] }
    return payload.data
  } catch {
    return null
  }
}

export async function fetchBooking(id: string): Promise<BookingDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/bookings/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: BookingDetail }
    return payload.data
  } catch {
    return null
  }
}

/**
 * Ajukan sewa.
 *
 * Melempar pesan dari server, bukan mengembalikan null: pengajuan punya sebab
 * kegagalan yang perlu dibaca pengunjung, misalnya kamarnya sedang diajukan
 * orang lain atau tanggalnya belum diisi. Halaman yang memanggilnya
 * menampilkan pesan itu apa adanya.
 */
export async function createBooking(input: AjukanBookingInput): Promise<Booking> {
  const response = await fetch(`${API_BASE}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  const payload = (await response.json().catch(() => null)) as
    | { data?: Booking; message?: string; errors?: { message: string }[] }
    | null

  if (!response.ok) {
    throw new Error(
      payload?.errors?.[0]?.message ?? payload?.message ?? 'Pengajuan sewa tidak tersimpan',
    )
  }

  return payload!.data!
}

/** Ubah status booking; melempar pesan server bila perpindahannya ditolak. */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  catatan?: { alasan?: string; catatanPemilik?: string },
): Promise<Booking> {
  const response = await fetch(`${API_BASE}/api/v1/bookings/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, ...catatan }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { data?: Booking; message?: string; errors?: { message: string }[] }
    | null

  if (!response.ok) {
    throw new Error(payload?.errors?.[0]?.message ?? payload?.message ?? 'Status tidak berubah')
  }

  return payload!.data!
}
