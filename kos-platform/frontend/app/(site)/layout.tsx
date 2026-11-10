import { PenjagaSesi } from '@/components/session/penjaga-sesi'
import { SiteShell } from '@/components/site-shell'

/**
 * Kerangka halaman situs: navbar navigasi, isi halaman, lalu footer.
 *
 * Isinya dibungkus PenjagaSesi: seluruh halaman di grup ini menuntut akun,
 * jadi pengunjung yang belum masuk diarahkan ke halaman masuk sebelum isinya
 * tergambar. Landing page berada di grup lain dan tidak ikut dijaga.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <PenjagaSesi>{children}</PenjagaSesi>
    </SiteShell>
  )
}
