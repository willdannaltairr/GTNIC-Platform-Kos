import type { Metadata } from 'next'

import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Masuk',
  description:
    'Masuk ke KosPlatform untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.',
}

/**
 * Halaman masuk: dua kolom penuh, formulir di kiri dan foto kamar di kanan.
 *
 * Halaman ini adalah pintu masuk seluruh situs, semua tautan yang meninggalkan
 * landing page mendarat di sini, jadi tata letaknya dibuat lapang dan hanya
 * berisi satu hal yang perlu dikerjakan.
 */
export default function MasukPage() {
  return (
    <AuthShell
      image={{
        src: '/images/kos-4.jpg',
        alt: 'Kamar kos: tempat tidur dengan selimut kelabu, lemari kayu, dan lantai parket.',
      }}
      footer={
        <span>
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-semibold text-primary hover:text-primary-strong">
            Daftar sekarang
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
