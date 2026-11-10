import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
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

/**
 * Status pembayaran.
 *
 * PENDING ditulis "Menunggu dibayar" dan EXPIRED "Kedaluwarsa": yang pertama
 * masih bisa diselesaikan penghuni, yang kedua tidak lagi dan ia perlu membuat
 * pembayaran baru. Menulis keduanya sebagai "Menunggu" akan membuat penghuni
 * menunggu sesuatu yang sudah tidak akan terjadi.
 */
const PEMBAYARAN: Record<string, Label> = {
  PENDING: { label: 'Menunggu dibayar', nada: 'peringatan' },
  SUCCESS: { label: 'Berhasil', nada: 'sukses' },
  FAILED: { label: 'Gagal', nada: 'bahaya' },
  EXPIRED: { label: 'Kedaluwarsa', nada: 'netral' },
  REFUNDED: { label: 'Dana dikembalikan', nada: 'netral' },
  PARTIALLY_REFUNDED: { label: 'Dikembalikan sebagian', nada: 'peringatan' },
}

/**
 * Status verifikasi properti.
 *
 * PENDING diterjemahkan "Belum diajukan", bukan "Menunggu": properti baru
 * lahir dengan status ini dan pemiliknya masih harus menekan tombol pengajuan
 * sendiri. Menulisnya "Menunggu" membuat pemilik menunggu di tempat, padahal
 * tidak ada yang sedang menunggu apa pun.
 */
const VERIFIKASI: Record<string, Label> = {
  PENDING: { label: 'Belum diajukan', nada: 'netral' },
  UNDER_REVIEW: { label: 'Ditinjau admin', nada: 'info' },
  VERIFIED: { label: 'Terverifikasi', nada: 'sukses' },
  REJECTED: { label: 'Ditolak', nada: 'bahaya' },
  SUSPENDED: { label: 'Ditangguhkan', nada: 'bahaya' },
}

const PUBLIKASI: Record<string, Label> = {
  DRAFT: { label: 'Draf', nada: 'netral' },
  PUBLISHED: { label: 'Terbit', nada: 'sukses' },
  UNPUBLISHED: { label: 'Tidak terbit', nada: 'peringatan' },
  ARCHIVED: { label: 'Diarsipkan', nada: 'netral' },
}

/**
 * Status akun pengguna.
 *
 * PENDING_VERIFICATION tetap ada meski pendaftaran saat ini langsung
 * mengaktifkan akun: nilai itu masih ada di enum database dan bisa muncul pada
 * akun lama. Status yang belum ada di kamus akan tampil apa adanya dengan nada
 * netral, dan itu justru menyembunyikan bahwa ada keadaan akun yang belum
 * ditangani di sini.
 */
const AKUN: Record<string, Label> = {
  ACTIVE: { label: 'Aktif', nada: 'sukses' },
  PENDING_VERIFICATION: { label: 'Belum terverifikasi', nada: 'peringatan' },
  SUSPENDED: { label: 'Ditangguhkan', nada: 'peringatan' },
  BANNED: { label: 'Diblokir', nada: 'bahaya' },
}

const PERAN: Record<string, Label> = {
  TENANT: { label: 'Pencari kos', nada: 'info' },
  OWNER: { label: 'Pemilik kos', nada: 'netral' },
  ADMIN: { label: 'Admin', nada: 'peringatan' },
}

/**
 * Status verifikasi pemilik kos.
 *
 * NOT_SUBMITTED ditulis "Belum diajukan", bukan "Belum terverifikasi": yang
 * perlu diketahui pemilik adalah apakah dia sudah mengirim pengajuannya atau
 * belum, dan itu beda hal dengan sudah ditolak atau belum diputuskan.
 */
const VERIFIKASI_PEMILIK: Record<string, Label> = {
  NOT_SUBMITTED: { label: 'Belum diajukan', nada: 'netral' },
  UNDER_REVIEW: { label: 'Menunggu tinjauan', nada: 'info' },
  VERIFIED: { label: 'Terverifikasi', nada: 'sukses' },
  REJECTED: { label: 'Ditolak', nada: 'bahaya' },
}

