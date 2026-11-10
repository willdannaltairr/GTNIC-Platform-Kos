'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { Bintang } from '@/components/ulasan/bintang'
import {
  fetchAntreanUlasan,
  moderasiUlasan,
  type KeputusanModerasi,
  type Ulasan,
  type UlasanStatus,
} from '@/lib/reviews'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Moderasi ulasan oleh admin.
 *
 * Satu halaman memuat seluruh ulasan platform dengan penyaring status, bukan
 * hanya antrean yang menunggu: admin perlu bisa memeriksa ulasan yang sudah
 * tayang juga, misalnya setelah ada keberatan dari pemilik, dan memisahkannya
 * ke halaman lain hanya menambah satu tempat yang harus dibuka.
 *
 * Alasan diwajibkan untuk penolakan dan penyembunyian, dan diketik di tempat
 * sebelum tombolnya bekerja. Tanpa alasan, penulisnya melihat ulasannya hilang
 * tanpa pernah tahu bagian mana yang tidak boleh, dan akan menulis hal yang
 * sama lagi. Server tetap menolak yang tanpa alasan, jadi aturannya ditegakkan
 * di dua tempat dengan sengaja.
 */

const TAB: { label: string; status?: UlasanStatus }[] = [
  { label: 'Menunggu tinjauan', status: 'PENDING_MODERATION' },
  { label: 'Tayang', status: 'APPROVED' },
  { label: 'Ditolak', status: 'REJECTED' },
  { label: 'Disembunyikan', status: 'HIDDEN' },
  { label: 'Semua' },
]

export default function AdminUlasanPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<Ulasan[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [catatan, setCatatan] = useState<Record<string, string>>({})

  const admin = user?.role === 'ADMIN'

  const muat = useCallback(async (statusFilter?: UlasanStatus): Promise<void> => {
    setDaftar(await fetchAntreanUlasan(statusFilter))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || user.role !== 'ADMIN') {
      setSiap(true)
      return
    }

    void fetchAntreanUlasan(TAB[tab].status).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  const putuskan = async (id: string, keputusan: KeputusanModerasi): Promise<void> => {
    const alasan = (catatan[id] ?? '').trim()

    if (keputusan !== 'APPROVED' && alasan.length < 10) {
      setPesan('Alasan minimal 10 karakter, supaya penulisnya tahu apa yang perlu diperbaiki.')
      return
    }

    setSibuk(id)
    setPesan(null)

    try {
      await moderasiUlasan(id, { status: keputusan, notes: alasan || undefined })
      await muat(TAB[tab].status)
      setCatatan((lama) => ({ ...lama, [id]: '' }))
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Keputusan tidak tersimpan')
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk meninjau ulasan</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Halaman ini untuk admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Akun Anda bukan admin platform. Ulasan yang Anda tulis sendiri ada di halaman Ulasan saya.
        </p>
        <Link
          href="/ulasan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buka ulasan saya
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Moderasi ulasan</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ulasan tayang di halaman kos setelah disetujui. Yang ditolak dan disembunyikan wajib
            disertai alasan, dan alasannya dikirim ke penulisnya.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Panel admin
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {TAB.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setTab(index)}
            aria-pressed={tab === index}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      <div className="mt-6">
        <Panel title="Daftar ulasan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Ulasan belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>Tidak ada ulasan pada filter ini.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.propertySlug ? (
                        <Link
                          href={`/kos/${item.propertySlug}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.propertyName ?? 'Kos'}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold">{item.propertyName ?? 'Kos'}</p>
                      )}

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.tenantName} · {formatTanggal(item.createdAt)}
                        {item.bookingCode ? ` · ${item.bookingCode}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Bintang nilai={item.rating} ukuran="sm" sertakanAngka />
                      {item.status && <StatusBadge status={item.status} jenis="ulasan" />}
                    </div>
                  </div>

                  {item.content && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.content}
                    </p>
                  )}

                  {[
                    ['Kebersihan', item.cleanlinessRating],
                    ['Lokasi', item.locationRating],
                    ['Fasilitas', item.facilitiesRating],
                    ['Layanan pemilik', item.ownerServiceRating],
                  ].some(([, nilai]) => nilai != null) && (
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {(
                        [
                          ['Kebersihan', item.cleanlinessRating],
                          ['Lokasi', item.locationRating],
                          ['Fasilitas', item.facilitiesRating],
                          ['Layanan pemilik', item.ownerServiceRating],
                        ] as const
                      ).map(([label, nilai]) =>
                        nilai == null ? null : (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd>
                              <Bintang nilai={nilai} ukuran="sm" sertakanAngka />
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  )}

                  {item.moderationNotes && (
                    <p className="mt-3 rounded-xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                      Catatan keputusan{item.moderatedByName ? ` oleh ${item.moderatedByName}` : ''}:{' '}
                      {item.moderationNotes}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => putuskan(item.id, 'APPROVED')}
                        disabled={sibuk === item.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
                      >
                        {sibuk === item.id && (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        )}
                        Setujui dan tayangkan
                      </button>
                    )}

                    {item.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => putuskan(item.id, 'REJECTED')}
                        disabled={sibuk === item.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                      >
                        Tolak
                      </button>
                    )}

                    {item.status !== 'HIDDEN' && (
                      <button
                        type="button"
                        onClick={() => putuskan(item.id, 'HIDDEN')}
                        disabled={sibuk === item.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        Sembunyikan
                      </button>
                    )}
                  </div>

                  {/* Kolom alasan ditampilkan untuk keputusan yang memerlukannya.
                      Menyembunyikannya sampai tombolnya ditekan berarti admin
                      menemukan kewajibannya setelah menekan, bukan sebelumnya. */}
                  <label className="mt-2 block">
                    <span className="text-xs font-medium">
                      Alasan untuk penolakan atau penyembunyian, minimal 10 karakter
                    </span>
                    <input
                      value={catatan[item.id] ?? ''}
                      onChange={(event) =>
                        setCatatan((lama) => ({ ...lama, [item.id]: event.target.value }))
                      }
                      maxLength={1000}
                      placeholder="Mis. menyebut nama orang dan menuduh tanpa bukti yang bisa diperiksa"
                      className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Menyetujui ulasan tidak mengirim alasan; yang dikirim ke penulisnya hanya keputusan dan
        alasan penolakan atau penyembunyian.
      </p>
    </div>
  )
}
