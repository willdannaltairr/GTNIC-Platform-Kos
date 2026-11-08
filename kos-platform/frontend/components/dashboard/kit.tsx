import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Perkakas tampilan dashboard.
 *
 * Dikumpulkan di satu berkas supaya kartu angka dan lencana status tidak
 * berbeda warna atau ukuran antara dashboard penghuni dan dashboard pemilik.
 * Halaman yang butuh sesuatu yang hanya dipakai sekali tetap menulisnya
 * sendiri, jadi berkas ini tidak berubah menjadi kumpulan gaya yang tak
 * terpakai.
 */

/** Nada warna lencana, satu tempat untuk seluruh halaman. */
const TONE = {
  sukses: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  peringatan: 'bg-amber-50 text-amber-700 ring-amber-200',
  bahaya: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  netral: 'bg-muted text-muted-foreground ring-border',
} as const

type Nada = keyof typeof TONE

interface Label {
  label: string
  nada: Nada
}

const BOOKING: Record<string, Label> = {
  PENDING: { label: 'Menunggu', nada: 'peringatan' },
  APPROVED: { label: 'Disetujui', nada: 'info' },
  AWAITING_PAYMENT: { label: 'Menunggu bayar', nada: 'peringatan' },
  CONFIRMED: { label: 'Dikonfirmasi', nada: 'sukses' },
  REJECTED: { label: 'Ditolak', nada: 'bahaya' },
  CANCELLED: { label: 'Dibatalkan', nada: 'netral' },
  EXPIRED: { label: 'Kedaluwarsa', nada: 'netral' },
  COMPLETED: { label: 'Selesai', nada: 'sukses' },
}

const INVOICE: Record<string, Label> = {
  DRAFT: { label: 'Draf', nada: 'netral' },
  UNPAID: { label: 'Belum dibayar', nada: 'peringatan' },
  PARTIALLY_PAID: { label: 'Dibayar sebagian', nada: 'peringatan' },
  PAID: { label: 'Lunas', nada: 'sukses' },
  OVERDUE: { label: 'Terlambat', nada: 'bahaya' },
  CANCELLED: { label: 'Dibatalkan', nada: 'netral' },
}

const PERBAIKAN: Record<string, Label> = {
  OPEN: { label: 'Baru', nada: 'peringatan' },
  REVIEWING: { label: 'Ditinjau', nada: 'info' },
  IN_PROGRESS: { label: 'Dikerjakan', nada: 'info' },
  WAITING_FOR_PARTS: { label: 'Menunggu suku cadang', nada: 'peringatan' },
  RESOLVED: { label: 'Selesai', nada: 'sukses' },
  REJECTED: { label: 'Ditolak', nada: 'bahaya' },
  CLOSED: { label: 'Ditutup', nada: 'netral' },
}

const PRIORITAS: Record<string, Label> = {
  LOW: { label: 'Rendah', nada: 'netral' },
  MEDIUM: { label: 'Sedang', nada: 'info' },
  HIGH: { label: 'Tinggi', nada: 'peringatan' },
  URGENT: { label: 'Mendesak', nada: 'bahaya' },
}

const KONTRAK: Record<string, Label> = {
  DRAFT: { label: 'Draf', nada: 'netral' },
  PENDING_SIGNATURE: { label: 'Menunggu tanda tangan', nada: 'peringatan' },
  ACTIVE: { label: 'Aktif', nada: 'sukses' },
  COMPLETED: { label: 'Selesai', nada: 'sukses' },
  TERMINATED: { label: 'Diakhiri', nada: 'bahaya' },
  CANCELLED: { label: 'Dibatalkan', nada: 'netral' },
}

const KUNJUNGAN: Record<string, Label> = {
  SCHEDULED: { label: 'Terjadwal', nada: 'info' },
  COMPLETED: { label: 'Selesai', nada: 'sukses' },
  CANCELLED: { label: 'Dibatalkan', nada: 'netral' },
  NO_SHOW: { label: 'Tidak hadir', nada: 'bahaya' },
}

const KAMUS = {
  booking: BOOKING,
  invoice: INVOICE,
  perbaikan: PERBAIKAN,
  prioritas: PRIORITAS,
  kontrak: KONTRAK,
  kunjungan: KUNJUNGAN,
} as const

export type JenisStatus = keyof typeof KAMUS

/**
 * Lencana status.
 *
 * Status yang belum ada di kamus ditampilkan apa adanya dengan nada netral.
 * Menyembunyikannya atau menampilkan "tidak diketahui" justru membuat nilai
 * baru dari database tidak pernah terlihat, padahal itu yang perlu ditambah ke
 * kamus.
 */
export function StatusBadge({ status, jenis }: { status: string; jenis: JenisStatus }) {
  const item: Label = KAMUS[jenis][status] ?? { label: status, nada: 'netral' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
        TONE[item.nada],
      )}
    >
      {item.label}
    </span>
  )
}

/** Kartu angka ringkasan. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Kotak berjudul untuk satu daftar atau satu kelompok isi. */
export function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  )
}

/** Keadaan kosong yang menjelaskan sebabnya, bukan sekadar "tidak ada data". */
export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
