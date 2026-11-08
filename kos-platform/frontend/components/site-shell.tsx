import { AppNavbar } from '@/components/app-navbar'
import { SiteFooter } from '@/components/site-footer'

/**
 * Kerangka halaman aplikasi: navbar, isi, lalu footer.
 *
 * Dipakai (site)/layout.tsx, dan juga dipasang langsung oleh not-found.tsx
 * serta error.tsx, keduanya berada di luar route group, sehingga tanpa ini
 * halaman 404 dan 500 akan kehilangan navigasi.
 *
 * Navigasinya navbar di atas, bukan sidebar. Kolom tetap selebar 260px
 * memakan hampir sepertiga layar untuk menu yang isinya cuma beberapa tautan;
 * di navbar, isi halaman memakai lebar penuh dan daftar kos jadi lebih lega.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AppNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
