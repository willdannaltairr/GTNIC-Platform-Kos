'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/session/session-provider'

/**
 * Gerbang halaman aplikasi.
 *
 * Seluruh halaman di dalam platform menuntut akun: beranda, pencarian, alat,
 * panel pengguna, sampai halaman admin. Pengunjung yang belum masuk tidak
 * dibiarkan membuka isinya lalu memutuskan sendiri kapan hendak masuk. Begitu
 * keadaannya terbaca tamu, ia diarahkan ke halaman masuk.
 *
 * Pemeriksaannya di sisi klien, bukan di middleware yang membaca cookie,
 * dengan alasan yang sama seperti gerbang landing page: cookie sesi bisa ada
 * tetapi sudah tidak berlaku, dan middleware yang hanya melihat keberadaannya
 * akan memperlakukan tamu bertoken basi sebagai pengunjung yang sudah masuk,
 * halaman pun terbuka tanpa isi dan tanpa penjelasan. SessionProvider sudah
 * memvalidasi sesi ke API, jadi keputusan di sini berdasar keadaan sebenarnya.
 *
 * Keputusannya diambil sekali, saat halaman dibuka. Sesi yang berakhir di
 * tengah pemakaian, yaitu ketika pengunjung menekan Keluar, bukan urusan
 * gerbang ini: tombolnya sendiri yang mengantar ke landing page, sedangkan
 * gerbang yang ikut mengalihkan hanya akan menyerobot pengunjung itu ke
 * halaman masuk, padahal ia sengaja keluar. Karena itu gerbang mengalihkan
 * hanya bila halaman ini memang dibuka tanpa sesi sejak awal.
 *
 * Isi halaman tidak digambar sebelum keadaannya pasti. Menampilkan halaman
 * yang menuntut akun lalu menariknya kembali sepersekian detik kemudian membuat
 * pengunjung sempat melihat isi yang bukan untuknya, dan itu terbaca sebagai
 * halaman yang rusak. Selama pemeriksaan, yang tampil kerangka abu-abu seperti
 * yang sudah dipakai halaman-halaman ini saat memuat datanya.
 *
 * Pemeriksaan yang gagal, misalnya API tidak terjangkau, berakhir sebagai tamu
 * dan bukan sebagai pengunjung yang masuk: halaman berisi data akun tidak
 * boleh terbuka hanya karena servernya tidak bisa dihubungi.
 */
export function PenjagaSesi({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  /** Sesi pernah terbaca aktif di halaman ini, jadi tamunya bukan tamu baru. */
  const pernahMasuk = useRef(false)
  /** Satu pengalihan per halaman, agar tidak menumpuk tiap status berubah. */
  const sudahDialihkan = useRef(false)

  useEffect(() => {
    if (status === 'masuk') {
      pernahMasuk.current = true
      return
    }

    if (status !== 'tamu' || pernahMasuk.current || sudahDialihkan.current) return

    sudahDialihkan.current = true

    // Halaman yang baru saja ditolak ikut dibawa ke halaman masuk, supaya
    // pengunjung yang membuka tautan dalam, misalnya tautan kos yang dibagikan,
    // kembali ke halaman itu sesudah masuk alih-alih kehilangan tautannya.
    // Dibaca dari `window`, bukan `useSearchParams`: hook itu menyeret setiap
    // halaman di dalam gerbang ini menjadi dirender saat permintaan, padahal
    // daftar properti dan halaman alat masih bisa disiapkan lebih dulu.
    const dituju = `${window.location.pathname}${window.location.search}`

    // `replace`, bukan `push`: halaman yang menolak pengunjung ini tidak perlu
    // tersimpan di riwayat, sebab tombol kembali hanya akan memantulkannya ke
    // sini lagi.
    router.replace(`/masuk?lanjut=${encodeURIComponent(dituju)}`)
  }, [status, router])

  if (status !== 'masuk') {
    return (
      <div
        aria-busy="true"
        className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      >
        <span className="sr-only">Memeriksa sesi Anda</span>
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  return <>{children}</>
}
