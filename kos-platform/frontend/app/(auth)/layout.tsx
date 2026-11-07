import { SiteChrome } from '@/components/site-chrome'

/**
 * Chrome untuk halaman autentikasi: header dan footer situs, tanpa sidebar.
 *
 * Halaman masuk dan daftar sengaja dipisahkan dari grup (site) supaya sidebar
 * navigasi tidak muncul di sana — form auth butuh perhatian penuh, bukan menu
 * yang mengalihkan pandangan ke halaman lain.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
