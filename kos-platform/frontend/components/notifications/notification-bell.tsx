'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { fetchNotifications } from '@/lib/notifications'

/**
 * Lonceng notifikasi di navbar.
 *
 * Angkanya diambil dari meta daftar notifikasi, yang menghitung seluruh akun
 * dan bukan hanya halaman yang sedang tampil. Kalau dihitung dari daftar yang
 * tampil, angkanya akan berubah setiap kali halaman berganti tanpa ada
 * notifikasi baru.
 *
 * Tidak ada penyegaran berkala. Satu permintaan setiap kali halaman dimuat
 * cukup untuk keperluan sekarang, dan lonceng yang menembak API terus-menerus
 * hanya menambah beban tanpa membuat notifikasinya lebih cepat sampai.
 */
export function NotificationBell() {
  const { status } = useSession()
  const [belum, setBelum] = useState(0)

  useEffect(() => {
    let aktif = true

    if (status !== 'masuk') {
      setBelum(0)
      return
    }

    void fetchNotifications({ belumDibaca: true, limit: 1 }).then((hasil) => {
      if (aktif && hasil) setBelum(hasil.meta.belumDibaca)
    })

    return () => {
      aktif = false
    }
  }, [status])

  if (status !== 'masuk') return null

  const label = belum > 0 ? `Notifikasi, ${belum} belum dibaca` : 'Notifikasi'

  return (
    <Link
      href="/notifikasi"
      aria-label={label}
      title={label}
      className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell className="size-4" aria-hidden="true" />

      {belum > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">
          {belum > 9 ? '9+' : belum}
        </span>
      )}
    </Link>
  )
}
