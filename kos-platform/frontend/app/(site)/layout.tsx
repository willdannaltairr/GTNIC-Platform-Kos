import { SiteChrome } from '@/components/site-chrome'

/** Chrome untuk halaman selain landing: header lengket dan footer situs. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
