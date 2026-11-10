'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchLaporan,
  labelKategori,
  ubahStatusLaporan,
  type DaftarLaporan,
  type LaporanPerbaikan,
  type PerbaikanStatus,
} from '@/lib/maintenance'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Daftar laporan perbaikan.
 *
 * Penghuni melihat laporan yang ia buat, pemilik melihat yang masuk ke
 * propertinya, admin melihat semuanya. Penyaringnya di server, jadi halaman ini
 * tidak memilih sumbernya sendiri.
 *
 * Angka di tiap tab datang dari ringkasan server dan mencakup seluruh laporan,
 * bukan hanya halaman yang sedang tampil.
 */

const TAB: { label: string; status?: PerbaikanStatus }[] = [
  { label: 'Semua' },
  { label: 'Baru', status: 'OPEN' },
  { label: 'Ditinjau', status: 'REVIEWING' },
  { label: 'Dikerjakan', status: 'IN_PROGRESS' },
  { label: 'Selesai', status: 'RESOLVED' },
  { label: 'Ditutup', status: 'CLOSED' },
]

/**
 * Tombol cepat untuk pemilik: perpindahan yang tidak memerlukan alasan.
 *
 * Penolakan sengaja tidak ada di sini karena wajib disertai alasan minimal
 * sepuluh karakter, dan menuliskan alasan di baris daftar yang sempit
 * menghasilkan alasan seadanya. Jalurnya lewat halaman detail.
 */
const TOMBOL_CEPAT: { status: PerbaikanStatus; label: string }[] = [
  { status: 'REVIEWING', label: 'Tandai ditinjau' },
  { status: 'IN_PROGRESS', label: 'Kerjakan' },
  { status: 'RESOLVED', label: 'Tandai selesai' },
  { status: 'CLOSED', label: 'Tutup laporan' },
]

export default function PerbaikanPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<DaftarLaporan | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = useCallback(async (statusFilter?: PerbaikanStatus): Promise<void> => {
    setDaftar(await fetchLaporan(statusFilter))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchLaporan(TAB[tab].status).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  const ubah = async (item: LaporanPerbaikan, statusBaru: PerbaikanStatus): Promise<void> => {
    setSibuk(item.id)
    setPesan(null)

    try {
      await ubahStatusLaporan(item.id, statusBaru)
      await muat(TAB[tab].status)
    } catch (error) {
      // Pesan server menyebutkan perpindahan mana yang ditolak, dan itu yang
      // perlu dibaca pemiliknya.
      setPesan(error instanceof Error ? error.message : 'Status tidak berubah')
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-52 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk membuka laporan perbaikan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Laporan perbaikan terikat ke sewa yang sedang berjalan, jadi riwayatnya hanya bisa dibuka
          setelah masuk.
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
  const penghuni = user.role === 'TENANT'
  const total = daftar?.ringkasan

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
            {pemilik ? 'Laporan perbaikan' : 'Perbaikan kamar saya'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {pemilik
              ? 'Kerusakan yang dilaporkan penghuni, dari diterima sampai ditutup.'
              : 'Kerusakan yang Anda laporkan beserta perkembangannya.'}
          </p>
        </div>

        {penghuni && (
          <Link
            href="/perbaikan/baru"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
            Buat laporan
          </Link>
        )}
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {TAB.map((item, index) => {
          const jumlah = item.status ? total?.[item.status] : undefined

          return (
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
              {jumlah !== undefined && <span className="ml-1.5 text-xs opacity-80">{jumlah}</span>}
            </button>
          )
        })}
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
        <Panel title="Daftar laporan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Laporan belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.items.length === 0 ? (
            <EmptyRow>
              {penghuni
                ? 'Belum ada laporan pada filter ini. Laporkan kerusakan lewat tombol Buat laporan.'
                : 'Belum ada laporan pada filter ini.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.items.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/perbaikan/${item.id}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {labelKategori(item.category)} · {item.propertyName}
                        {item.roomNumber ? `, kamar ${item.roomNumber}` : ''} ·{' '}
                        {formatTanggal(item.createdAt)}
                        {pemilik ? ` · ${item.tenantName}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.priority} jenis="prioritas" />
                      <StatusBadge status={item.status} jenis="perbaikan" />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/perbaikan/${item.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Detail
                    </Link>

                    {pemilik &&
                      TOMBOL_CEPAT.map((tombol) =>
                        bolehCepat(item.status, tombol.status) ? (
                          <button
                            key={tombol.status}
                            type="button"
                            onClick={() => ubah(item, tombol.status)}
                            disabled={sibuk === item.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                          >
                            {sibuk === item.id && (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            )}
                            {tombol.label}
                          </button>
                        ) : null,
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
          Penolakan laporan wajib disertai alasan, jadi jalurnya lewat halaman detail laporannya.
        </p>
      )}
    </div>
  )
}

/**
 * Apakah tombol cepat itu masuk akal dari status sekarang.
 *
 * Hanya untuk memilih tombol mana yang tampil; server tetap menolak
 * perpindahan yang tidak sah, dan pesannya ditampilkan apa adanya.
 */
function bolehCepat(dari: PerbaikanStatus, ke: PerbaikanStatus): boolean {
  if (ke === 'REVIEWING') return dari === 'OPEN' || dari === 'REJECTED'
  if (ke === 'IN_PROGRESS') return dari === 'OPEN' || dari === 'REVIEWING' || dari === 'WAITING_FOR_PARTS' || dari === 'RESOLVED'
  if (ke === 'RESOLVED') return dari === 'IN_PROGRESS' || dari === 'WAITING_FOR_PARTS'
  if (ke === 'CLOSED') return dari === 'RESOLVED' || dari === 'REJECTED'
  return false
}
