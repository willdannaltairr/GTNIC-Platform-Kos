/** Pemformatan angka dan label dalam locale Indonesia. */

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export const formatRupiah = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'Belum ada harga'
  return rupiah.format(value)
}

/** Ringkas untuk kartu: Rp1,85 jt — hanya untuk tampilan pendek. */
export const formatRupiahRingkas = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `Rp${millions.toFixed(millions >= 10 ? 0 : 2).replace('.', ',')} jt`
  }
  if (value >= 1_000) {
    return `Rp${Math.round(value / 1_000)} rb`
  }
  return `Rp${value}`
}

export const formatNumber = (value: number): string => new Intl.NumberFormat('id-ID').format(value)

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  KOS_PUTRA: 'Kos Putra',
  KOS_PUTRI: 'Kos Putri',
  KOS_CAMPUR: 'Kos Campur',
}

export const BATHROOM_LABEL: Record<string, string> = {
  private: 'Kamar mandi dalam',
  shared: 'Kamar mandi luar',
}

export const ROOM_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Tersedia',
  RESERVED: 'Dipesan',
  OCCUPIED: 'Terisi',
  MAINTENANCE: 'Perawatan',
  INACTIVE: 'Nonaktif',
}

export const COST_CONFIDENCE_LABEL: Record<string, string> = {
  COMPLETE: 'Biaya lengkap',
  PARTIAL: 'Biaya sebagian',
  NEEDS_CONFIRMATION: 'Perlu konfirmasi biaya',
}

export const COST_CONFIDENCE_CLASS: Record<string, string> = {
  COMPLETE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 ring-amber-200',
  NEEDS_CONFIRMATION: 'bg-rose-50 text-rose-700 ring-rose-200',
}

/** "Diperbarui 2 hari lalu" — null berarti pemilik belum pernah mengonfirmasi. */
export const formatLastConfirmed = (days: number | null): string => {
  if (days === null) return 'Belum pernah dikonfirmasi pemilik'
  if (days <= 0) return 'Dikonfirmasi hari ini'
  if (days === 1) return 'Dikonfirmasi kemarin'
  return `Dikonfirmasi ${days} hari lalu`
}
