export const metadata = {
  title: 'KosPlatform — Cari & Sewa Kos dengan Transparan',
  description:
    'Platform pencarian dan pengelolaan kos yang berfokus pada transparansi biaya, kecocokan kebutuhan, dan kepercayaan antara calon penghuni dengan pemilik kos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
