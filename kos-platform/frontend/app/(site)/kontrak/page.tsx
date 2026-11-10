'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchKontrak,
  ubahStatusKontrak,
  type ContractStatus,
  type Kontrak,
} from '@/lib/contracts'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Daftar kontrak sewa.
 *
 * Isinya ditentukan peran di backend: penghuni menerima kontraknya sendiri,
 * pemilik menerima kontrak propertinya. Halaman ini tidak memilih sumber data.
 *
 * Kontrak lahir dari booking yang sudah dikonfirmasi, jadi properti yang belum
 * punya kontrak tidak muncul di sini; yang menautkan keduanya adalah halaman
 * pengajuan sewa, tempat tombol "Buat kontrak" berada.
 */

const TAB: { label: string; status?: ContractStatus }[] = [
  { label: 'Semua' },
  { label: 'Draf', status: 'DRAFT' },
  { label: 'Menunggu tanda tangan', status: 'PENDING_SIGNATURE' },
  { label: 'Aktif', status: 'ACTIVE' },
  { label: 'Selesai', status: 'COMPLETED' },
]

export default function KontrakPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<Kontrak[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = useCallback(async (statusFilter?: ContractStatus): Promise<void> => {
    setDaftar(await fetchKontrak(statusFilter))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchKontrak(TAB[tab].status).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  const jalankan = async (id: string, aksi: () => Promise<unknown>): Promise<void> => {
    setSibuk(id)
    setPesan(null)

    try {
      await aksi()
      await muat(TAB[tab].status)
    } catch (error) {
      // Pesan server menyebut sebabnya (mis. perpindahan status yang tidak
      // diizinkan untuk peran ini), dan itu yang perlu dibaca penggunanya.
      setPesan(error instanceof Error ? error.message : 'Status tidak berubah')
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk melihat kontrak</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kontrak sewa terikat ke akun kedua pihaknya, jadi riwayatnya hanya bisa dibuka setelah
          masuk.
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

  const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header>
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
          {pemilik ? 'Kontrak sewa' : 'Kontrak saya'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pemilik
            ? 'Kesepakatan sewa properti Anda, dari draf sampai berakhir.'
            : 'Kesepakatan sewa yang berlaku untuk Anda, beserta tagihannya.'}
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
        <Panel title="Daftar kontrak" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Kontrak belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              {pemilik
                ? 'Belum ada kontrak. Kontrak dibuat dari pengajuan sewa yang sudah dikonfirmasi.'
                : 'Belum ada kontrak pada filter ini.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/kontrak/${item.id}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.propertyName} · kamar {item.roomNumber}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.contractNumber}
                        {pemilik ? ` · ${item.tenantName}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTanggal(item.startDate)}
                        {item.endDate ? ` sampai ${formatTanggal(item.endDate)}` : ''} ·{' '}
                        {formatRupiah(item.monthlyRent)}/bulan
                      </p>
                    </div>

                    <StatusBadge status={item.status} jenis="kontrak" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Aksi href={`/kontrak/${item.id}`}>Lihat detail</Aksi>

                    {pemilik && item.status === 'DRAFT' && (
                      <Tombol
                        utama
                        sibuk={sibuk === item.id}
                        onClick={() => jalankan(item.id, () => ubahStatusKontrak(item.id, 'PENDING_SIGNATURE'))}
                      >
                        Minta tanda tangan
                      </Tombol>
                    )}

                    {!pemilik && item.status === 'PENDING_SIGNATURE' && (
                      <Tombol
                        utama
                        sibuk={sibuk === item.id}
                        onClick={() => jalankan(item.id, () => ubahStatusKontrak(item.id, 'ACTIVE'))}
                      >
                        Tandatangani
                      </Tombol>
                    )}

                    {pemilik && item.status === 'ACTIVE' && (
                      <Tombol
                        sibuk={sibuk === item.id}
                        onClick={() => jalankan(item.id, () => ubahStatusKontrak(item.id, 'COMPLETED'))}
                      >
                        Tandai selesai
                      </Tombol>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {pemilik && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Kontrak dibuat dari halaman pengajuan sewa yang sudah dikonfirmasi, bukan dari sini:{' '}
          <Link href="/booking" className="font-medium text-primary hover:text-primary-strong">
            buka pengajuan sewa
          </Link>
          .
        </p>
      )}
    </div>
  )
}

function Aksi({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  )
}

function Tombol({
  children,
  onClick,
  sibuk,
  utama = false,
}: {
  children: React.ReactNode
  onClick: () => void
  sibuk: boolean
  utama?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sibuk}
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
