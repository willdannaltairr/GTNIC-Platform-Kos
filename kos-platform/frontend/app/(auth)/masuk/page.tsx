import type { Metadata } from 'next'

import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Masuk',
  description:
    'Masuk ke HuniKos untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.',
}

/**
 * Halaman masuk: dua kolom penuh, formulir di kiri dan foto di kanan.
 *
 * Halaman ini adalah pintu masuk seluruh situs, semua tautan yang meninggalkan
 * landing page mendarat di sini, jadi tata letaknya dibuat lapang dan hanya
 * berisi satu hal yang perlu dikerjakan.
 *
 * Fotonya sengaja bukan kamar kos: yang dibutuhkan halaman masuk adalah
 * bangunan yang tenang dan meyakinkan, bukan kamar yang belum tentu serupa
 * dengan kos yang sedang dicari pengunjung. Kutipan di kakinya berasal dari
 * data demo platform yang sama dengan bagian testimoni landing, lengkap dengan
 * penanda asalnya.
 */
export default function MasukPage() {
  return (
    <AuthShell
      image={{
        src: '/images/auth-masuk.jpg',
        alt: 'Rumah masa kini dengan jendela menyala hangat saat senja.',
      }}
      quote={{
        text: 'Yang berubah bukan pilihan kosnya, tapi saya tahu persis apa yang saya bayar. Deposit, listrik, air, semuanya sudah ada angkanya sebelum saya datang survei.',
        author: 'Rani Prameswari',
        role: 'Mahasiswa',
        note: 'Kutipan contoh dari data demo platform.',
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
