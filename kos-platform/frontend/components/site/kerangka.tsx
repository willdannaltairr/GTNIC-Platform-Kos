import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Kerangka tata letak halaman aplikasi.
 *
 * Dipakai seluruh halaman di dalam aplikasi (beranda, cari kos, pesan,
 * keuangan, dan seterusnya), BUKAN landing page. Landing page punya bahasa
 * visualnya sendiri yang sudah punya berkasnya sendiri pula, dan halaman itu
 * sengaja tidak ikut berubah saat kerangka ini disesuaikan.
 *
 * Iramanya mengikuti pola yang rapi dan lapang: tiap bagian dipisahkan garis
 * rambut tipis, judulnya kecil di atas dan besar di bawah, dan jarak antarbagian
 * lega. Yang membuat halaman terasa terbaca bukan warna atau hiasannya,
 * melainkan jarak yang konsisten antar bagian dan judul yang ukurannya jelas
 * berbeda dari isinya.
 */

/** Lebar isi halaman aplikasi. Satu nilai untuk seluruh halaman. */
const LEBAR = 'mx-auto w-full max-w-7xl'

/** Jarak tepi wadah: makin lebar layarnya, makin lega. */
const TEPI = 'px-4 sm:px-6 lg:px-8'

/**
 * Wadah isi halaman.
 *
 * Semua halaman aplikasi memakai jarak tepi dan jarak vertikal yang sama;
 * halaman yang isinya sempit (formulir, detail satu dokumen) memilih lebar
 * yang lebih kecil lewat `lebar`, bukan memakai wadah yang berbeda bentuk.
 * Dengan begitu judul halaman selalu mulai dari titik yang sama saat berpindah
 * halaman, dan yang berbeda hanya seberapa lebar isinya boleh memanjang.
 */
export function Wadah({
  children,
  className,
  lebar = 'penuh',
}: {
  children: ReactNode
  className?: string
  lebar?: 'sempit' | 'sedang' | 'lebar' | 'penuh'
}) {
  const maks = {
    sempit: 'max-w-3xl',
    sedang: 'max-w-4xl',
    lebar: 'max-w-6xl',
    penuh: 'max-w-7xl',
  }[lebar]

  return (
    <div className={cn('mx-auto w-full', maks, TEPI, 'py-10 sm:py-14 lg:py-16', className)}>
      {children}
    </div>
  )
}

/** Wadah untuk keadaan yang cuma satu paragraf: galat, kosong, atau memuat. */
export function WadahPesan({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(LEBAR, TEPI, 'py-20 text-center', className)}>
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}

/**
 * Satu bagian halaman: garis pemisah di atas, jarak lega di dalamnya.
 *
 * `garis` dimatikan untuk bagian pertama, karena garis di atas bagian paling
 * atas hanya menggambar ulang tepi navbar.
 */
export function Seksi({
  id,
  children,
  className,
  garis = true,
}: {
  id?: string
  children: ReactNode
  className?: string
  garis?: boolean
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20',
        garis && 'border-t border-border/70',
        'py-12 first:pt-0 sm:py-16 lg:py-20',
        className,
      )}
    >
      {children}
    </section>
  )
}

/** Label kecil di atas judul bagian: huruf besar, jarak antar huruf lebar. */
export function MataSeksi({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.24em]',
        tone === 'dark' ? 'text-primary-foreground/60' : 'text-muted-foreground',
      )}
    >
      {children}
    </p>
  )
}

/**
 * Judul satu bagian halaman.
 *
 * Ukurannya memakai `clamp`: satu nilai yang menyesuaikan diri dari ponsel
 * sampai layar lebar, sehingga tidak perlu tiga kelas berbeda yang mudah
 * tertinggal saat salah satunya diubah.
 *
 * `aksi` menampung tautan "lihat semua" di sisi kanan judul pada layar lebar.
 */
export function JudulSeksi({
  id,
  eyebrow,
  title,
  description,
  aksi,
  align = 'left',
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: ReactNode
  aksi?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center',
      )}
    >
      <div className={cn('min-w-0', align === 'center' && 'mx-auto max-w-2xl text-center')}>
        {eyebrow && <MataSeksi>{eyebrow}</MataSeksi>}

        <h2
          id={id}
          className={cn(
            'text-balance font-heading font-semibold leading-[1.1] tracking-[-0.03em]',
            'text-[clamp(1.5rem,3vw,2.1rem)]',
            eyebrow ? 'mt-3' : undefined,
          )}
        >
          {title}
        </h2>

        {description && (
          <p
            className={cn(
              'mt-3 max-w-2xl text-[15px] leading-[1.8] text-muted-foreground',
              align === 'center' && 'mx-auto',
            )}
          >
            {description}
          </p>
        )}
      </div>

      {aksi && <div className="shrink-0">{aksi}</div>}
    </div>
  )
}

/**
 * Judul halaman, bukan judul bagian.
 *
 * Dipakai sekali di puncak tiap halaman. Bentuknya sama dengan judul bagian,
 * hanya lebih besar, supaya keduanya terbaca sebagai satu keluarga dan yang
 * membedakan hanyalah tingkatnya.
 */
export function JudulHalaman({
  eyebrow,
  title,
  description,
  aksi,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  aksi?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <MataSeksi>{eyebrow}</MataSeksi>}

        <h1
          className={cn(
            'text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em]',
            'text-[clamp(1.75rem,3.6vw,2.6rem)]',
            eyebrow ? 'mt-3' : undefined,
          )}
        >
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.8] text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {aksi && <div className="shrink-0">{aksi}</div>}
    </header>
  )
}
