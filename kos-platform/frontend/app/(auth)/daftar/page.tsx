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
 * Halaman daftar: dua kolom penuh, formulir di kiri dan foto di kanan.
 *
 * Bentuknya sengaja disamakan dengan halaman masuk supaya berpindah antara
 * masuk dan daftar tidak terasa seperti berpindah aplikasi. Yang berbeda hanya
 * fotonya, kutipannya, lebar kolom formulirnya yang sedikit lebih besar
 * (pilihan peran dan tiga isian tidak nyaman dibaca pada ukuran kolom formulir
 * masuk), dan catatan tentang akun administrator di kaki kolom.
 *
 * Kutipan yang dipilih di sini suara pemilik kos, bukan penghuni: halaman ini
 * satu-satunya tempat kedua peran bertemu, dan pendaftar yang memilih jalan itu
 * perlu melihat bahwa platform ini bekerja untuknya juga.
 */
export default function DaftarPage() {
  return (
    <AuthShell
      image={{
        src: '/images/auth-daftar.jpg',
        alt: 'Fasad rumah dengan jendela bercahaya hangat pada dinding bertekstur.',
      }}
      quote={{
        text: 'Dulu saya harus menelepon satu per satu untuk tahu kamar mana yang masih kosong. Sekarang ketersediaannya saya perbarui sekali, dan calon penyewa melihat hal yang sama.',
        author: 'Hendra Wijaya',
        role: 'Pemilik kos',
        note: 'Kutipan contoh dari data demo platform.',
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
