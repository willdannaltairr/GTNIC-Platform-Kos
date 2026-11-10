'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { batalkanTagihan, fetchTagihanDetail, type TagihanDetail } from '@/lib/invoices'
import {
  buatPembayaran,
  fetchKonfigurasiPembayaran,
  fetchPembayaran,
  simulasiLunas,
  type KonfigurasiPembayaran,
  type Pembayaran,
} from '@/lib/payments'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Detail satu tagihan, beserta pembayarannya.
 *
 * Tiga hal ditampilkan sekaligus karena ketiganya satu urusan: rincian yang
 * ditagihkan, sisa yang belum dibayar, dan pembayaran yang sudah masuk. Sisa itu
 * datang dari server, bukan dihitung di sini lagi, supaya tidak ada dua angka
 * yang bisa berbeda di layar yang sama.
 *
 * Tombol bayar hanya muncul untuk penghuni yang ditagih, dan hanya ketika masih
 * ada sisa. Pemilik tidak membayar sewanya sendiri, dan tagihan yang sudah lunas
 * tidak menyisakan apa pun untuk dibayar.
 */
export default function TagihanDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<TagihanDetail | null>(null)
  const [pembayaran, setPembayaran] = useState<Pembayaran[] | null>(null)
  const [konfig, setKonfig] = useState<KonfigurasiPembayaran | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya' | 'info'; teks: string } | null>(
    null,
  )
  const [nominal, setNominal] = useState('')
  const [batal, setBatal] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [tautan, setTautan] = useState<string | null>(null)

  const muat = useCallback(async (): Promise<TagihanDetail | null> => {
    const hasil = await fetchTagihanDetail(params.id)
    setData(hasil)

    if (hasil) {
      setPembayaran(await fetchPembayaran({ invoiceId: hasil.id }))
    }

    return hasil
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void Promise.all([fetchTagihanDetail(params.id), fetchKonfigurasiPembayaran()]).then(
      ([tagihan, cfg]) => {
        if (!aktif) return
        setData(tagihan)
        setKonfig(cfg)

        if (tagihan) {
          void fetchPembayaran({ invoiceId: tagihan.id }).then((hasil) => {
            if (aktif) setPembayaran(hasil)
          })
        }

        setSiap(true)
      },
    )

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const bayar = async (): Promise<void> => {
    if (!data) return

    setSibuk('bayar')
    setPesan(null)
    setTautan(null)

    // Nominalnya hanya dikirim bila penghuni mengisinya dan hanya bila memang
    // lebih kecil dari sisa. Mengirim angka yang lebih besar dari sisa akan
    // ditolak server, dan menyamakannya dengan sisa di sini berarti menyalin
    // aturan yang sudah ada di sana.
    const angka = Number(nominal.trim())
    const sebagian = Number.isFinite(angka) && angka > 0 && angka < data.remainingAmount

    try {
      const hasil = await buatPembayaran({
        invoiceId: data.id,
        amount: sebagian ? angka : undefined,
      })

      await muat()

      if (hasil.redirectUrl) {
        setTautan(hasil.redirectUrl)
        setPesan({
          nada: 'info',
          teks: 'Pembayaran dibuat. Lanjutkan ke halaman pembayaran untuk menyelesaikannya.',
        })
      } else {
        setPesan({
          nada: 'info',
          teks:
            hasil.pesan ??
            'Pembayaran dibuat. Tautan pembayaran belum tersedia, coba lagi sebentar lagi.',
        })
      }
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Pembayaran tidak terbentuk',
      })
    } finally {
      setSibuk(null)
    }
  }

  const lunaskan = async (id: string): Promise<void> => {
    setSibuk(id)
    setPesan(null)

    try {
      await simulasiLunas(id)
      await muat()
      setPesan({ nada: 'sukses', teks: 'Pembayaran ditandai berhasil lewat simulasi pengembangan.' })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Pembayaran tidak berubah',
      })
    } finally {
      setSibuk(null)
    }
  }

  const batalkan = async (): Promise<void> => {
    if (!data) return

    setSibuk('batal')
    setPesan(null)

    try {
      await batalkanTagihan(data.id, alasan.trim())
      await muat()
      setBatal(false)
      setAlasan('')
      setPesan({ nada: 'sukses', teks: 'Tagihan dibatalkan.' })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Tagihan tidak dibatalkan',
      })
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk membuka tagihan</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Tagihan tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tagihan ini mungkin masih draf, sudah dibatalkan, atau bukan milik akun Anda.
        </p>
        <Link
          href="/tagihan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke daftar tagihan
        </Link>
      </div>
    )
  }

  const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'
  const bolehBayar =
    !pemilik && data.remainingAmount > 0 && data.status !== 'CANCELLED' && data.status !== 'DRAFT'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/tagihan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar tagihan
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">{data.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.propertyName ?? 'Sewa'}
            {data.contractNumber ? ` · kontrak ${data.contractNumber}` : ''}
            {pemilik ? ` · ${data.tenantName}` : ''}
          </p>
        </div>
        <StatusBadge status={data.status} jenis="invoice" />
      </header>

      {pesan && (
        <p
          role="status"
          className={cn(
            'mt-4 rounded-xl px-4 py-2.5 text-sm ring-1',
            pesan.nada === 'sukses'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : pesan.nada === 'bahaya'
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : 'bg-sky-50 text-sky-800 ring-sky-200',
          )}
        >
          {pesan.teks}
        </p>
      )}

      {tautan && (
        <a
          href={tautan}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          <CreditCard className="size-4" aria-hidden="true" />
          Lanjutkan ke halaman pembayaran
        </a>
      )}

      <div className="mt-6 space-y-6">
        <Panel title="Rincian tagihan">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Baris
              label="Periode"
              nilai={
                data.billingPeriodStart && data.billingPeriodEnd
                  ? `${formatTanggal(data.billingPeriodStart)} – ${formatTanggal(data.billingPeriodEnd)}`
                  : 'Tidak disebutkan'
              }
            />
            <Baris label="Terbit" nilai={formatTanggal(data.issueDate)} />
            <Baris label="Jatuh tempo" nilai={formatTanggal(data.dueDate)} />
            <Baris label="Kontrak" nilai={data.contractNumber ?? data.bookingCode ?? '-'} />
          </dl>

          <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
            {data.items.map((baris) => (
              <li key={baris.id} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  {baris.description}
                  {baris.quantity !== 1 ? ` × ${baris.quantity}` : ''}
                </span>
                <span>{formatRupiah(baris.subtotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(data.subtotal)}</span>
            </div>

            {data.discountAmount > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">Potongan</span>
                <span>-{formatRupiah(data.discountAmount)}</span>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-4 font-semibold">
              <span>Total</span>
              <span>{formatRupiah(data.totalAmount)}</span>
            </div>

            {data.paidAmount > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">Sudah dibayar</span>
                <span>{formatRupiah(data.paidAmount)}</span>
              </div>
            )}

            {/* Sisa selalu ditulis, termasuk ketika nol: inilah angka yang
                dicari penghuni saat membuka halaman ini. */}
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 text-base font-bold">
              <span>Sisa yang perlu dibayar</span>
              <span>{formatRupiah(data.remainingAmount)}</span>
            </div>
          </div>

          {data.notes && (
            <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
              {data.notes}
            </p>
          )}
        </Panel>

        {bolehBayar && (
          <Panel title="Bayar" description="Pembayaran sebagian diperbolehkan untuk tagihan ini.">
            <label className="grid gap-1.5 sm:max-w-xs">
              <span className="text-xs font-medium">Jumlah yang dibayar, opsional</span>
              <input
                value={nominal}
                onChange={(event) => setNominal(event.target.value)}
                inputMode="numeric"
                placeholder={String(data.remainingAmount)}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                Kosongkan untuk membayar penuh {formatRupiah(data.remainingAmount)}.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void bayar()}
              disabled={sibuk !== null}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {sibuk === 'bayar' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {sibuk === 'bayar' ? 'Menyiapkan...' : 'Bayar tagihan ini'}
            </button>

            {konfig && !konfig.ready && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
                Penyedia pembayaran belum dikonfigurasi pengelola, jadi pembayaran daring belum
                bisa diselesaikan. Pembayarannya tetap tercatat dan bisa dilanjutkan setelah
                kuncinya diisi.
              </p>
            )}
          </Panel>
        )}

        <Panel title="Pembayaran" description="Terbaru lebih dulu.">
          {pembayaran === null ? (
            <EmptyRow>Riwayat pembayaran belum bisa dimuat.</EmptyRow>
          ) : pembayaran.length === 0 ? (
            <EmptyRow>Belum ada pembayaran untuk tagihan ini.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {pembayaran.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.paymentCode}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRupiah(item.amount)} · dibuat {formatTanggal(item.createdAt)}
                        {item.paidAt ? ` · dibayar ${formatTanggal(item.paidAt)}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={item.status} jenis="pembayaran" />
                  </div>

                  {/* Simulasi pelunasan sengaja tidak disembunyikan di balik
                      nama samar: ia memudahkan pengembangan, dan rutenya tidak
                      ada sama sekali di produksi. */}
                  {konfig?.simulasiTersedia && item.status === 'PENDING' && !pemilik && (
                    <button
                      type="button"
                      onClick={() => void lunaskan(item.id)}
                      disabled={sibuk !== null}
                      className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      {sibuk === item.id && (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      )}
                      Tandai berhasil (simulasi)
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {pemilik && data.status !== 'CANCELLED' && data.status !== 'PAID' && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold tracking-tight">Batalkan tagihan</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tagihan yang sudah ada pembayaran berhasilnya tidak bisa dibatalkan di sini; uangnya
              sudah masuk dan pembatalannya harus lewat pengembalian dana.
            </p>

            {batal ? (
              <>
                <label className="mt-3 block">
                  <span className="text-xs font-medium">Alasan pembatalan, minimal 5 karakter</span>
                  <input
                    value={alasan}
                    onChange={(event) => setAlasan(event.target.value)}
                    maxLength={500}
                    placeholder="Mis. salah periode penagihan, diganti tagihan berikutnya"
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void batalkan()}
                    disabled={sibuk !== null || alasan.trim().length < 5}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
                  >
                    {sibuk === 'batal' && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                    Kirim pembatalan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatal(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Batal
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setBatal(true)}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Batalkan tagihan
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{nilai}</dd>
    </div>
  )
}
