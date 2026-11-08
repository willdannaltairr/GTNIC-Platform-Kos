import type { Metadata } from 'next'
import { SessionProvider } from '@/components/session/session-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'KosPlatform, Cari & Sewa Kos dengan Biaya Transparan',
    template: '%s · KosPlatform',
  },
  description:
    'Platform pencarian dan pengelolaan kos yang berfokus pada transparansi biaya, kecocokan kebutuhan, dan kepercayaan antara calon penghuni dengan pemilik kos.',
}

/**
 * Shell dokumen bersama untuk seluruh rute.
 *
 * Hanya memuat <html>, <head>, dan <body>. Header serta footer dipasang per
 * route group, landing punya chrome sendiri, sementara halaman lain memakai
 * header dan footer situs yang sudah ada.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* Font dimuat lewat <link>, bukan next/font, karena next/font
            mengunduh berkasnya saat build, build akan gagal di mesin tanpa
            jaringan. Plus Jakarta Sans untuk halaman situs; DM Sans, Space
            Grotesk, dan JetBrains Mono untuk landing page (lihat
            .landing-scope di globals.css). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        {/* Provider dipasang di akar, bukan per route group, supaya landing,
            halaman situs, dan halaman auth membaca sesi yang sama, dan
            perpanjangan token hanya berjalan sekali, bukan sekali per group. */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
