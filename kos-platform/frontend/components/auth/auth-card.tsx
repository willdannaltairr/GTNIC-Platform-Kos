import type { ReactNode } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { Logo } from '@/components/landing/logo'

interface AuthCardProps {
  image: { src: string; alt: string }
  formWidth?: string
  children: ReactNode
}

/**
 * Kerangka halaman autentikasi: satu kartu putih melayang di atas latar
 * sekunder, foto kamar di kolom kiri dan formulir di kolom kanan.
 *
 * Dipakai bersama oleh halaman masuk dan daftar supaya keduanya tidak bisa
 * berbeda tata letak saat salah satunya diubah. Logo di atas formulir
 * menggantikan header dan footer situs — keduanya sengaja tidak dipasang di
 * grup (auth) karena navigasi ke halaman lain di tengah pengisian formulir
 * hanya mengalihkan pandangan.
 *
 * Tinggi kartu dibatasi `max-h-full` dan kolom formulirnya diberi
 * `overflow-y-auto`: pada layar pendek isinya lebih tinggi daripada layar, dan
 * tanpa itu tombol simpan ada di luar jangkauan sama sekali. Di layar normal
 * cadangan ini tidak pernah aktif, jadi tidak ada bilah gulir yang muncul.
 *
 * Baris gridnya `minmax(0, 1fr)`, bukan `auto`: tanpa itu kolom formulir tidak
 * boleh menyusut lebih pendek daripada isinya, sehingga batas tinggi tadi tidak
 * berpengaruh dan kartunya menembus keluar layar.
 *
 * Paddingnya dijaga kecil dan jarak antarunsurnya rapat: formulir pendaftaran
 * punya dua pilihan peran, tiga isian, dan satu catatan, sehingga pada laptop
 * pendek ia sempat lebih tinggi daripada kartunya. Semakin ramping susunannya,
 * semakin banyak ukuran layar yang menampilkannya utuh tanpa perlu digulir.
 */
export function AuthCard({ image, formWidth = 'max-w-sm', children }: AuthCardProps) {
  return (
    <div className="grid flex-1 place-items-center overflow-hidden bg-secondary p-4 sm:p-6">
      <div className="grid max-h-full w-full max-w-5xl grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[2rem] bg-card shadow-[0_40px_90px_-55px_rgba(11,36,20,0.55)] ring-1 ring-black/5 lg:grid-cols-2">
        <div className="relative hidden bg-muted lg:block">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto p-6 sm:p-8">
          <Link
            href="/"
            aria-label="KosPlatform — beranda"
            className="inline-flex self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>

          <div className={`m-auto w-full ${formWidth}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}
