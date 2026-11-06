import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

/**
 * Chrome halaman situs: header lengket, isi, lalu footer.
 *
 * Dipakai (site)/layout.tsx, dan juga dipasang langsung oleh not-found.tsx
 * serta error.tsx — keduanya berada di luar route group, sehingga tanpa ini
 * halaman 404 dan 500 akan kehilangan header dan footer yang sebelumnya
 * diwarisi dari layout akar.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
