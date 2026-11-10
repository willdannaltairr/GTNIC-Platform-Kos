'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BellRing, DoorOpen, Loader2, Search, TriangleAlert } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatKartu, StatusBadge } from '@/components/dashboard/kit'
import { fetchDashboardOwner, type DashboardOwner, type KamarPemilik } from '@/lib/dashboard'
import { ingatkanTagihan } from '@/lib/invoices'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Status tagihan yang masih menunggu uang; yang lain tidak perlu diingatkan. */
const BELUM_LUNAS = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']

/** Sebutan keadaan bayar untuk kolom status. */
const labelBayar = (kamar: KamarPemilik): string => {
  if (!kamar.tenantName) return 'Belum ada penghuni'
  if (!kamar.invoiceId) return 'Belum ada tagihan'
  return 'Ada tagihan'
}

/**
 * Kamar dan penyewanya.
 *
 * Satu baris per kamar, bukan per tagihan: pertanyaan yang dibawa pemilik ke
 * halaman ini adalah "kamar ini sudah bayar atau belum", dan daftar tagihan
 * tidak bisa menjawabnya untuk kamar yang belum pernah ditagih sama sekali.
 *
 * Kamar kosong tetap ditampilkan dengan keterangan bahwa belum ada penghuni.
 * Menyembunyikannya membuat halaman ini tampak seperti daftar tunggakan,
 * padahal yang dicari pemilik sering justru kamar mana yang masih kosong.
 *
 * Pengingat dikirim satu per satu, bukan borongan: jumlah tunggakan per pemilik
 * biasanya sedikit, dan pengingat yang terkirim ke orang yang salah lebih mahal
 * daripada satu klik tambahan.
 */
