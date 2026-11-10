import type { Metadata } from 'next'

import { PanelShell } from '@/components/dashboard/panel-shell'

export const metadata: Metadata = {
  title: {
    default: 'Panel',
    template: '%s · Panel KosPlatform',
  },
}

/**
 * Kerangka panel bersidebar untuk halaman `/dashboard/**`.
 *
 * Halaman panel sengaja punya kerangkanya sendiri, terpisah dari navbar dan
 * footer situs: yang dibuka pemilik di sini adalah pekerjaan harian, dan
 * navigasi pemasaran tidak membantu pekerjaan itu. Jalan kembali ke situs tetap
 * ada, satu tautan tetap di kaki sidebar.
 *
 * Route group `(panel)` tidak mengubah alamat halaman: `/dashboard` tetap
 * `/dashboard`, hanya kerangkanya yang berbeda.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>
}
