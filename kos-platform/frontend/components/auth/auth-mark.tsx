import type { LucideIcon } from 'lucide-react'

/**
 * Tanda halaman di atas judul formulir akun.
 *
 * Satu ikon di dalam bulatan, dengan lingkaran cahaya tipis di belakangnya.
 * Gunanya bukan hiasan: halaman akun tidak punya header situs, jadi begitu
 * halaman terbuka yang pertama terlihat hanya formulir. Tanda ini memberi satu
 * titik yang membuat mata tahu ia sedang di halaman masuk, bukan di halaman
 * buat sandi baru, sebelum judulnya sempat dibaca.
 *
 * Ikonnya datang dari pemanggil supaya tiap halaman tetap berbeda tandanya
 * tanpa perlu tahu bentuk halamannya.
 */
export function AuthMark({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative grid size-14 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 scale-125 rounded-full bg-primary/10" />
      <span className="relative grid size-14 place-items-center rounded-full bg-card text-primary ring-1 ring-primary/15">
        <Icon className="size-6" aria-hidden="true" />
      </span>
    </span>
  )
}
