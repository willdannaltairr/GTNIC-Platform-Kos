import type { Metadata } from 'next'

import { PanelShell } from '@/components/dashboard/panel-shell'
import { PenjagaSesi } from '@/components/session/penjaga-sesi'

export const metadata: Metadata = {
  title: {
    default: 'Panel',
    template: '%s · Panel HuniKos',
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
 * Isinya dijaga PenjagaSesi seperti halaman situs: panel hanya untuk akun yang
 * sudah masuk, dan pengunjung yang belum punya akun diarahkan ke halaman masuk.
 *
 * Route group `(panel)` tidak mengubah alamat halaman: `/dashboard` tetap
 * `/dashboard`, hanya kerangkanya yang berbeda.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell>
      <PenjagaSesi>{children}</PenjagaSesi>
    </PanelShell>
  )
}
