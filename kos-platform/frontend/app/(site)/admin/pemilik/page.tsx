'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Search } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { fetchPemilikAdmin, type PemilikAdmin } from '@/lib/owner-verification'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Verifikasi pemilik kos di panel admin.
 *
 * Daftarnya memuat seluruh pemilik, bukan hanya yang menunggu, dengan
 * penyaring status. Admin perlu memeriksa pemilik yang sudah terverifikasi
 * juga, misalnya ketika ada laporan, dan memisahkannya ke halaman lain hanya
 * menambah satu tempat yang harus dibuka.
 *
 * Yang menunggu keputusan tampil lebih dulu, dan urutan itu datang dari server:
 * menyortirnya lagi di sini hanya akan menghasilkan dua urutan yang berbeda
 * antara halaman pertama dan halaman berikutnya.
 */

const TAB: { label: string; status?: string }[] = [
  { label: 'Menunggu tinjauan', status: 'UNDER_REVIEW' },
  { label: 'Ditolak', status: 'REJECTED' },
  { label: 'Belum diajukan', status: 'NOT_SUBMITTED' },
  { label: 'Terverifikasi', status: 'VERIFIED' },
  { label: 'Semua' },
]

export default function AdminPemilikPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [cari, setCari] = useState('')
  const [kataKunci, setKataKunci] = useState('')
  const [daftar, setDaftar] = useState<PemilikAdmin[] | null>(null)
  const [siap, setSiap] = useState(false)

  const admin = user?.role === 'ADMIN'

  const muat = useCallback(async (statusFilter?: string, q?: string): Promise<void> => {
    setDaftar(await fetchPemilikAdmin({ status: statusFilter, q }))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || user.role !== 'ADMIN') {
      setSiap(true)
      return
    }

    void fetchPemilikAdmin({
      status: TAB[tab].status,
      q: kataKunci.trim() || undefined,
    }).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab, kataKunci])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk meninjau pemilik</h1>
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
        <Link
          href="/admin"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke panel admin
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header>
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Verifikasi pemilik</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dokumen identitas pemilik kos yang mengajukan verifikasi, menunggu keputusan Anda.
        </p>
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

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setKataKunci(cari)
        }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 sm:max-w-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Cari nama atau email pemilik</span>
          <input
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Nama atau email pemilik..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Cari
        </button>
      </form>

      <div className="mt-6">
        <Panel title="Daftar pemilik" description="Yang menunggu keputusan tampil lebih dulu.">
          {daftar === null ? (
            <EmptyRow>Daftar pemilik belum bisa dimuat. Pastikan server API berjalan.</EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>Tidak ada pemilik pada saringan ini.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.fullName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.email}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.totalDocuments} dokumen
                        {item.businessName ? ` · ${item.businessName}` : ''}
                        {item.phoneNumber ? ` · ${item.phoneNumber}` : ''}
                      </p>
                      {item.verifiedAt && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">
                          Terverifikasi {formatTanggal(item.verifiedAt)}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={item.status} jenis="pemilik" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/pemilik/${item.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Periksa dokumen
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        <button
          type="button"
          onClick={() => void muat(TAB[tab].status, kataKunci.trim() || undefined)}
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary-strong"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Muat ulang daftar
        </button>
      </p>
    </div>
  )
}
