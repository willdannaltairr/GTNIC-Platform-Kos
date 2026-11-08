'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/session/session-provider'

/**
 * Gerbang landing page.
 *
 * Landing page hanya untuk pengunjung yang belum punya akun. Begitu sesi
 * terbaca aktif, pengunjung dipindahkan ke beranda aplikasi, dan ke sanalah
 * mereka kembali setiap kali membuka alamat utama.
 *
 * Pemeriksaannya di sisi klien, bukan di middleware yang membaca cookie:
 * cookie sesi bisa ada tetapi sudah tidak berlaku, sehingga middleware akan
 * membuang pengunjung yang sebenarnya tamu ke beranda tanpa jalan kembali.
 * SessionProvider sudah memvalidasi sesi ke API, jadi keputusannya di sini
 * berdasar keadaan yang sebenarnya.
 */
export function LandingGate() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'masuk') router.replace('/beranda')
  }, [status, router])

  return null
}
