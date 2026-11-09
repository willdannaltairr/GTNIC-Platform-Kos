/**
 * Klien data dashboard.
 *
 * Semua fungsi mengembalikan `null` ketika API tidak dapat dihubungi atau
 * membalas error, sama seperti `lib/api.ts`. Halaman yang memakainya lalu
 * menampilkan penjelasan keadaan, bukan layar kosong tanpa sebab.
 *
 * Angka uang sudah berbentuk number dari backend, jadi tidak ada konversi di
 * sini. Kalau suatu saat backend mengirimnya sebagai teks, halaman akan
 * menampilkan NaN dan itu akan terlihat langsung di layar, bukan diam-diam
 * salah jumlah.
 */

// Relatif terhadap situs sendiri: permintaannya diteruskan ke Edge Function
// oleh `next.config.ts`, supaya cookie sesi tetap first-party dan ikut terkirim.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface RingkasanTenant {
  bookingMenunggu: number
  sewaAktif: number
  tagihanBelumDibayar: number
  totalTagihanBelumDibayar: number
  perbaikanTerbuka: number
  favorit: number
  kunjunganTerjadwal: number
}

export interface SewaTenant {
  id: string
  propertyName: string
  roomNumber: string
  startDate: string | null
  endDate: string | null
  monthlyRent: number
  status: string
}

export interface TagihanItem {
  id: string
  invoiceNumber: string
  propertyName: string
  roomNumber: string
  dueDate: string | null
  totalAmount: number
  status: string
}

export interface TagihanOwner extends TagihanItem {
  tenantName: string
}

export interface PerbaikanItem {
  id: string
  propertyName: string
  roomNumber: string
  title: string
  priority: string
  status: string
  createdAt: string | null
}

export interface KunjunganItem {
  id: string
  propertyName: string
  scheduledAt: string | null
  status: string
}

export interface DashboardTenant {
  ringkasan: RingkasanTenant
  sewa: SewaTenant[]
  tagihan: TagihanItem[]
  perbaikan: PerbaikanItem[]
  kunjungan: KunjunganItem[]
}

export interface RingkasanOwner {
  properti: number
  propertiTerverifikasi: number
  kamar: number
  kamarTersedia: number
  kamarTerisi: number
  bookingMenunggu: number
  tagihanBelumDibayar: number
  totalTagihanBelumDibayar: number
  perbaikanTerbuka: number
  pendapatanBulanIni: number
}

export interface PropertiOwner {
  id: string
  name: string
  slug: string
  city: string
  verificationStatus: string
  publicationStatus: string
  totalRooms: number
  availableRooms: number
  occupiedRooms: number
  minMonthlyPrice: number | null
  primaryPhotoUrl: string | null
}

export interface BookingOwner {
  id: string
  tenantName: string
  propertyName: string
  roomNumber: string
  checkInDate: string | null
  status: string
  createdAt: string | null
}

export interface DashboardOwner {
  ringkasan: RingkasanOwner
  properti: PropertiOwner[]
  booking: BookingOwner[]
  tagihan: TagihanOwner[]
  perbaikan: PerbaikanItem[]
}

/** Ambil data dashboard penghuni; `null` bila API mati atau sesi tidak sah. */
export async function fetchDashboardTenant(): Promise<DashboardTenant | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/dashboard/tenant`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: DashboardTenant }
    return payload.data
  } catch {
    return null
  }
}

/** Ambil data dashboard pemilik kos; `null` bila API mati atau bukan pemilik. */
export async function fetchDashboardOwner(): Promise<DashboardOwner | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/dashboard/owner`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: DashboardOwner }
    return payload.data
  } catch {
    return null
  }
}
