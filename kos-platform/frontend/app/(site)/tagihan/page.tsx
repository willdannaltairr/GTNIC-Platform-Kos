'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatCard, StatusBadge } from '@/components/dashboard/kit'
import { fetchTagihan, kirimTagihan, type InvoiceStatus, type Tagihan } from '@/lib/invoices'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Daftar tagihan sewa.
 *
 * Satu halaman untuk dua peran, dengan penekanan yang berbeda: penghuni
 * membukanya untuk tahu apa yang harus dibayar dan sampai kapan, pemilik
 * membukanya untuk tahu uang mana yang belum masuk. Karena itu ringkasan
 * angkanya hanya ditampilkan pada pemilik, dan tombol kirim hanya muncul di
 * baris draf miliknya.
 *
 * Ringkasan uangnya datang dari `meta`, yang menghitung seluruh tagihan
 * pengguna ini, bukan hanya halaman yang sedang tampil.
 */

const TAB: { label: string; status?: InvoiceStatus }[] = [
  { label: 'Semua' },
  { label: 'Belum dibayar', status: 'UNPAID' },
  { label: 'Dibayar sebagian', status: 'PARTIALLY_PAID' },
  { label: 'Lunas', status: 'PAID' },
  { label: 'Draf', status: 'DRAFT' },
  { label: 'Dibatalkan', status: 'CANCELLED' },
]

export default function TagihanPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<Tagihan[] | null>(null)
  const [ringkas, setRingkas] = useState({ belum: 0, terbayar: 0 })
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = useCallback(
    async (statusFilter?: InvoiceStatus): Promise<void> => {
      const hasil = await fetchTagihan({ status: statusFilter })
      setDaftar(hasil?.items ?? null)

      if (hasil) {
        setRingkas({
          belum: hasil.meta.totalBelumDibayar,
          terbayar: hasil.meta.totalTerbayar,
        })
      }
    },
    [],
  )

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchTagihan({ status: TAB[tab].status }).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil?.items ?? null)
      if (hasil) {
        setRingkas({
          belum: hasil.meta.totalBelumDibayar,
          terbayar: hasil.meta.totalTerbayar,
        })
      }
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  const kirim = async (id: string): Promise<void> => {
    setSibuk(id)
    setPesan(null)

    try {
      await kirimTagihan(id)
      await muat(TAB[tab].status)
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Tagihan tidak terkirim')
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk melihat tagihan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tagihan terikat ke akun penyewanya, jadi hanya bisa dibuka setelah masuk.
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {pemilik ? 'Tagihan sewa' : 'Tagihan saya'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pemilik
            ? 'Tagihan yang Anda terbitkan untuk penghuni, dan yang belum masuk.'
            : 'Tagihan sewa Anda beserta sisa yang perlu dibayar.'}
        </p>
      </header>

      {pemilik && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Belum masuk"
            value={formatRupiah(ringkas.belum)}
            hint="Sisa dari tagihan yang belum lunas"
          />
          <StatCard label="Sudah masuk" value={formatRupiah(ringkas.terbayar)} hint="Tagihan lunas" />
        </div>
      )}

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
        <Panel title="Daftar tagihan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Tagihan belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              {pemilik
                ? 'Belum ada tagihan pada filter ini. Tagihan diterbitkan dari halaman kontrak.'
                : 'Belum ada tagihan pada filter ini.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => {
                const sisa = item.remainingAmount

                return (
                  <li key={item.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/tagihan/${item.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.invoiceNumber} · {item.propertyName ?? 'Sewa'}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {pemilik ? `${item.tenantName} · ` : ''}
                          {formatRupiah(item.totalAmount)}
                          {item.dueDate ? ` · jatuh tempo ${formatTanggal(item.dueDate)}` : ''}
                        </p>

                        {/* Sisa hanya ditulis ketika memang masih ada, dan
                            hanya ketika jumlahnya berbeda dari totalnya.
                            "Sisa Rp0" pada tagihan lunas hanya menambah
                            angka yang tidak perlu dibaca. */}
                        {sisa > 0 && sisa !== item.totalAmount && (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Sisa {formatRupiah(sisa)} dari {formatRupiah(item.totalAmount)}
                          </p>
                        )}
                      </div>

                      <StatusBadge status={item.status} jenis="invoice" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/tagihan/${item.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        {pemilik && item.status === 'DRAFT' ? 'Periksa' : 'Lihat detail'}
                      </Link>

                      {pemilik && item.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => void kirim(item.id)}
                          disabled={sibuk === item.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
                        >
                          {sibuk === item.id && (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          )}
                          Kirim ke penghuni
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      {pemilik && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Tagihan dibuat dari halaman kontrak:{' '}
          <Link href="/kontrak" className="font-medium text-primary hover:text-primary-strong">
            buka kontrak sewa
          </Link>
          .
        </p>
      )}
    </div>
  )
}
