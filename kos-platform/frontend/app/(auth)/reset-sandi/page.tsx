import type { Metadata } from 'next'

import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Buat sandi baru',
  description: 'Buat sandi baru untuk akun KosPlatform Anda memakai tautan yang dikirim lewat email.',
}

/**
 * Halaman pembuatan sandi baru.
 *
 * Tokennya dibaca dari query string di server, bukan di peramban, supaya
 * halaman ini tetap server component dan tidak perlu membungkus isinya dengan
 * Suspense hanya untuk membaca satu parameter.
 */
export default async function ResetSandiPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthShell
      image={{
        src: '/images/auth-sandi-baru.jpg',
        alt: 'Bayangan dedaunan di dinding yang terkena sinar matahari pagi.',
      }}
    >
      <ResetPasswordForm token={token ?? ''} />
    </AuthShell>
  )
}
