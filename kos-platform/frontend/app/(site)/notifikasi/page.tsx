'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCheck, Loader2, Trash2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel } from '@/components/dashboard/kit'
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notifikasi,
} from '@/lib/notifications'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Halaman notifikasi.
 *
 * Menandai sudah dibaca terjadi saat notifikasi dibuka, bukan saat halaman
 * dimuat. Menandai semuanya hanya karena halaman ini pernah dibuka berarti
 * pengunjung kehilangan tanda pada hal yang belum sempat ia baca.
 */
export default function NotifikasiPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<Notifikasi[] | null>(null)
  const [belum, setBelum] = useState(0)
  const [sibuk, setSibuk] = useState(false)
  const [siap, setSiap] = useState(false)

  const muat = async (): Promise<void> => {
    const hasil = await fetchNotifications()
    setDaftar(hasil?.items ?? null)
    setBelum(hasil?.meta.belumDibaca ?? 0)
  }

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchNotifications().then((hasil) => {
      if (!aktif) return
      setDaftar(hasil?.items ?? null)
      setBelum(hasil?.meta.belumDibaca ?? 0)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const bacaSemua = async (): Promise<void> => {
    setSibuk(true)
    await markAllNotificationsRead()
    await muat()
    setSibuk(false)
  }

  const buka = async (item: Notifikasi): Promise<void> => {
    if (item.isRead) return

    await markNotificationRead(item.id)
    await muat()
  }

  const hapus = async (item: Notifikasi): Promise<void> => {
    await deleteNotification(item.id)
    await muat()
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk melihat notifikasi</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pemberitahuan tentang booking, tagihan, dan perbaikan dikirim ke akun Anda.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifikasi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {belum > 0 ? `${belum} pemberitahuan belum dibaca.` : 'Semua pemberitahuan sudah dibaca.'}
          </p>
        </div>

        {belum > 0 && (
          <button
            type="button"
            onClick={bacaSemua}
            disabled={sibuk}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            {sibuk ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck className="size-4" aria-hidden="true" />
            )}
            Tandai semua dibaca
          </button>
        )}
      </header>

      <div className="mt-6">
        <Panel title="Pemberitahuan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Notifikasi belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              Belum ada pemberitahuan. Notifikasi muncul di sini saat booking, tagihan, atau laporan
              perbaikan Anda berubah.
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      item.isRead ? 'bg-transparent' : 'bg-primary',
                    )}
                  />

                  <button
                    type="button"
                    onClick={() => buka(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={cn(
                        'text-sm',
                        item.isRead ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground',
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatTanggal(item.createdAt)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => hapus(item)}
                    aria-label="Hapus notifikasi"
                    title="Hapus"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
