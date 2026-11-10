'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  ListChecks,
  Loader2,
  NotebookPen,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, ProgresBar, StatKartu } from '@/components/dashboard/kit'
import { fetchRencanaSurvei, type RencanaSurvei } from '@/lib/visits'
import { formatTanggal, formatTanggalJam } from '@/lib/format'

/**
 * Rencana survei kos.
 *
 * Halaman ini menggabungkan dua hal yang biasanya terpisah: jadwal yang masih
 * akan berlangsung dan temuan dari yang sudah dilakukan. Dipisah, keduanya
 * kurang berguna - yang sedang menyusun jadwal tidak tahu apa yang sudah
 * ditemukan, dan yang sedang membandingkan temuan tidak tahu apa yang berikutnya.
 *
 * Yang ditonjolkan pada hasil survei adalah butir yang BELUM tercentang, bukan
 * yang sudah. Butir tercentang hanya berarti "tidak ada masalah di sini",
 * sedangkan yang belum tercentang adalah daftar hal yang perlu ditanyakan lagi
 * sebelum memutuskan - dan itu yang menentukan pilihan.
 */
export default function RencanaSurveiPage() {
  const { user, status } = useSession()
  const [data, setData] = useState<RencanaSurvei | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchRencanaSurvei().then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Masuk untuk membuka rencana survei
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Jadwal dan catatan survei melekat pada akun Anda, jadi bisa dibuka lagi dari perangkat
          lain.
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
      <Link
        href="/kunjungan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Jadwal kunjungan
      </Link>

      <header className="mt-4">
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
          Rencana survei
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {pemilik
            ? 'Jadwal kunjungan calon penghuni ke properti Anda, beserta temuan dari kunjungan yang sudah selesai.'
            : 'Jadwal survei yang akan datang, berdampingan dengan temuan dari kos yang sudah Anda datangi. Butir yang belum tercentang adalah hal yang perlu ditanyakan lagi sebelum memutuskan.'}
        </p>
      </header>

      {data === null ? (
        <div className="mt-6">
          <EmptyRow>
            Rencana survei belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang
            halaman.
          </EmptyRow>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatKartu
              label="Akan datang"
              value={data.meta.akanDatang}
              hint="Jadwal yang belum berlangsung."
              icon={CalendarClock}
            />
            <StatKartu
              label="Sudah disurvei"
              value={data.meta.sudahDisurvei}
              hint="Kunjungan yang selesai."
              icon={ClipboardCheck}
            />
            <StatKartu
              label="Dibatalkan"
              value={data.meta.dibatalkan}
              hint="Jadwal yang batal sebelum datang."
              icon={XCircle}
            />
            <StatKartu
              label="Tidak hadir"
              value={data.meta.tidakHadir}
              hint="Jadwal yang terlewat begitu saja."
              icon={TriangleAlert}
            />
          </div>

          <Panel
            title="Agenda survei"
            description={
              data.agenda.length > 0
                ? `${data.agenda.length} jadwal, terdekat lebih dulu.`
                : 'Belum ada jadwal yang akan datang.'
            }
          >
            {data.agenda.length === 0 ? (
              <EmptyRow>
                Belum ada jadwal survei. Buka detail sebuah kos untuk menjadwalkan kunjungan.
              </EmptyRow>
            ) : (
              <ol className="space-y-2">
                {data.agenda.map((item, urutan) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/30"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold tabular-nums text-accent-foreground"
                    >
                      {urutan + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/kunjungan/${item.id}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.propertyName}
                      </Link>

                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                        {formatTanggalJam(item.scheduledAt)}
                        {item.roomNumber ? ` · kamar ${item.roomNumber}` : ''}
                        {pemilik ? ` · ${item.tenantName}` : ''}
                      </p>

                      {item.notes && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/kunjungan/${item.id}`}
                      className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Buka
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title="Ringkasan hasil survei"
            description={
              data.ringkasan.length > 0
                ? 'Yang belum tercentang adalah hal yang tidak ditemukan di kos itu.'
                : 'Belum ada survei yang selesai.'
            }
          >
            {data.ringkasan.length === 0 ? (
              <EmptyRow>
                Belum ada survei yang selesai. Isi daftar periksa saat berkunjung, lalu tandai
                kunjungannya selesai supaya temuannya masuk ke sini.
              </EmptyRow>
            ) : (
              <ul className="space-y-4">
                {data.ringkasan.map((item) => {
                  const persen =
                    item.daftarPeriksa.total === 0
                      ? 0
                      : Math.round((item.daftarPeriksa.tercentang / item.daftarPeriksa.total) * 100)

                  return (
                    <li key={item.id} className="rounded-2xl border border-border p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/kunjungan/${item.id}`}
                            className="text-sm font-semibold hover:underline"
                          >
                            {item.propertyName}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Disurvei {formatTanggal(item.scheduledAt ?? item.createdAt)}
                            {item.roomNumber ? ` · kamar ${item.roomNumber}` : ''}
                          </p>
                        </div>

                        <Link
                          href={`/kunjungan/${item.id}`}
                          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          Detail
                        </Link>
                      </div>

                      <div className="mt-4">
                        {item.daftarPeriksa.total === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Daftar periksa belum diisi untuk kunjungan ini.
                          </p>
                        ) : (
                          <ProgresBar
                            label="Daftar periksa"
                            keterangan={`${item.daftarPeriksa.total - item.daftarPeriksa.tercentang} butir belum tercentang`}
                            nilai={persen}
                            teks={`${item.daftarPeriksa.tercentang} dari ${item.daftarPeriksa.total}`}
                          />
                        )}
                      </div>

                      {item.daftarPeriksa.belum.length > 0 && (
                        <div className="mt-4">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            <ListChecks className="size-3.5 shrink-0" aria-hidden="true" />
                            Perlu ditanyakan lagi
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {item.daftarPeriksa.belum.map((butir) => (
                              <li
                                key={butir}
                                className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200"
                              >
                                {butir}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.catatan.length > 0 && (
                        <div className="mt-4 border-t border-border pt-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            <NotebookPen className="size-3.5 shrink-0" aria-hidden="true" />
                            Catatan
                            {item.jumlahCatatan > item.catatan.length
                              ? `, ${item.catatan.length} dari ${item.jumlahCatatan} terbaru`
                              : ''}
                          </p>
                          <ul className="mt-2 space-y-2">
                            {item.catatan.map((satu, urutan) => (
                              <li key={`${satu.createdAt}-${urutan}`}>
                                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/80">
                                  {satu.kategori}
                                </p>
                                <p className="mt-0.5 text-sm leading-relaxed">{satu.isi}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.catatan.length === 0 && item.daftarPeriksa.total > 0 && (
                        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                          Belum ada catatan tertulis untuk kunjungan ini.
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Daftar periksa diisi saat berkunjung, dari halaman detail tiap kunjungan. Ringkasan di
            atas membaca hasilnya supaya beberapa kos bisa dibandingkan dengan ukuran yang sama.
          </p>
        </div>
      )}
    </div>
  )
}
