import type { Metadata } from 'next'

import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Daftar',
  description:
    'Buat akun KosPlatform untuk mencari kos dengan biaya yang transparan, atau untuk mengelola properti Anda.',
}

/**
 * Halaman daftar: dua kolom penuh, formulir di kiri dan foto kamar di kanan.
 *
 * Bentuknya sengaja disamakan dengan halaman masuk supaya berpindah antara
 * masuk dan daftar tidak terasa seperti berpindah aplikasi. Yang berbeda hanya
 * fotonya, lebar kolom formulirnya yang sedikit lebih besar (pilihan peran dan
 * tiga isian tidak nyaman dibaca pada ukuran kolom formulir masuk), dan catatan
 * tentang akun administrator di kaki kolom.
 */
export default function DaftarPage() {
  return (
    <AuthShell
      image={{
        src: '/images/kos-1.jpg',
        alt: 'Kamar kos: tempat tidur rapi dengan tanaman hijau di dekat jendela.',
      }}
      formWidth="max-w-md"
      footer={
        <>
          <span>
            Sudah punya akun?{' '}
            <Link href="/masuk" className="font-semibold text-primary hover:text-primary-strong">
              Masuk di sini
            </Link>
          </span>
          <span className="text-muted-foreground/80">Akun admin dibuat tim platform</span>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
