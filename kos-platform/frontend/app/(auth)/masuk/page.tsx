import type { Metadata } from 'next'

import { AuthCard } from '@/components/auth/auth-card'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Masuk',
  description:
    'Masuk ke KosPlatform untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.',
}

/**
 * Halaman masuk: kartu dua kolom dengan foto kamar di kiri, formulir di kanan.
 *
 * Halaman ini adalah pintu masuk seluruh situs — semua tautan yang meninggalkan
 * landing page mendarat di sini — jadi tata letaknya dibuat lapang dan hanya
 * berisi satu hal yang perlu dikerjakan.
 *
 * Kolom foto baru muncul di layar lebar (lg). Di layar kecil ia disembunyikan,
 * bukan ditumpuk sebagai latar: formulir yang harus dibaca di atas foto yang
 * ramai adalah formulir yang lebih sering salah isi.
 */
export default function MasukPage() {
  return (
    <AuthCard
      image={{
        src: '/images/kos-4.jpg',
        alt: 'Kamar kos: tempat tidur dengan selimut kelabu, lemari kayu, dan lantai parket.',
      }}
    >
      <LoginForm />
    </AuthCard>
  )
}
