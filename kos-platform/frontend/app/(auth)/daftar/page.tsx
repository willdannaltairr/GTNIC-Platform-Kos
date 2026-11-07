import type { Metadata } from 'next'

import Image from 'next/image'
import Link from 'next/link'
import { Logo } from '@/components/landing/logo'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Daftar',
  description:
    'Buat akun KosPlatform untuk mencari kos dengan biaya yang transparan, atau untuk mengelola properti Anda.',
}

/**
 * Halaman daftar dua kolom: foto kamar di kiri, formulir di kanan.
 *
 * Bentuknya sengaja disamakan dengan halaman masuk — foto di kiri, formulir di
 * kanan, logo di atas formulir, dan tinggi yang dikunci ke layar supaya tidak
 * ikut tergulir. Yang berbeda hanya kolomnya yang sedikit lebih lebar: pilihan
 * peran dan tiga isian tidak nyaman dibaca pada ukuran kolom formulir masuk.
 *
 * Grup (auth) tidak memasang header maupun footer situs. Logo di atas formulir
 * menggantikan keduanya sebagai jalan kembali ke beranda.
 *
 * Kolom formulir diberi `overflow-y-auto`, bukan dipotong mati: formulir ini
 * lebih tinggi daripada layar pada laptop pendek, dan tanpa itu tombol Daftar
 * ada di luar jangkauan sama sekali. Di layar normal cadangan ini tidak pernah
 * aktif — tidak ada bilah gulir yang muncul.
 */
export default function DaftarPage() {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/images/kos-1.jpg"
          alt="Kamar kos: tempat tidur rapi dengan tanaman hijau di dekat jendela."
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col overflow-y-auto px-4 py-10 sm:px-6 lg:p-10">
        <Link
          href="/"
          aria-label="KosPlatform — beranda"
          className="inline-flex self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <div className="m-auto w-full max-w-sm py-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
