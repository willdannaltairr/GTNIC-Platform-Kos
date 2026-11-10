'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchPemeriksaan,
  LABEL_JENIS,
  type PemeriksaanKondisi,
  type StatusPemeriksaan,
} from '@/lib/room-condition'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Daftar pemeriksaan kondisi kamar.
 *
 * Penghuni melihat pemeriksaan yang ia buat, pemilik melihat yang tertuju
 * padanya, admin melihat semuanya. Penyaringnya di server, jadi halaman ini
 * tidak memilih sumbernya sendiri.
 *
 * Pemeriksaan masuk dan keluar dibedakan di daftarnya, bukan hanya di halaman
 * detail: keduanya pemeriksaan kamar yang sama, dan yang membedakan hanya
 * kapan ia dibuat. Tanpa keterangan jenisnya, pemilik yang membuka daftarnya
 * tidak tahu mana yang berlaku untuk serah terima kunci.
 */

const TAB: { label: string; status?: StatusPemeriksaan }[] = [
  { label: 'Semua' },
  { label: 'Draf', status: 'DRAFT' },
  { label: 'Menunggu persetujuan', status: 'SUBMITTED' },
  { label: 'Disetujui', status: 'ACKNOWLEDGED' },
  { label: 'Dipertanyakan', status: 'DISPUTED' },
]

export default function KondisiKamarPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<PemeriksaanKondisi[] | null>(null)
  const [siap, setSiap] = useState(false)

  const muat = useCallback(async (statusFilter?: StatusPemeriksaan): Promise<void> => {
    setDaftar(await fetchPemeriksaan({ status: statusFilter }))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchPemeriksaan({ status: TAB[tab].status }).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk membuka catatan kondisi kamar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pemeriksaan kondisi terikat ke sewa yang sedang atau pernah berjalan, jadi riwayatnya
          hanya bisa dibuka setelah masuk.
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

  const penghuni = user.role === 'TENANT'
  const menunggu = (daftar ?? []).filter((item) => item.status === 'SUBMITTED').length

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
            {penghuni ? 'Kondisi kamar saya' : 'Catatan kondisi kamar'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {penghuni
              ? 'Keadaan kamar saat Anda masuk dan keluar, beserta fotonya. Catatan ini yang jadi acuan bila nanti ada perbedaan soal kerusakan.'
              : 'Keadaan kamar yang dicatat penghuni. Yang Anda setujui di sini berlaku sebagai acuan saat ia keluar nanti.'}
          </p>
        </div>

        {penghuni && (
          <Link
            href="/kondisi-kamar/baru"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
            Pemeriksaan baru
          </Link>
        )}
      </header>

      {!penghuni && menunggu > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
          {menunggu} pemeriksaan menunggu persetujuan Anda pada filter ini.
        </p>
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

      <div className="mt-6">
        <Panel title="Daftar pemeriksaan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Pemeriksaan belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              {penghuni
                ? 'Belum ada pemeriksaan kondisi pada filter ini. Pemeriksaan masuk dibuat saat Anda mulai menempati kamarnya, dan pemeriksaan keluar saat serah terima kunci.'
                : 'Belum ada penghuni yang mencatat kondisi kamarnya.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/kondisi-kamar/${item.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                      >
                        <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {item.propertyName} · kamar {item.roomNumber}
                      </Link>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {LABEL_JENIS[item.reportType] ?? item.reportType}
                        {penghuni ? '' : ` · ${item.tenantName}`}
                        {item.contractNumber ? ` · ${item.contractNumber}` : ''} ·{' '}
                        {formatTanggal(item.reportDate ?? item.createdAt)}
                      </p>

                      {item.generalCondition && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {item.generalCondition}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={item.status} jenis="kondisi" />
                  </div>

                  <div className="mt-3">
                    <Link
                      href={`/kondisi-kamar/${item.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {penghuni && item.status === 'DRAFT' ? 'Lanjutkan mengisi' : 'Lihat detail'}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
