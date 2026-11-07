import type { ReactNode } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Logo } from '@/components/landing/logo'

interface AuthShellProps {
  image: { src: string; alt: string }
  formWidth?: string
  footer?: ReactNode
  children: ReactNode
}

/**
 * Kerangka halaman autentikasi: dua kolom penuh, formulir di kiri dan foto
 * mengisi kolom kanan.
 *
 * Dipakai bersama halaman masuk dan daftar supaya keduanya tidak bisa berbeda
 * tata letak saat salah satunya diubah. Tidak ada header maupun footer situs di
 * sini — navigasi ke halaman lain di tengah pengisian formulir hanya
 * mengalihkan pandangan. Yang tersedia hanya logo di atas dan tombol tutup di
 * atas foto, keduanya menuju beranda.
 *
 * Kolom formulirnya `overflow-y-auto` dan formulirnya ditengahkan dengan
 * `m-auto`, bukan `items-center`: pada layar pendek isinya lebih tinggi
 * daripada layar, dan perataan flex akan memotong bagian atasnya — bagian yang
 * tidak bisa dicapai dengan menggulir. `m-auto` menyusut jadi nol saat ruangnya
 * kurang, sehingga formulir selalu utuh dan tetap bisa dijangkau.
 *
 * Kolom foto baru muncul di layar lebar (lg). Di layar kecil ia disembunyikan,
 * bukan ditumpuk: formulir yang harus dibaca di atas foto yang ramai adalah
 * formulir yang lebih sering salah isi.
 */
export function AuthShell({ image, formWidth = 'max-w-sm', footer, children }: AuthShellProps) {
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col overflow-y-auto bg-background px-6 py-8 sm:px-10">
        <Link
          href="/"
          aria-label="KosPlatform — beranda"
          className="inline-flex shrink-0 self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <div className={`m-auto w-full py-8 ${formWidth}`}>{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs leading-relaxed">
            {footer}
          </div>
        )}
      </div>

      <div className="relative hidden lg:block">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />

        <Link
          href="/"
          aria-label="Tutup dan kembali ke beranda"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-forest/45 text-white backdrop-blur-md transition-colors hover:bg-forest/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
