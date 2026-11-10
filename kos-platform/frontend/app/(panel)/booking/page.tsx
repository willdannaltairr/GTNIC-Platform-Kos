'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchBookings,
  updateBookingStatus,
  type Booking,
  type BookingStatus,
} from '@/lib/bookings'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Daftar booking milik pengunjung atau pemilik kos.
 *
 * Isinya ditentukan peran di backend, jadi halaman ini tidak memilih sumber
 * data: penghuni menerima pengajuannya sendiri, pemilik menerima pengajuan ke
 * propertinya.
 *
 * Tombol yang tampil dibatasi peran, dan backend tetap memeriksa ulang. Yang
 * tampil di sini hanya kemudahan, bukan batas keamanan.
 */

const TAB: { label: string; status?: BookingStatus }[] = [
  { label: 'Semua' },
  { label: 'Menunggu', status: 'PENDING' },
  { label: 'Disetujui', status: 'APPROVED' },
  { label: 'Dikonfirmasi', status: 'CONFIRMED' },
  { label: 'Selesai', status: 'COMPLETED' },
  { label: 'Dibatalkan', status: 'CANCELLED' },
]

export default function BookingPage() {
  const { user, status } = useSession()
  const [tab, setTab] = useState(0)
  const [daftar, setDaftar] = useState<Booking[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = async (statusFilter?: BookingStatus): Promise<void> => {
    const hasil = await fetchBookings(statusFilter)
    setDaftar(hasil)
  }

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchBookings(TAB[tab].status).then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, tab])

  const ubah = async (booking: Booking, ke: BookingStatus, alasan?: string): Promise<void> => {
    setSibuk(booking.id)
    setPesan(null)

    try {
      await updateBookingStatus(booking.id, ke, { alasan })
      await muat(TAB[tab].status)
    } catch (error) {
      // Pesan dari server ditampilkan apa adanya: sebab penolakannya spesifik
      // (mis. perpindahan status yang tidak diizinkan) dan pengunjung perlu
      // tahu yang mana.
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
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk melihat booking</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pengajuan sewa terikat ke akun, jadi riwayatnya hanya bisa dibuka setelah masuk.
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
          {pemilik ? 'Pengajuan sewa' : 'Booking saya'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pemilik
            ? 'Pengajuan dari calon penghuni ke properti Anda.'
            : 'Pengajuan sewa yang Anda kirim dan keputusannya.'}
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
        <Panel title="Daftar booking" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Booking belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              {pemilik
                ? 'Belum ada pengajuan sewa pada filter ini.'
                : 'Belum ada booking pada filter ini. Buka detail kos untuk mengajukan sewa.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/kos/${item.propertySlug}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.propertyName}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Kamar {item.roomNumber} · {item.bookingCode}
                        {pemilik ? ` · ${item.tenantName}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Masuk {formatTanggal(item.startDate)}
                        {item.endDate ? ` sampai ${formatTanggal(item.endDate)}` : ''} ·{' '}
                        {formatRupiah(item.totalAmount)}
                      </p>
                    </div>

                    <StatusBadge status={item.status} jenis="booking" />
                  </div>

                  <Link
                    href={`/booking/${item.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary-strong"
                  >
                    Lihat detail dan perjalanan pengajuan
                  </Link>

                  {/* Tombol perpanjangan status, bukan peta aturan lengkap.
                      Backend tetap menolak perpindahan yang tidak sah, dan
                      pesannya ditampilkan di atas. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pemilik && item.status === 'PENDING' && (
                      <>
                        <Aksi
                          onClick={() => ubah(item, 'APPROVED')}
                          sibuk={sibuk === item.id}
                          utama
                        >
                          Setujui
                        </Aksi>
                        <Aksi onClick={() => ubah(item, 'REJECTED')} sibuk={sibuk === item.id}>
                          Tolak
                        </Aksi>
                      </>
                    )}

                    {pemilik && item.status === 'APPROVED' && (
                      <Aksi onClick={() => ubah(item, 'CONFIRMED')} sibuk={sibuk === item.id} utama>
                        Konfirmasi sewa
                      </Aksi>
                    )}

                    {pemilik && item.status === 'CONFIRMED' && (
                      <Aksi onClick={() => ubah(item, 'COMPLETED')} sibuk={sibuk === item.id}>
                        Tandai selesai
                      </Aksi>
                    )}

                    {!pemilik &&
                      ['PENDING', 'APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(
                        item.status,
                      ) && (
                        <Aksi onClick={() => ubah(item, 'CANCELLED')} sibuk={sibuk === item.id}>
                          Batalkan
                        </Aksi>
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

/** Tombol aksi kecil dengan keadaan menunggu. */
function Aksi({
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