export default function KamarPage() {
  const { user, status } = useSession()
  const [data, setData] = useState<DashboardOwner | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)
  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState<'semua' | 'terisi' | 'kosong' | 'belum-bayar'>('semua')

  const pemilik = user?.role === 'OWNER' || user?.role === 'ADMIN'

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchDashboardOwner())
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || !pemilik) {
      setSiap(true)
      return
    }

    void fetchDashboardOwner().then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, pemilik])

  const kamar = data?.kamar ?? []

  const tersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase()

    return kamar.filter((item) => {
      const cocokKata =
        kata === '' ||
        item.roomNumber.toLowerCase().includes(kata) ||
        item.propertyName.toLowerCase().includes(kata) ||
        (item.tenantName ?? '').toLowerCase().includes(kata)

      const cocokSaring =
        saring === 'semua'
          ? true
          : saring === 'terisi'
            ? item.tenantName !== null
            : saring === 'kosong'
              ? item.tenantName === null
              : item.invoiceStatus !== null &&
                item.invoiceStatus !== 'PAID' &&
                item.invoiceStatus !== 'CANCELLED' &&
                BELUM_LUNAS.includes(item.invoiceStatus)

      return cocokKata && cocokSaring
    })
  }, [kamar, cari, saring])

  const kirimPengingat = async (item: KamarPemilik): Promise<void> => {
    if (!item.invoiceId) return

    setSibuk(item.invoiceId)
    setPesan(null)

    try {
      const hasil = await ingatkanTagihan(item.invoiceId)
      setPesan({
        nada: 'sukses',
        teks: `Pengingat terkirim ke ${hasil.ke} untuk kamar ${item.roomNumber}.`,
      })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Pengingat tidak terkirim.',
      })
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Masuk untuk melihat kamar
        </h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!pemilik) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Halaman ini untuk pemilik kos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Daftar kamar beserta penyewanya hanya terbuka untuk akun pemilik kos.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold transition-colors hover:border-primary/40"
        >
          Kembali ke ringkasan
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyRow>
          Data kamar belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang halaman.
        </EmptyRow>
      </div>
    )
  }

  const belumBayar = kamar.filter(
    (item) => item.invoiceStatus !== null && BELUM_LUNAS.includes(item.invoiceStatus),
  )
  const totalTunggakan = belumBayar.reduce(
    (jumlah, item) => jumlah + Math.max(0, (item.totalAmount ?? 0) - (item.paidAmount ?? 0)),
    0,
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
            Kamar dan penyewa
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Status tiap kamar: siapa penghuninya, sampai kapan kontraknya, dan apakah tagihan
            periode ini sudah dibayar. Pengingat dikirim ke penghuni lewat notifikasi akunnya.
          </p>
        </div>

        <Link
          href="/dashboard/kalender"
          className="inline-flex h-11 shrink-0 items-center rounded-full border border-border px-6 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          Lihat kalender bayar
        </Link>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatKartu label="Total kamar" value={kamar.length} icon={DoorOpen} />
        <StatKartu
          label="Terisi"
          value={kamar.filter((item) => item.tenantName !== null).length}
          hint={`${kamar.filter((item) => item.tenantName === null).length} kamar kosong`}
          icon={DoorOpen}
        />
        <StatKartu
          label="Belum bayar"
          value={belumBayar.length}
          hint={`${formatRupiah(totalTunggakan)} belum masuk`}
          icon={TriangleAlert}
        />
        <StatKartu
          label="Pengingat tersedia"
          value={belumBayar.filter((item) => item.invoiceId).length}
          hint="Tagihan yang bisa diingatkan hari ini"
          icon={BellRing}
        />
      </div>

      {pesan && (
        <p
          role="status"
          className={cn(
            'mt-5 rounded-xl px-3 py-2.5 text-sm ring-1',
            pesan.nada === 'sukses'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200',
          )}
        >
          {pesan.teks}
        </p>
      )}

      <Panel title="Daftar kamar" description="Diurutkan per properti, lalu nomor kamar.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Cari kamar, properti, atau penghuni</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={cari}
              onChange={(event) => setCari(event.target.value)}
              placeholder="Cari kamar, properti, atau nama penghuni"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['semua', 'Semua'],
                ['terisi', 'Terisi'],
                ['kosong', 'Kosong'],
                ['belum-bayar', 'Belum bayar'],
              ] as const
            ).map(([nilai, teks]) => (
              <button
                key={nilai}
                type="button"
                onClick={() => setSaring(nilai)}
                aria-pressed={saring === nilai}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  saring === nilai
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {teks}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {tersaring.length === 0 ? (
            <EmptyRow>
              {kamar.length === 0
                ? 'Belum ada kamar. Tambahkan kamar dari halaman properti Anda.'
                : 'Tidak ada kamar yang cocok dengan pencarian atau saringan ini.'}
            </EmptyRow>
          ) : (
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2.5 pr-3 font-semibold">Kamar</th>
                  <th className="py-2.5 pr-3 font-semibold">Penghuni</th>
                  <th className="py-2.5 pr-3 font-semibold">Sewa</th>
                  <th className="py-2.5 pr-3 font-semibold">Tagihan</th>
                  <th className="py-2.5 pr-3 font-semibold">Jatuh tempo</th>
                  <th className="py-2.5 font-semibold" />
                </tr>
              </thead>

              <tbody>
                {tersaring.map((item) => {
                  const belumLunas =
                    item.invoiceStatus !== null && BELUM_LUNAS.includes(item.invoiceStatus)
                  const sisa = Math.max(0, (item.totalAmount ?? 0) - (item.paidAmount ?? 0))

                  return (
                    <tr key={item.id} className="border-b border-border/70 last:border-b-0">
                      <td className="py-3 pr-3">
                        <Link
                          href={`/kos/${item.propertySlug}`}
                          className="font-medium hover:underline"
                        >
                          {item.roomNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.propertyName}</p>
                      </td>

                      <td className="py-3 pr-3">
                        {item.tenantName ? (
                          <>
                            <p className="text-sm">{item.tenantName}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatRupiah(item.monthlyPrice)} per bulan
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Belum ada penghuni</span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        {item.contractEndDate ? (
                          <span className="text-xs text-muted-foreground">
                            sampai {formatTanggal(item.contractEndDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {item.contractId ? 'selesai belum ditetapkan' : '-'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        {item.invoiceStatus ? (
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={item.invoiceStatus} jenis="invoice" />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {item.invoiceNumber}
                              {belumLunas && sisa > 0 ? ` · sisa ${formatRupiah(sisa)}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{labelBayar(item)}</span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <span className="text-xs text-muted-foreground">
                          {item.dueDate ? formatTanggal(item.dueDate) : '-'}
                        </span>
                      </td>

                      <td className="py-3 text-right">
                        {belumLunas && item.invoiceId && (
                          <button
                            type="button"
                            disabled={sibuk === item.invoiceId}
                            onClick={() => void kirimPengingat(item)}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60"
                          >
                            {sibuk === item.invoiceId ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <BellRing className="size-3.5" aria-hidden="true" />
                            )}
                            Ingatkan
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Ringkasannya ditaruh di bawah tabel supaya angkanya dibaca setelah
            daftarnya, bukan sebagai janji sebelum bukti. */}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Menampilkan {tersaring.length} dari {kamar.length} kamar. Pengingat hanya bisa dikirim
          untuk tagihan yang belum lunas, dan server menolak tagihan yang masih draf atau sudah
          dibatalkan.
        </p>
      </Panel>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void muat()}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-strong"
        >
          Muat ulang data
        </button>
      </div>
    </div>
  )
}
