import type { ReactNode } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Logo } from '@/components/landing/logo'

/** Kutipan yang tampil di kaki panel foto halaman akun. */
export interface AuthPanelQuote {
  text: string
  author: string
  role: string
  /** Keterangan kecil di bawah nama, mis. penanda bahwa kutipannya contoh. */
  note?: string
}

interface AuthShellProps {
  image: { src: string; alt: string }
  quote?: AuthPanelQuote
  formWidth?: string
  footer?: ReactNode
  children: ReactNode
}

/**
 * Inisial nama untuk bulatan penanda kutipan.
 *
 * Halaman akun tidak menyimpan foto orang, jadi nama yang dikutip ditandai
 * inisialnya, bukan wajah yang dikarang. Dua kata diambil huruf depannya,
 * selebihnya diabaikan supaya bulatannya tetap terbaca.
 */
const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

/**
 * Kerangka halaman autentikasi: formulir di kiri dan panel foto di kanan.
 *
 * Dipakai bersama halaman masuk, daftar, lupa sandi, sandi baru, dan
 * verifikasi email supaya kelimanya tidak bisa berbeda tata letak saat salah
 * satunya diubah. Tidak ada header maupun footer situs di sini, navigasi ke
 * halaman lain di tengah pengisian formulir hanya mengalihkan pandangan. Yang
 * tersedia hanya logo di atas dan tombol tutup di atas foto, keduanya menuju
 * beranda.
 *
 * Panel fotonya dibuat mengambang dengan sudut membulat di dalam bingkai
 * halaman, bukan menempel rapat ke tepi jendela: badan halaman yang lepas dari
 * tepi membuat formulir di sebelahnya terasa seperti lembar yang diletakkan di
 * atas halaman, bukan dinding yang menutupi layar.
 *
 * Kutipannya opsional dan hanya terlihat bersama panel foto di layar lebar.
 * Isinya berasal dari daftar yang sama dengan bagian testimoni landing, dan
 * yang mengirimnya tetap menandai bahwa kutipannya contoh dari data demo
 * platform; halaman akun tidak boleh jadi tempat pertama sebuah kutipan
 * kehilangan keterangan asalnya.
 *
 * Kolom formulirnya `overflow-y-auto` dan formulirnya ditengahkan dengan
 * `m-auto`, bukan `items-center`: pada layar pendek isinya lebih tinggi
 * daripada layar, dan perataan flex akan memotong bagian atasnya, bagian yang
 * tidak bisa dicapai dengan menggulir. `m-auto` menyusut jadi nol saat ruangnya
 * kurang, sehingga formulir selalu utuh dan tetap bisa dijangkau.
 *
 * Kolom foto baru muncul di layar lebar (lg). Di layar kecil ia disembunyikan,
 * bukan ditumpuk: formulir yang harus dibaca di atas foto yang ramai adalah
 * formulir yang lebih sering salah isi.
 */
export function AuthShell({ image, quote, formWidth = 'max-w-sm', footer, children }: AuthShellProps) {
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-2 lg:gap-4 lg:p-4">
      <div className="flex min-h-0 flex-col overflow-y-auto bg-background px-6 py-8 sm:px-10">
        <Link
          href="/"
          aria-label="HuniKos, beranda"
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

      <div className="relative hidden overflow-hidden lg:block lg:rounded-[2.25rem]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />

        {/* Lapisan gelap dari bawah. Kutipan dan namanya ditulis putih di atas
            foto yang bisa terang di mana saja, jadi kakinya perlu diberi warna
            yang cukup tenang sebelum teksnya diletakkan di sana. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/25 to-transparent"
        />

        {quote && (
          <figure className="absolute inset-x-0 bottom-0 p-10">
            <blockquote className="max-w-md text-lg leading-relaxed text-white">
              &ldquo;{quote.text}&rdquo;
            </blockquote>

            <figcaption className="mt-6 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/30"
              >
                {initials(quote.author)}
              </span>

              <span className="leading-snug">
                <span className="block text-sm font-semibold text-white">{quote.author}</span>
                <span className="block text-xs text-white/70">{quote.role}</span>
              </span>
            </figcaption>

            {quote.note && <p className="mt-4 text-[11px] text-white/55">{quote.note}</p>}
          </figure>
        )}

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
