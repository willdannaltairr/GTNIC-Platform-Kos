import type { Metadata } from 'next'

import { AuthShell } from '@/components/auth/auth-shell'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Lupa sandi',
  description:
    'Minta tautan untuk membuat sandi baru bagi akun KosPlatform Anda lewat email terdaftar.',
}

/**
 * Halaman lupa sandi.
 *
 * Memakai kerangka yang sama dengan masuk dan daftar supaya berpindah antar
 * halaman akun tidak terasa seperti berpindah aplikasi. Fotonya sengaja
 * berbeda dari dua halaman itu, sebagai penanda halus bahwa pengunjung sedang
 * di langkah lain.
 */
export default function LupaSandiPage() {
  return (
    <AuthShell
      image={{
        src: '/images/kos-5.jpg',
        alt: 'Ruang kos dengan jendela besar dan cahaya pagi menerpa lantai kayu.',
      }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
