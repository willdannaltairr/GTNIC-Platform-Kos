/**
 * Klien analitik pemilik kos.
 *
 * Seluruh angkanya datang dari satu endpoint karena halaman ini menampilkan
 * semuanya sekaligus, dan memecahnya menjadi beberapa permintaan hanya akan
 * membuat sebagian kartu terisi lebih dulu daripada yang lain tanpa manfaat.
 */

import { API_BASE } from './api-alamat'

export interface DeretBulanan {
  /** "2026-11" */
  bulan: string
  /** Uang yang benar-benar diterima bulan itu, dari pembayaran SUCCESS. */
  diterima: number
  /** Tagihan yang diterbitkan bulan itu, termasuk yang belum dibayar. */
  ditagihkan: number
}

export interface HunianProperti {
  id: string
  name: string
  city: string
  rooms: number
  occupied: number
  available: number
  maintenance: number
  /** 0–100, dari kamar terisi dibagi seluruh kamar properti itu. */
  tingkatHunian: number
  /** Sewa bulanan dari kamar yang terisi. */
  nilaiTerisi: number
}

export interface UmurTagihan {
  belumJatuhTempo: number
  lewat1Sampai7: number
  lewat8Sampai30: number
  lewatLebih30: number
  totalBelumLunas: number
  jumlahBelumLunas: number
}

export interface FunnelBooking {
  diajukan: number
  disetujui: number
  ditolak: number
  batal: number
}

export interface RingkasPerbaikan {
  terbuka: number
  selesai90Hari: number
  total: number
  rataHariSelesai: number | null
}

export interface AnalitikPemilik {
  bulan: number
  deret: DeretBulanan[]
  properti: HunianProperti[]
  tagihan: UmurTagihan
  booking: FunnelBooking
  perbaikan: RingkasPerbaikan
  ringkasan: {
    kamar: number
    kamarTerisi: number
    kamarTersedia: number
    tingkatHunian: number
    pendapatanBulanIni: number
    pendapatanBulanLalu: number
    /** Persentase perubahan dibanding bulan lalu; null bila bulan lalu nol. */
    perubahanPendapatan: number | null
  }
}

/**
 * Ambil analitik pemilik; `null` bila API mati, sesi tidak sah, atau bukan
 * pemilik. Halaman menampilkan pesan yang sama untuk ketiganya karena
 * pengunjung tidak bisa berbuat apa-apa atas perbedaan itu.
 */
export async function fetchAnalitikOwner(bulan = 6): Promise<AnalitikPemilik | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/dashboard/owner/analitik?bulan=${bulan}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: AnalitikPemilik }
    return payload.data
  } catch {
    return null
  }
}
