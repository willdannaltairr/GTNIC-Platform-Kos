import type { Metadata } from 'next'

import { AuthCard } from '@/components/auth/auth-card'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Daftar',
  description:
    'Buat akun KosPlatform untuk mencari kos dengan biaya yang transparan, atau untuk mengelola properti Anda.',
}

/**
 * Halaman daftar: kartu dua kolom dengan foto kamar di kiri, formulir di kanan.
 *
 * Bentuknya sengaja disamakan dengan halaman masuk supaya berpindah antara
 * masuk dan daftar tidak terasa seperti berpindah aplikasi. Yang berbeda hanya
 * fotonya, dan lebar kolom formulirnya yang sedikit lebih besar — pilihan peran
 * dan tiga isian tidak nyaman dibaca pada ukuran kolom formulir masuk.
 */
export default function DaftarPage() {
  return (
    <AuthCard
      image={{
        src: '/images/kos-1.jpg',
        alt: 'Kamar kos: tempat tidur rapi dengan tanaman hijau di dekat jendela.',
      }}
      formWidth="max-w-md"
    >
      <RegisterForm />
    </AuthCard>
  )
}