/** Status satu dokumen verifikasi yang sudah diunggah. */
const DOKUMEN: Record<string, Label> = {
  PENDING: { label: 'Terunggah', nada: 'netral' },
  UNDER_REVIEW: { label: 'Menunggu tinjauan', nada: 'info' },
  VERIFIED: { label: 'Diterima', nada: 'sukses' },
  REJECTED: { label: 'Ditolak', nada: 'bahaya' },
}

/**
 * Status ulasan.
 *
 * PENDING_MODERATION ditulis "Menunggu tinjauan", bukan "Draf": ulasannya sudah
 * terkirim dan tidak bisa ditarik lagi oleh penulisnya, yang ia tunggu adalah
 * keputusan admin. Menulisnya "Draf" membuat penulisnya menunggu sesuatu yang
 * tidak akan datang.
 */
const ULASAN: Record<string, Label> = {
  PENDING_MODERATION: { label: 'Menunggu tinjauan', nada: 'peringatan' },
  APPROVED: { label: 'Tayang', nada: 'sukses' },
  REJECTED: { label: 'Ditolak', nada: 'bahaya' },
  HIDDEN: { label: 'Disembunyikan', nada: 'netral' },
}

/**
 * Status pemeriksaan kondisi kamar (Room Passport).
 *
 * DISPUTED ditulis "Dipertanyakan", bukan "Ditolak": pemilik tidak menolak
 * pemeriksaannya, ia tidak menyetujui sebagian isinya, dan penghuninya masih
 * bisa memperbaiki lalu meminta persetujuan lagi. Menulisnya "Ditolak" membuat
 * penghuni mengira laporannya mati.
 */
const KONDISI: Record<string, Label> = {
  DRAFT: { label: 'Draf', nada: 'netral' },
  SUBMITTED: { label: 'Menunggu persetujuan', nada: 'peringatan' },
  ACKNOWLEDGED: { label: 'Disetujui', nada: 'sukses' },
  DISPUTED: { label: 'Dipertanyakan', nada: 'bahaya' },
  COMPLETED: { label: 'Selesai', nada: 'sukses' },
}

/** Keadaan satu butir periksa kondisi kamar. */
const KEADAAN: Record<string, Label> = {
  BAIK: { label: 'Baik', nada: 'sukses' },
  RUSAK_RINGAN: { label: 'Rusak ringan', nada: 'peringatan' },
  RUSAK_BERAT: { label: 'Rusak berat', nada: 'bahaya' },
  TIDAK_ADA: { label: 'Tidak ada', nada: 'netral' },
}

