'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchPropertiAdmin,
  verifikasiProperti,
  type PropertiAdmin,
} from '@/lib/admin'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Peninjauan properti oleh admin.
 *
 * Satu halaman memuat seluruh properti platform, bukan hanya yang menunggu,
 * dengan penyaring status. Admin perlu bisa memeriksa properti yang sudah
 * terverifikasi juga, misalnya ketika ada laporan, dan memisahkannya ke
 * halaman lain hanya menambah satu tempat yang harus dibuka.
 *
 * Penolakan meminta catatan lebih dulu di tempat. Tanpa catatan, pemiliknya
 * tidak tahu apa yang harus diperbaiki dan akan mengajukan ulang dengan isi
 * yang sama. Server tetap menolak penolakan tanpa catatan, jadi aturannya
 * ditegakkan di dua tempat dengan sengaja.
 */

const TAB: { label: string; status?: string }[] = [
  { label: 'Menunggu tinjauan', status: 'UNDER_REVIEW' },
  { label: 'Belum diajukan', status: 'PENDING' },
  { label: 'Terverifikasi', status: 'VERIFIED' },
  { label: 'Ditolak', status: 'REJECTED' },
  { label: 'Ditangguhkan', status: 'SUSPENDED' },
  { label: 'Semua' },
]

export default function AdminPropertiPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<PropertiAdmin[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [menolak, setMenolak] = useState<string | null>(null)
  const [catatan, setCatatan] = useState('')

  const admin = user?.role === 'ADMIN'

  const muat = useCallback(async (statusFilter?: string): Promise<void> => {
    setDaftar(await fetchPropertiAdmin({ status: statusFilter }))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || user.role !== 'ADMIN') {
      setSiap(true)
      return
    }

    void fetchPropertiAdmin({ status: TAB[tab].status }).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  const tetapkan = async (
    id: string,
    ke: 'VERIFIED' | 'UNDER_REVIEW' | 'REJECTED' | 'SUSPENDED',
    notes?: string,
  ): Promise<void> => {
    setSibuk(id)
    setPesan(null)

    try {
      await verifikasiProperti(id, ke, notes)
      await muat(TAB[tab].status)
      setMenolak(null)
      setCatatan('')
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Status verifikasi tidak berubah')
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk meninjau properti</h1>
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
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Halaman ini untuk admin</h1>
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Moderasi properti</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Properti yang diajukan pemilik menunggu keputusan Anda sebelum bisa terbit di pencarian.
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

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      <div className="mt-6">
        <Panel title="Daftar properti" description="Yang menunggu tinjauan tampil lebih dulu.">
          {daftar === null ? (
            <EmptyRow>Daftar properti belum bisa dimuat. Pastikan server API berjalan.</EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>Tidak ada properti pada saringan ini.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.district}, {item.city} · {item.ownerName} ({item.ownerEmail})
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.totalRooms} kamar · didaftarkan {formatTanggal(item.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.verificationStatus} jenis="verifikasi" />
                      <StatusBadge status={item.publicationStatus} jenis="publikasi" />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/kos/${item.slug}`}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Lihat halaman kos
                    </Link>

                    {item.verificationStatus !== 'VERIFIED' && (
                      <Tombol
                        onClick={() => tetapkan(item.id, 'VERIFIED')}
                        sibuk={sibuk === item.id}
                        utama
                      >
                        Setujui
                      </Tombol>
                    )}

                    {item.verificationStatus === 'PENDING' && (
                      <Tombol
                        onClick={() => tetapkan(item.id, 'UNDER_REVIEW')}
                        sibuk={sibuk === item.id}
                      >
                        Mulai tinjau
                      </Tombol>
                    )}

                    {item.verificationStatus !== 'REJECTED' && (
                      <Tombol
                        onClick={() => {
                          setMenolak(menolak === item.id ? null : item.id)
                          setCatatan('')
                        }}
                        sibuk={sibuk === item.id}
                      >
                        Tolak
                      </Tombol>
                    )}

                    {item.verificationStatus === 'VERIFIED' && (
                      <Tombol
                        onClick={() => tetapkan(item.id, 'SUSPENDED', 'Ditangguhkan oleh admin')}
                        sibuk={sibuk === item.id}
                      >
                        Tangguhkan
                      </Tombol>
                    )}
                  </div>

                  {menolak === item.id && (
                    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                      <label className="block">
                        <span className="text-xs font-medium">
                          Alasan penolakan, minimal 10 karakter
                        </span>
                        <textarea
                          value={catatan}
                          onChange={(event) => setCatatan(event.target.value)}
                          rows={3}
                          maxLength={1000}
                          placeholder="Mis. Alamat belum lengkap dan belum ada foto fasad."
                          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </label>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Tombol
                          onClick={() => tetapkan(item.id, 'REJECTED', catatan.trim())}
                          sibuk={sibuk === item.id}
                          utama
                          mati={catatan.trim().length < 10}
                        >
                          Kirim penolakan
                        </Tombol>
                        <Tombol onClick={() => setMenolak(null)} sibuk={false}>
                          Batal
                        </Tombol>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Catatan ini dibaca pemiliknya, jadi tuliskan apa yang perlu diperbaiki.
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Tombol({
  children,
  onClick,
  sibuk,
  utama = false,
  mati = false,
}: {
  children: React.ReactNode
  onClick: () => void
  sibuk: boolean
  utama?: boolean
  mati?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sibuk || mati}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-60',
        utama
          ? 'bg-primary text-primary-foreground hover:bg-primary-strong'
          : 'border border-border hover:bg-muted',
      )}
    >
      {sibuk && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
