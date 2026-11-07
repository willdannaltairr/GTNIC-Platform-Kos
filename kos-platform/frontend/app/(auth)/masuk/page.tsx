import type { Metadata } from 'next'

import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Masuk',
  description:
    'Masuk ke KosPlatform untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.',
}

/**
 * Halaman masuk dua kolom: formulir di kiri, foto kamar di kanan.
 *
 * Halaman ini adalah pintu masuk seluruh situs — semua tautan yang meninggalkan
 * landing page mendarat di sini — jadi tata letaknya dibuat lapang dan hanya
 * berisi satu hal yang perlu dikerjakan.
 *
 * Tidak ada baris logo di dalam halaman, meski acuan desainnya memakai satu:
 * header situs sudah berdiri tetap di atas dengan mereknya sendiri, jadi logo
 * kedua tepat di bawahnya hanya menggandakan merek dengan tanda yang berbeda.
 *
 * Tingginya dikurangi tinggi header (h-16) supaya kolomnya mengisi satu layar
 * penuh tanpa celah, tetapi header dan footer tetap ada: pengunjung yang belum
 * siap punya akun harus bisa kembali menjelajah landing page tanpa menekan
 * tombol mundur peramban.
 *
 * Kolom foto baru muncul di layar lebar (lg). Di layar kecil ia disembunyikan,
 * bukan ditumpuk: formulir yang harus digulir dulu sebelum sampai ke tombol
 * masuk adalah formulir yang gagal.
 */
export default function MasukPage() {
  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:p-10">
        <div className="w-full max-w-xs">
          <LoginForm />
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/images/kos-4.jpg"
          alt="Kamar kos: tempat tidur dengan selimut kelabu, lemari kayu, dan lantai parket."
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
    </div>
  )
}