const KAMUS = {
  booking: BOOKING,
  invoice: INVOICE,
  perbaikan: PERBAIKAN,
  prioritas: PRIORITAS,
  kontrak: KONTRAK,
  kunjungan: KUNJUNGAN,
  verifikasi: VERIFIKASI,
  publikasi: PUBLIKASI,
  akun: AKUN,
  peran: PERAN,
  pemilik: VERIFIKASI_PEMILIK,
  dokumen: DOKUMEN,
  pembayaran: PEMBAYARAN,
  ulasan: ULASAN,
  kondisi: KONDISI,
  keadaan: KEADAAN,
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

/**
 * Kartu angka dengan ikon.
 *
 * Bentuknya lebih panjang daripada `StatCard` di atas: ikon di kanan atas,
 * angka besar di bawahnya, lalu satu baris keterangan. Dipakai dashboard yang
 * menampilkan banyak angka sekaligus, karena ikon membuat mata menemukan kartu
 * yang dicari tanpa membaca labelnya satu per satu.
 */
export function StatKartu({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-[-0.03em]">{value}</p>

      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Satu baris isian di dalam kartu: judul, nilai, dan batang kemajuan. */
export function ProgresBar({
  label,
  keterangan,
  nilai,
  teks,
}: {
  label: string
  keterangan?: string
  /** 0–100. Di luar rentang itu dipotong, bukan dibiarkan melebihi batangnya. */
  nilai: number
  teks: string
}) {
  const lebar = Math.min(100, Math.max(0, nilai))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">{label}</p>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {teks}
        </span>
      </div>

      {keterangan && <p className="text-xs leading-relaxed text-muted-foreground">{keterangan}</p>}

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(lebar)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${lebar}%` }}
        />
      </div>
    </div>
  )
}

export interface TitikGrafik {
  /** Label sumbu mendatar: "Sep", "Okt", dan seterusnya. */
  label: string
  /** Deret utama: digambar sebagai bidang bergradasi. */
  utama: number
  /** Deret pembanding: digambar sebagai garis putus-putus. */
  pembanding: number
}

/**
 * Grafik bidang dua deret.
 *
 * Digambar sebagai SVG langsung, bukan lewat pustaka grafik. Alasannya ukuran
 * dan ketergantungan: yang dibutuhkan hanya dua deret dan satu sumbu, sedangkan
 * pustaka grafik menambah ratusan kilobita ke bundel untuk kemampuan yang tidak
 * dipakai. Kalau nanti grafiknya perlu interaksi (tooltip, zoom, pilih deret),
 * baru pustaka itu sepadan.
 *
 * `preserveAspectRatio="none"` membuat gambarnya mengisi lebar kartu berapa pun,
 * dan `vector-effect="non-scaling-stroke"` menjaga tebal garisnya tetap sama
 * walaupun gambarnya ikut meregang.
 *
 * Angka nol semua digambar sebagai garis rata di dasar, bukan sebagai grafik
 * kosong: bulan tanpa pemasukan tetap harus terlihat sebagai bulan yang memang
 * nol, bukan sebagai bulan yang datanya gagal dimuat.
 */
export function GrafikArea({
  titik,
  labelUtama,
  labelPembanding,
  format,
}: {
  titik: TitikGrafik[]
  labelUtama: string
  labelPembanding: string
  /** Pemformat angka untuk keterangan; bawaan rupiah ringkas. */
  format?: (nilai: number) => string
}) {
  const LEBAR = 640
  const TINGGI = 200
  const ATAS = 16
  const BAWAH = TINGGI - 16

  const nilaiMaks = Math.max(1, ...titik.map((item) => Math.max(item.utama, item.pembanding)))
  const langkah = titik.length > 1 ? LEBAR / (titik.length - 1) : LEBAR

  const x = (index: number): number => index * langkah
  const y = (nilai: number): number => BAWAH - (nilai / nilaiMaks) * (BAWAH - ATAS)

  const garis = (pilih: (item: TitikGrafik) => number): string =>
    titik.map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(pilih(item))}`).join(' ')

  const bidang = `${garis((item) => item.utama)} L ${x(titik.length - 1)} ${BAWAH} L 0 ${BAWAH} Z`

  const cetak = format ?? ((nilai: number) => nilai.toLocaleString('id-ID'))

  const totalUtama = titik.reduce((jumlah, item) => jumlah + item.utama, 0)
  const totalPembanding = titik.reduce((jumlah, item) => jumlah + item.pembanding, 0)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="text-muted-foreground">
            {labelUtama} <span className="font-medium text-foreground">{cetak(totalUtama)}</span>
          </span>
        </span>

        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0 w-4 border-t-2 border-dashed border-muted-foreground/60"
          />
          <span className="text-muted-foreground">
            {labelPembanding}{' '}
            <span className="font-medium text-foreground">{cetak(totalPembanding)}</span>
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Grafik ${labelUtama} dan ${labelPembanding} per bulan`}
        className="mt-4 h-44 w-full sm:h-52"
      >
        <defs>
          <linearGradient id="grafik-utama" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((bagian) => (
          <line
            key={bagian}
            x1="0"
            x2={LEBAR}
            y1={ATAS + bagian * (BAWAH - ATAS)}
            y2={ATAS + bagian * (BAWAH - ATAS)}
            stroke="var(--border)"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={bidang} fill="url(#grafik-utama)" />

        <path
          d={garis((item) => item.utama)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d={garis((item) => item.pembanding)}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {titik.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Satu baris catatan aktivitas: ikon, kalimat, dan waktunya. */
export function BarisAktivitas({
  judul,
  pesan,
  waktu,
  icon: Icon,
  belumDibaca = false,
}: {
  judul: string
  pesan: string
  waktu: string
  icon: LucideIcon
  belumDibaca?: boolean
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          belumDibaca ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-medium">{judul}</span>{' '}
          <span className="text-muted-foreground">{pesan}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{waktu}</p>
      </div>
    </li>
  )
}
