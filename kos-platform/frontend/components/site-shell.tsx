import { SiteFooter } from '@/components/site-footer'
import { SiteSidebar } from '@/components/site-sidebar'

/**
 * Kerangka halaman situs: sidebar navigasi, isi, lalu footer.
 *
 * Dipakai (site)/layout.tsx, dan juga dipasang langsung oleh not-found.tsx
 * serta error.tsx — keduanya berada di luar route group, sehingga tanpa ini
 * halaman 404 dan 500 akan kehilangan navigasi.
 *
 * Footer berada di dalam kolom isi, bukan di bawah sidebar, supaya sidebar
 * bisa menempel penuh setinggi layar sementara isi digulir.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <SiteSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  )
}
