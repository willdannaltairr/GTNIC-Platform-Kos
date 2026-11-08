'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { fetchPenggunaAdmin, ubahStatusPengguna, type PenggunaAdmin } from '@/lib/admin'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Pengelolaan pengguna oleh admin.
 *
 * Pencarian dikirim ke server, bukan disaring di peramban: daftar pengguna
 * sebuah platform tidak akan pernah muat seluruhnya di satu halaman, dan
 * menyaring di sisi klien berarti hanya mencari di antara baris yang kebetulan
 * sedang tampil.
 *
 * Kata sandi tidak pernah tampil di sini, dan tidak ada tombol untuk
 * mengubahnya. Admin yang bisa menetapkan kata sandi orang lain adalah jalan
 * masuk yang tidak perlu ke setiap akun.
 */

const TAB: { label: string; role?: string; status?: string }[] = [
  { label: 'Semua' },
  { label: 'Pencari kos', role: 'TENANT' },
  { label: 'Pemilik kos', role: 'OWNER' },
  { label: 'Diblokir', status: 'BANNED' },
  { label: 'Ditangguhkan', status: 'SUSPENDED' },
]

export default function AdminPenggunaPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [cari, setCari] = useState('')
  const [kataKunci, setKataKunci] = useState('')
  const [daftar, setDaftar] = useState<PenggunaAdmin[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [ubah, setUbah] = useState<string | null>(null)
  const [alasan, setAlasan] = useState('')

  const admin = user?.role === 'ADMIN'

  const muat = useCallback(async (index: number, q: string): Promise<void> => {
    setDaftar(
      await fetchPenggunaAdmin({
        role: TAB[index].role,
        status: TAB[index].status,
        q: q.trim() || undefined,
      }),
    )
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || user.role !== 'ADMIN') {
      setSiap(true)
      return
    }

    void fetchPenggunaAdmin({
      role: TAB[tab].role,
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

  const tetapkan = async (
    id: string,
    ke: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
    reason: string,
  ): Promise<void> => {
    setSibuk(id)
    setPesan(null)

    try {
      await ubahStatusPengguna(id, ke, reason)
      await muat(tab, kataKunci)
      setUbah(null)
      setAlasan('')
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Status akun tidak berubah')
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
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk mengelola pengguna</h1>
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pengguna</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun pencari kos dan pemilik kos di platform. Setiap perubahan status wajib beralasan dan
          tercatat.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setKataKunci(cari)
        }}
        className="mt-6 flex gap-2"
      >
        <label className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">Cari pengguna</span>
          <input
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Cari nama atau email"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Cari
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
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
        <Panel title="Daftar pengguna" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>Daftar pengguna belum bisa dimuat. Pastikan server API berjalan.</EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>Tidak ada pengguna pada saringan ini.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.fullName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.email}
                        {item.phoneNumber ? ` · ${item.phoneNumber}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Terdaftar {formatTanggal(item.createdAt)}
                        {item.lastLoginAt
                          ? ` · masuk terakhir ${formatTanggal(item.lastLoginAt)}`
                          : ' · belum pernah masuk'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.role} jenis="peran" />
                      <StatusBadge status={item.accountStatus} jenis="akun" />
                    </div>
                  </div>

                  {/* Akun admin tidak punya tombol apa pun di sini: server
                      memang menolaknya, dan menampilkan tombol yang pasti
                      gagal hanya membuat admin mengira ada jalan yang salah
                      tempel. */}
                  {item.role !== 'ADMIN' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.accountStatus !== 'ACTIVE' && (
                        <Tombol
                          onClick={() => tetapkan(item.id, 'ACTIVE', 'Dipulihkan oleh admin')}
                          sibuk={sibuk === item.id}
                          utama
                        >
                          Aktifkan
                        </Tombol>
                      )}

                      {item.accountStatus === 'ACTIVE' && (
                        <Tombol
                          onClick={() => {
                            setUbah(ubah === item.id ? null : item.id)
                            setAlasan('')
                          }}
                          sibuk={sibuk === item.id}
                        >
                          Ubah status
                        </Tombol>
                      )}
                    </div>
                  )}

                  {ubah === item.id && (
                    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                      <label className="block">
                        <span className="text-xs font-medium">Alasan, minimal 5 karakter</span>
                        <input
                          value={alasan}
                          onChange={(event) => setAlasan(event.target.value)}
                          maxLength={500}
                          placeholder="Mis. Laporan berulang dari penghuni lain"
                          className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </label>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Tombol
                          onClick={() => tetapkan(item.id, 'SUSPENDED', alasan.trim())}
                          sibuk={sibuk === item.id}
                          mati={alasan.trim().length < 5}
                        >
                          Tangguhkan
                        </Tombol>
                        <Tombol
                          onClick={() => tetapkan(item.id, 'BANNED', alasan.trim())}
                          sibuk={sibuk === item.id}
                          mati={alasan.trim().length < 5}
                        >
                          Blokir
                        </Tombol>
                        <Tombol onClick={() => setUbah(null)} sibuk={false}>
                          Batal
                        </Tombol>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Akun yang diblokir tidak bisa masuk sama sekali. Penangguhan masih bisa
                        dipulihkan tanpa menghubungi platform.
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
