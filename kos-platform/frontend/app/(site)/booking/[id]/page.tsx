'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { fetchBooking, updateBookingStatus, type BookingDetail, type BookingStatus } from '@/lib/bookings'
import { buatKontrak, fetchKontrak, type Kontrak } from '@/lib/contracts'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Detail satu pengajuan sewa beserta perjalanan statusnya.
 *
 * Linimasa diambil dari `booking_status_histories`, bukan disusun dari status
 * sekarang: riwayat itu satu-satunya sumber yang tahu kapan dan oleh siapa
 * status berubah, dan tanpanya penghuni hanya melihat hasil akhir tanpa tahu
 * apakah pengajuannya sudah dibaca pemilik.
 *
 * Tombol yang tampil dibatasi peran dan status, tetapi backend tetap memeriksa
 * ulang. Yang di sini hanya kemudahan, bukan batas keamanan.
 */
export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<BookingDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [kontrak, setKontrak] = useState<Kontrak | null>(null)

  const muat = useCallback(async (): Promise<BookingDetail | null> => {
    const hasil = await fetchBooking(params.id)
    setData(hasil)
    return hasil
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchBooking(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    // Kontrak dari pengajuan ini ikut dicari supaya tombol pembuatannya tidak
    // ditawarkan ketika kontraknya sudah ada. Pemeriksaan yang sebenarnya tetap
    // di server, yang menolak kontrak kedua untuk booking yang sama.
    void fetchKontrak().then((daftar) => {
      if (!aktif) return
      setKontrak(daftar?.find((item) => item.bookingId === params.id) ?? null)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const ubah = async (ke: BookingStatus): Promise<void> => {
    setSibuk(true)
    setPesan(null)

    try {
      await updateBookingStatus(params.id, ke)
      await muat()
    } catch (error) {
      // Sebab penolakan dari server spesifik, misalnya perpindahan status yang
      // tidak diizinkan untuk peran ini, jadi pesannya ditampilkan apa adanya.
      setPesan(error instanceof Error ? error.message : 'Status tidak berubah')
    } finally {
      setSibuk(false)
    }
  }

  /**
   * Buat kontrak dari pengajuan yang sudah dikonfirmasi.
   *
   * Hanya pemilik propertinya yang boleh; penghuni ditolak server, dan pesannya
   * ditampilkan apa adanya. Setelah jadi, tautan kontraknya langsung menggantikan
   * tombolnya, sehingga pemilik tidak menekannya dua kali.
   */
  const bikinKontrak = async (): Promise<void> => {
    setSibuk(true)
    setPesan(null)
    setSukses(null)

    try {
      const hasil = await buatKontrak({ bookingId: params.id })
      setKontrak(hasil)
      setSukses(
        `Kontrak ${hasil.contractNumber} dibuat sebagai draf. Buka kontraknya untuk meminta tanda tangan penghuni.`,
      )
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Kontrak tidak terbentuk')
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
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka booking</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Rincian pengajuan sewa terikat ke akun, jadi hanya bisa dibuka setelah masuk.
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

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Booking tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pengajuan ini mungkin sudah dihapus, atau bukan milik akun Anda.
        </p>
        <Link
          href="/booking"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke daftar booking
        </Link>
      </div>
    )
  }

  const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'

  /*
   * Rincian biaya dipisah, bukan digabung jadi satu angka.
   *
   * Penghuni perlu tahu bagian mana yang sewa, mana deposit, dan mana biaya
   * lain, karena deposit kembali di akhir dan biaya lain tidak. Satu angka
   * total menyembunyikan perbedaan itu tepat di halaman yang seharusnya
   * menjawabnya.
   */
  const biaya = [
    { label: 'Sewa bulan pertama', nilai: data.monthlyPrice },
    { label: 'Deposit', nilai: data.depositAmount },
    { label: 'Biaya lain', nilai: data.additionalCost },
  ].filter((baris) => baris.nilai > 0)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/booking"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar booking
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.propertyName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kamar {data.roomNumber} · {data.bookingCode}
            {pemilik ? ` · ${data.tenantName}` : ''}
          </p>
        </div>
        <StatusBadge status={data.status} jenis="booking" />
      </header>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      {sukses && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200"
        >
          {sukses}
        </p>
      )}

      <div className="mt-6 space-y-6">
        <Panel title="Rincian sewa">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Baris label="Mulai masuk" nilai={formatTanggal(data.startDate)} />
            <Baris label="Berakhir" nilai={data.endDate ? formatTanggal(data.endDate) : 'Belum ditentukan'} />
            <Baris label="Diajukan" nilai={formatTanggal(data.createdAt)} />
            <Baris label="Kos" nilai={data.propertyName} />
          </dl>

          {biaya.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <ul className="space-y-1.5">
                {biaya.map((baris) => (
                  <li key={baris.label} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{baris.label}</span>
                    <span>{formatRupiah(baris.nilai)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatRupiah(data.totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={`/kos/${data.propertySlug}`}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Lihat halaman kos
            </Link>

            {pemilik && data.status === 'PENDING' && (
              <>
                <Tombol onClick={() => ubah('APPROVED')} sibuk={sibuk} utama>
                  Setujui
                </Tombol>
                <Tombol onClick={() => ubah('REJECTED')} sibuk={sibuk}>
                  Tolak
                </Tombol>
              </>
            )}

            {pemilik && data.status === 'APPROVED' && (
              <Tombol onClick={() => ubah('CONFIRMED')} sibuk={sibuk} utama>
                Konfirmasi sewa
              </Tombol>
            )}

            {pemilik && data.status === 'CONFIRMED' && (
              <Tombol onClick={() => ubah('COMPLETED')} sibuk={sibuk}>
                Tandai selesai
              </Tombol>
            )}

            {/* Kontrak adalah lanjutan dari sewa yang sudah dikonfirmasi, jadi
                tombolnya ditaruh di sini, tempat keputusan itu diambil. */}
            {kontrak ? (
              <Link
                href={`/kontrak/${kontrak.id}`}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Lihat kontrak sewa
              </Link>
            ) : (
              pemilik &&
              data.status === 'CONFIRMED' && (
                <Tombol onClick={bikinKontrak} sibuk={sibuk} utama>
                  Buat kontrak sewa
                </Tombol>
              )
            )}

            {!pemilik &&
              ['PENDING', 'APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(data.status) && (
                <Tombol onClick={() => ubah('CANCELLED')} sibuk={sibuk}>
                  Batalkan pengajuan
                </Tombol>
              )}
          </div>
        </Panel>

        {(data.tenantNotes || data.ownerNotes) && (
          <Panel title="Catatan">
            {data.tenantNotes && (
              <div className="pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Dari penghuni
                </p>
                <p className="mt-1 text-sm leading-relaxed">{data.tenantNotes}</p>
              </div>
            )}
            {data.ownerNotes && (
              <div className={cn(data.tenantNotes && 'border-t border-border pt-3')}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Dari pemilik
                </p>
                <p className="mt-1 text-sm leading-relaxed">{data.ownerNotes}</p>
              </div>
            )}
          </Panel>
        )}

        <Panel title="Perjalanan pengajuan" description="Terbaru di atas.">
          {data.riwayat.length === 0 ? (
            <EmptyRow>Belum ada perubahan status yang tercatat.</EmptyRow>
          ) : (
            <ol className="space-y-0">
              {data.riwayat.map((langkah, index) => (
                <li key={langkah.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Garis penghubung antar titik; titik terakhir tidak perlu
                      garis karena tidak ada langkah berikutnya di bawahnya. */}
                  {index < data.riwayat.length - 1 && (
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
                          <StatusBadge status={langkah.previousStatus} jenis="booking" />
                          <span aria-hidden="true" className="text-muted-foreground">
                            ke
                          </span>
                        </>
                      ) : null}
                      <StatusBadge status={langkah.newStatus} jenis="booking" />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTanggal(langkah.createdAt)}
                    </p>
                    {langkah.reason && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {langkah.reason}
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

/** Satu pasangan label dan nilai pada rincian sewa. */
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

/** Tombol aksi dengan keadaan menunggu. */
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
