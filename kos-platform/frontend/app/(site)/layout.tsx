import { SiteShell } from '@/components/site-shell'

/** Kerangka halaman situs: sidebar navigasi, isi halaman, lalu footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
