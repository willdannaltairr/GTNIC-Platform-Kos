import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Kerangka tata letak halaman aplikasi.
 *
 * Dipakai seluruh halaman di dalam aplikasi (beranda, cari kos, kawasan, alat,
 * saya, dan seterusnya), BUKAN landing page. Landing page punya bahasa
 * visualnya sendiri dan sengaja tidak ikut berubah saat berkas ini disesuaikan.
 *
 * Iramanya mengikuti pola halaman aplikasi yang lapang: tiap bagian adalah pita
 * selebar jendela yang dipisahkan garis rambut tipis, isinya dibatasi 7xl di
 * tengah, judulnya kecil di atas dan besar di bawah. Pita selebar jendela itu
 * yang membuat halaman terbaca sebagai rangkaian bagian, bukan satu kolom
 * panjang: mata memakai garis antar-pita sebagai penanda tempat, sedangkan
 * jarak tepi yang seragam membuat judul selalu mulai dari titik yang sama saat
 * berpindah halaman.
 */

/** Lebar isi halaman aplikasi. Satu nilai untuk seluruh halaman. */
type LebarIsi = 'sempit' | 'sedang' | 'lebar' | 'penuh'

/**
 * Lebar maksimum isi per jenis halaman.
 *
 * Halaman berdaftar lebar (pencarian, kawasan, alat) memakai pita selebar
 * mungkin, sedangkan halaman satu kolom (profil, formulir, detail satu
 * dokumen) memilih lebar yang lebih kecil. Yang membedakan hanya seberapa jauh
 * isinya boleh memanjang; jarak tepinya tetap sama, sehingga judul selalu mulai
 * dari titik yang sama saat berpindah halaman.
 */
const MAKS: Record<LebarIsi, string> = {
  sempit: 'max-w-3xl',
  sedang: 'max-w-4xl',
  lebar: 'max-w-6xl',
  penuh: 'max-w-7xl',
}

/** Jarak tepi wadah: makin lebar layarnya, makin lega. */
const TEPI = 'px-4 sm:px-6 lg:px-8'

/** Jarak vertikal satu pita. */
const VERTIKAL = 'py-12 sm:py-16 lg:py-20'

/**
 * Wadah isi halaman yang tidak berbentuk pita.
 *
 * Dipakai halaman yang isinya satu blok saja. Halaman yang isinya berupa
 * beberapa bagian memakai `Seksi` yang sudah membawa wadahnya sendiri.
 */
export function Wadah({
  children,
  className,
  lebar = 'penuh',
}: {
  children: ReactNode
  className?: string
  lebar?: LebarIsi
}) {
  return (
    <div className={cn('mx-auto w-full', MAKS[lebar], TEPI, 'py-10 sm:py-12 lg:py-14', className)}>
      {children}
    </div>
  )
}

/** Wadah untuk keadaan yang cuma satu paragraf: galat, kosong, atau memuat. */
export function WadahPesan({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full', MAKS.penuh, TEPI, 'py-20 text-center', className)}>
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}

/**
 * Satu pita halaman: selebar jendela, isinya dibatasi di tengah.
 *
 * `garis` dimatikan untuk pita pertama, karena garis di atas bagian paling atas
 * hanya menggambar ulang tepi navbar.
 *
 * `nada="gelap"` membuat pitanya berlatar warna utama dengan tulisan terang.
 * Dipakai untuk bagian yang perlu berhenti sejenak dari halaman yang seluruhnya
 * putih: satu pita gelap di antara lima pita terang membuat bagian itu dibaca
 * sebagai penutup atau ringkasan, bukan sebagai isi biasa.
 */
export function Seksi({
  id,
  children,
  className,
  garis = true,
  nada = 'terang',
  lebar = 'penuh',
}: {
  id?: string
  children: ReactNode
  className?: string
  garis?: boolean
  nada?: 'terang' | 'gelap'
  lebar?: LebarIsi
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20',
        // Pita gelap tidak perlu garis pemisah: perbedaan warnanya sendiri sudah
        // menjadi batas, dan garis abu-abu di atas hijau tua terbaca sebagai
        // kesalahan, bukan sebagai pemisah.
        garis && (nada === 'gelap' ? 'border-t border-primary-strong' : 'border-t border-border'),
        nada === 'gelap' ? 'bg-primary text-primary-foreground' : 'bg-card',
      )}
    >
      <div className={cn('mx-auto w-full', MAKS[lebar], TEPI, VERTIKAL, className)}>{children}</div>
    </section>
  )
}

/** Label kecil di atas judul: huruf besar, jarak antar huruf lebar. */
export function MataSeksi({
  children,
  tone = 'light',
}: {
  children: ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.24em]',
        tone === 'dark' ? 'text-primary-foreground/70' : 'text-muted-foreground',
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
  tone = 'light',
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: ReactNode
  aksi?: ReactNode
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center',
      )}
    >
      <div className={cn('min-w-0', align === 'center' && 'mx-auto max-w-2xl text-center')}>
        {eyebrow && <MataSeksi tone={tone}>{eyebrow}</MataSeksi>}

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
              'mt-3 max-w-2xl text-[15px] leading-[1.8]',
              align === 'center' && 'mx-auto',
              tone === 'dark' ? 'text-primary-foreground/80' : 'text-muted-foreground',
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
  tone = 'light',
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  aksi?: ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <MataSeksi tone={tone}>{eyebrow}</MataSeksi>}

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
          <p
            className={cn(
              'mt-3 max-w-2xl text-[15px] leading-[1.8]',
              tone === 'dark' ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            {description}
          </p>
        )}
      </div>

      {aksi && <div className="shrink-0">{aksi}</div>}
    </header>
  )
}

/**
 * Baris bernomor dengan garis pemisah.
 *
 * Dipakai daftar yang urutannya memang berarti: langkah, urutan proses, atau
 * tingkatan. Nomornya sengaja memakai angka yang sama lebar (`tabular-nums`)
 * supaya barisnya tidak bergeser saat angkanya berubah dari 9 ke 10.
 */
export function BarisAngka({
  nomor,
  judul,
  children,
}: {
  nomor: string
  judul: string
  children?: ReactNode
}) {
  return (
    <div className="flex gap-5 border-b border-border py-6 last:border-b-0 sm:gap-8">
      <span className="w-9 shrink-0 pt-0.5 text-[13px] font-semibold tabular-nums tracking-[0.16em] text-primary">
        {nomor}
      </span>

      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{judul}</h3>
        {children && (
          <p className="mt-2 text-sm leading-[1.8] text-muted-foreground">{children}</p>
        )}
      </div>
    </div>
  )
}

/** Tombol utama: pil penuh, satu warna aksen, dipakai sekali per layar. */
export const TOMBOL_UTAMA =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70'

/** Tombol kedua: bentuk sama, tanpa warna aksen agar tidak bersaing. */
export const TOMBOL_SEKUNDER =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent/40'
