import type { Metadata } from 'next'

import Image from 'next/image'
import Link from 'next/link'
import { Logo } from '@/components/landing/logo'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Masuk',
  description:
    'Masuk ke KosPlatform untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.',
}

/**
 * Halaman masuk dua kolom: foto kamar di kiri, formulir di kanan.
 *
 * Halaman ini adalah pintu masuk seluruh situs — semua tautan yang meninggalkan
 * landing page mendarat di sini — jadi tata letaknya dibuat lapang dan hanya
 * berisi satu hal yang perlu dikerjakan.
 *
 * Grup (auth) tidak memasang header maupun footer situs, dan tingginya dikunci
 * ke layar: navigasi ke halaman lain di tengah pengisian formulir hanya
 * mengalihkan pandangan, dan halaman yang tidak ikut tergulir membuat isinya
 * tetap di tempat. Logo di atas formulir menggantikan keduanya sebagai jalan
 * kembali ke beranda.
 *
 * Kolom foto baru muncul di layar lebar (lg). Di layar kecil ia disembunyikan,
 * bukan ditumpuk: formulir yang harus digulir dulu sebelum sampai ke tombol
 * masuk adalah formulir yang gagal.
 *
 * Kolom formulir diberi `overflow-y-auto`, bukan dipotong mati: pada layar
 * pendek isinya lebih tinggi daripada layar, dan tanpa itu tombol Masuk beserta
 * kartu akun demo ada di luar jangkauan sama sekali. Di layar normal cadangan
 * ini tidak pernah aktif — tidak ada bilah gulir yang muncul.
 */
export default function MasukPage() {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-2">
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

      <div className="flex flex-col overflow-y-auto px-4 py-10 sm:px-6 lg:p-10">
        <Link
          href="/"
          aria-label="KosPlatform — beranda"
          className="inline-flex self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <div className="m-auto w-full max-w-xs">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
