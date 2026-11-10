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

/**
 * Harga untuk grafik dan kartu ringkas.
 *
 * Nilainya tetap ditulis penuh dalam rupiah, bukan disingkat "jt" atau "rb".
 * Singkatan menyembunyikan besarnya biaya: selisih antara Rp1.850.000 dan
 * "Rp1,85 jt" tidak terlihat, padahal justru selisih itu yang dibaca orang.
 */
export const formatRupiahRingkas = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  return formatRupiah(value)
}

export const formatNumber = (value: number): string => new Intl.NumberFormat('id-ID').format(value)

/**
 * Jarak untuk ditampilkan: "800 m" di bawah satu kilometer, "4,3 km" di atasnya.
 *
 * Di bawah 1 km, "0,8 km" menyembunyikan hal yang justru paling menentukan -
 * bahwa kosnya bisa dicapai jalan kaki.
 */
export const formatJarak = (km: number | null | undefined): string => {
  if (km === null || km === undefined) return '-'
  if (km < 1) return `${formatNumber(Math.round(km * 1000))} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

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

/** "Diperbarui 2 hari lalu", null berarti pemilik belum pernah mengonfirmasi. */
export const formatLastConfirmed = (days: number | null): string => {
  if (days === null) return 'Belum pernah dikonfirmasi pemilik'
  if (days <= 0) return 'Dikonfirmasi hari ini'
  if (days === 1) return 'Dikonfirmasi kemarin'
  return `Dikonfirmasi ${days} hari lalu`
}

/** Tanggal ringkas untuk daftar: "8 Nov 2026". */
const tanggal = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export const formatTanggal = (value: string | null | undefined): string => {
  if (!value) return '-'
  const waktu = new Date(value)
  if (Number.isNaN(waktu.getTime())) return '-'
  return tanggal.format(waktu)
}

/** Tanggal dan jam untuk percakapan: "8 Nov 2026, 14.05". */
const tanggalJam = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatTanggalJam = (value: string | null | undefined): string => {
  if (!value) return '-'
  const waktu = new Date(value)
  if (Number.isNaN(waktu.getTime())) return '-'
  return tanggalJam.format(waktu)
}
