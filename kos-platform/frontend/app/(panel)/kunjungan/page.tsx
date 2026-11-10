'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ListChecks, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { deleteVisit, fetchVisits, updateVisit, type Kunjungan } from '@/lib/visits'
import { formatTanggal } from '@/lib/format'

/**
 * Daftar jadwal kunjungan.
 *
 * Pemilik melihat kunjungan ke propertinya, penghuni melihat jadwalnya
 * sendiri. Penyaringnya di backend, jadi halaman ini tidak memilih sumbernya.
 *
 * Kunjungan yang sudah berjalan tidak bisa dihapus, hanya ditandai selesai.
 * Catatan bahwa kunjungan itu pernah terjadi lebih berguna daripada daftar
 * yang bersih.
 */
export default function KunjunganPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<Kunjungan[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = async (): Promise<void> => {
    setDaftar(await fetchVisits())
  }

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchVisits().then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const ubah = async (item: Kunjungan, statusBaru: 'COMPLETED' | 'CANCELLED'): Promise<void> => {
    setSibuk(item.id)
    setPesan(null)

    try {
      await updateVisit(item.id, { status: statusBaru })
      await muat()
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Jadwal tidak berubah')
    } finally {
      setSibuk(null)
    }
  }

  const hapus = async (item: Kunjungan): Promise<void> => {
    setSibuk(item.id)
    setPesan(null)

    const berhasil = await deleteVisit(item.id)

    if (!berhasil) {
      setPesan('Jadwal tidak bisa dihapus. Kunjungan yang sudah berlangsung hanya bisa ditandai selesai.')
    }

    await muat()
    setSibuk(null)
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk menjadwalkan kunjungan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Jadwal survei tersimpan di akun Anda, lengkap dengan daftar periksa saat datang.
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
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Jadwal kunjungan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pemilik
            ? 'Calon penghuni yang ingin melihat properti Anda.'
            : 'Survei kos yang Anda jadwalkan. Buka detail untuk mengisi daftar periksa.'}
        </p>
        <Link
          href="/kunjungan/rencana"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ListChecks className="size-4" aria-hidden="true" />
          Rencana survei
        </Link>
      </header>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      <div className="mt-6">
        <Panel title="Kunjungan" description="Jadwal terdekat lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Jadwal belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              Belum ada jadwal kunjungan. Buka detail kos untuk menjadwalkan survei.
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/kunjungan/${item.id}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.propertyName}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                        {formatTanggal(item.scheduledAt)}
                        {item.roomNumber ? ` · kamar ${item.roomNumber}` : ''}
                        {pemilik ? ` · ${item.tenantName}` : ''}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={item.status} jenis="kunjungan" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/kunjungan/${item.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Detail
                    </Link>

                    {item.status === 'SCHEDULED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => ubah(item, 'COMPLETED')}
                          disabled={sibuk === item.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
                        >
                          {sibuk === item.id && (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          )}
                          Tandai selesai
                        </button>

                        {!pemilik && (
                          <button
                            type="button"
                            onClick={() => hapus(item)}
                            disabled={sibuk === item.id}
                            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                          >
                            Batalkan
                          </button>
                        )}
                      </>
                    )}
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
