import type { Metadata } from 'next'

import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel'

export const metadata: Metadata = {
  title: 'Verifikasi email',
  description: 'Pastikan alamat email akun KosPlatform Anda supaya pemberitahuan penting sampai.',
}

/**
 * Halaman verifikasi email.
 *
 * Tokennya dibaca dari query string di server, sama seperti halaman sandi baru,
 * supaya halamannya tetap server component. Yang berbeda: verifikasinya
 * dijalankan komponen klien setelah halaman terbuka, karena kegagalannya perlu
 * ditampilkan sebagai keadaan halaman, bukan sebagai layar galat Next.js.
 *
 * Halaman ini juga jadi tujuan tombol "kirim ulang" di halaman profil saat
 * dibuka tanpa token.
 */
export default async function VerifikasiEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthShell
      image={{
        src: '/images/auth-verifikasi.jpg',
        alt: 'Tanaman hijau di dekat jendela besar dengan pemandangan taman.',
      }}
    >
      <VerifyEmailPanel token={token ?? ''} />
    </AuthShell>
  )
}
