'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Receipt } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchKontrakDetail,
  ubahStatusKontrak,
  type ContractStatus,
  type KontrakDetail,
} from '@/lib/contracts'
import { buatTagihan, type BarisBaru } from '@/lib/invoices'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Detail satu kontrak sewa.
 *
 * Tiga hal ditampilkan sekaligus karena ketiganya memang satu urusan: isi
 * kesepakatannya, perjalanan statusnya, dan tagihan yang lahir darinya.
 * Memisahkannya ke tiga halaman membuat pemilik harus berpindah-pindah hanya
 * untuk menjawab "kontrak ini sudah dibayar sampai kapan".
 *
 * Formulir penerbitan tagihan ada di sini, bukan di halaman terpisah: tagihan
 * selalu terbit dari kontrak, dan isian pertamanya sudah diketahui dari
 * kontraknya sendiri (sewa bulanan), jadi menaruhnya di tempat lain hanya
 * memaksa pemilik mengetik ulang angka yang sudah ada.
 */
export default function KontrakDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<KontrakDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)
  const [terbitkan, setTerbitkan] = useState(false)
  const [tambahan, setTambahan] = useState('')
  const [biayaTambahan, setBiayaTambahan] = useState('')
  const [alasan, setAlasan] = useState('')

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchKontrakDetail(params.id))
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchKontrakDetail(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const ubah = async (ke: ContractStatus, catatan?: string): Promise<void> => {
    if (!data) return

    setSibuk(true)
    setPesan(null)

    try {
      await ubahStatusKontrak(data.id, ke, catatan)
      await muat()
      setAlasan('')
      setPesan({
        nada: 'sukses',
        teks:
          ke === 'ACTIVE'
            ? 'Kontrak aktif. Kamar ditandai terisi.'
            : ke === 'PENDING_SIGNATURE'
              ? 'Kontrak dikirim untuk ditandatangani.'
              : 'Status kontrak diperbarui.',
      })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Status tidak berubah',
      })
    } finally {
      setSibuk(false)
    }
  }

  const terbit = async (): Promise<void> => {
    if (!data) return

    const nominal = Number(biayaTambahan.trim())
    const items: BarisBaru[] = [
      {
        description: `Sewa ${data.propertyName} kamar ${data.roomNumber}`,
        quantity: 1,
        unitPrice: data.monthlyRent,
        costType: 'sewa',
      },
    ]

    if (tambahan.trim() && Number.isFinite(nominal) && nominal > 0) {
      items.push({ description: tambahan.trim(), quantity: 1, unitPrice: nominal, costType: 'lainnya' })
    }

    setSibuk(true)
    setPesan(null)

    try {
      const tagihan = await buatTagihan({ contractId: data.id, items })
      await muat()
      setTerbitkan(false)
      setTambahan('')
      setBiayaTambahan('')
      setPesan({
        nada: 'sukses',
        teks: `Tagihan ${tagihan.invoiceNumber} dibuat sebagai draf. Kirim dari halaman tagihan setelah diperiksa.`,
      })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Tagihan tidak terbentuk',
      })
    } finally {
      setSibuk(false)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka kontrak</h1>
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
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Kontrak tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kontrak ini mungkin belum dibuat, atau bukan milik akun Anda.
        </p>
        <Link
          href="/kontrak"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke daftar kontrak
        </Link>
      </div>
    )
  }

  const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'
  const bolehTerbitkan = pemilik && (data.status === 'ACTIVE' || data.status === 'PENDING_SIGNATURE')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/kontrak"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar kontrak
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {data.propertyName} · kamar {data.roomNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.contractNumber} · dari pengajuan {data.bookingCode}
            {pemilik ? ` · ${data.tenantName}` : ''}
          </p>
        </div>
        <StatusBadge status={data.status} jenis="kontrak" />
      </header>

      {pesan && (
        <p
          role="status"
          className={cn(
            'mt-4 rounded-xl px-4 py-2.5 text-sm ring-1',
            pesan.nada === 'sukses'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200',
          )}
        >
          {pesan.teks}
        </p>
      )}

      <div className="mt-6 space-y-6">
        <Panel title="Isi kesepakatan">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Baris label="Mulai" nilai={formatTanggal(data.startDate)} />
            <Baris
              label="Berakhir"
              nilai={data.endDate ? formatTanggal(data.endDate) : 'Belum ditentukan'}
            />
            <Baris label="Sewa bulanan" nilai={`${formatRupiah(data.monthlyRent)}/bulan`} />
            <Baris label="Deposit" nilai={formatRupiah(data.depositAmount)} />
            <Baris
              label="Ditandatangani"
              nilai={data.signedAt ? formatTanggal(data.signedAt) : 'Belum ditandatangani'}
            />
            <Baris label="Dibuat" nilai={formatTanggal(data.createdAt)} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={`/kos/${data.propertySlug}`}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Lihat halaman kos
            </Link>

            {pemilik && data.status === 'DRAFT' && (
              <Tombol utama sibuk={sibuk} onClick={() => ubah('PENDING_SIGNATURE')}>
                Minta tanda tangan
              </Tombol>
            )}

            {!pemilik && data.status === 'PENDING_SIGNATURE' && (
              <Tombol utama sibuk={sibuk} onClick={() => ubah('ACTIVE')}>
                Tandatangani kontrak
              </Tombol>
            )}

            {pemilik && data.status === 'ACTIVE' && (
              <>
                <Tombol sibuk={sibuk} onClick={() => ubah('COMPLETED', alasan.trim() || undefined)}>
                  Tandai selesai
                </Tombol>
                <Tombol
                  sibuk={sibuk}
                  onClick={() => ubah('TERMINATED', alasan.trim() || undefined)}
                  mati={alasan.trim().length < 5}
                >
                  Akhiri lebih awal
                </Tombol>
              </>
            )}
          </div>

          {(pemilik && data.status === 'ACTIVE') || alasan ? (
            <label className="mt-3 block">
              <span className="text-xs font-medium">
                Catatan pengakhiran, minimal 5 karakter
              </span>
              <input
                value={alasan}
                onChange={(event) => setAlasan(event.target.value)}
                maxLength={500}
                placeholder="Mis. penghuni pindah tugas dan menyelesaikan sewanya lebih awal"
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                Catatan ini ikut tercatat di perjalanan kontrak, jadi tuliskan alasannya.
              </span>
            </label>
          ) : null}
        </Panel>

        <Panel title="Tagihan dari kontrak ini" description="Terbaru lebih dulu.">
          {data.invoices.length === 0 ? (
            <EmptyRow>
              {pemilik
                ? 'Belum ada tagihan. Terbitkan yang pertama dari tombol di bawah.'
                : 'Pemilik belum menerbitkan tagihan untuk kontrak ini.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.invoices.map((tagihan) => (
                <li key={tagihan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/tagihan/${tagihan.id}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {tagihan.invoiceNumber}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRupiah(tagihan.totalAmount)}
                      {tagihan.dueDate ? ` · jatuh tempo ${formatTanggal(tagihan.dueDate)}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={tagihan.status} jenis="invoice" />
                </li>
              ))}
            </ul>
          )}

          {bolehTerbitkan && (
            <div className="mt-4 border-t border-border pt-4">
              {terbitkan ? (
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Tagihan berisi sewa bulanan {formatRupiah(data.monthlyRent)}. Tambahkan biaya
                    lain bila perlu, lalu periksa dan kirim dari halaman tagihan.
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium">Biaya tambahan, opsional</span>
                      <input
                        value={tambahan}
                        onChange={(event) => setTambahan(event.target.value)}
                        maxLength={200}
                        placeholder="Mis. listrik dan air bulan ini"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium">Nominalnya</span>
                      <input
                        value={biayaTambahan}
                        onChange={(event) => setBiayaTambahan(event.target.value)}
                        inputMode="numeric"
                        placeholder="150000"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tombol utama sibuk={sibuk} onClick={terbit}>
                      <Receipt className="size-3.5" aria-hidden="true" />
                      Terbitkan tagihan
                    </Tombol>
                    <Tombol sibuk={false} onClick={() => setTerbitkan(false)}>
                      Batal
                    </Tombol>
                  </div>
                </>
              ) : (
                <Tombol utama sibuk={false} onClick={() => setTerbitkan(true)}>
                  <Receipt className="size-3.5" aria-hidden="true" />
                  Terbitkan tagihan
                </Tombol>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Perjalanan kontrak" description="Terbaru di atas.">
          {data.riwayat.length === 0 ? (
            <EmptyRow>Belum ada perubahan status yang tercatat.</EmptyRow>
          ) : (
            <ol className="space-y-0">
              {[...data.riwayat].reverse().map((langkah, index, semua) => (
                <li key={langkah.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < semua.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[5px] top-4 h-full w-px bg-border"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-primary ring-2 ring-background"
                  />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      {langkah.previousStatus ? (
                        <>
                          <StatusBadge status={langkah.previousStatus} jenis="kontrak" />
                          <span aria-hidden="true" className="text-muted-foreground">
                            ke
                          </span>
                        </>
                      ) : null}
                      <StatusBadge status={langkah.newStatus} jenis="kontrak" />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTanggal(langkah.createdAt)}
                    </p>
                    {langkah.notes && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {langkah.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
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
