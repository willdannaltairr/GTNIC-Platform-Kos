'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { createBooking } from '@/lib/bookings'
import { createVisit } from '@/lib/visits'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  propertyId: string
  propertySlug: string
  roomId: string
  roomNumber: string
  tersedia: boolean
}

/**
 * Aksi cepat dari halaman satu kamar.
 *
 * Lebih sempit daripada panel di halaman kos: di sini kamarnya sudah dipilih,
 * jadi yang tersisa hanya tanggal dan durasi. Menampilkan pemilih kamar lagi
 * justru membuka peluang pengunjung mengganti kamar tanpa sadar, padahal ia
 * baru saja membaca rincian kamar ini.
 *
 * Kamar yang tidak tersedia tetap bisa dijadwalkan survei. Mengajukan sewa
 * untuk kamar yang sedang terisi hanya akan ditolak server, sedangkan survei
 * tetap berguna untuk melihat kamar yang akan kosong nanti.
 */
export function RoomBookingActions({
  propertyId,
  propertySlug,
  roomId,
  roomNumber,
  tersedia,
}: Props) {
  const router = useRouter()
  const { status } = useSession()
  const [mode, setMode] = useState<'sewa' | 'survei'>(tersedia ? 'sewa' : 'survei')
  const [tanggal, setTanggal] = useState('')
  const [durasi, setDurasi] = useState(3)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)

  // Tanggal paling cepat besok: pengajuan untuk hari yang sudah lewat tidak
  // bisa ditindaklanjuti siapa pun.
  const besok = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (status !== 'masuk') {
      router.push('/masuk')
      return
    }

    setSibuk(true)
    setPesan(null)

    try {
      if (mode === 'sewa') {
        await createBooking({
          propertyId,
          roomId,
          startDate: new Date(`${tanggal}T00:00:00`).toISOString(),
          durasiBulan: durasi,
        })

        setPesan({ nada: 'sukses', teks: 'Pengajuan terkirim. Membuka daftar booking...' })
        router.push('/booking')
        router.refresh()
        return
      }

      // Survei memakai jam yang wajar kalau pengunjung hanya memilih tanggal:
      // jadwal tanpa jam akan terbaca sebagai tengah malam.
      await createVisit({
        propertyId,
        roomId,
        scheduledAt: new Date(`${tanggal}T10:00:00`).toISOString(),
      })

      setPesan({ nada: 'sukses', teks: 'Jadwal survei tersimpan. Membuka daftar kunjungan...' })
      router.push('/kunjungan')
      router.refresh()
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Permintaan tidak tersimpan',
      })
      setSibuk(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        <button
          type="button"
          disabled={!tersedia}
          onClick={() => setMode('sewa')}
          aria-pressed={mode === 'sewa'}
          className={cn(
            'h-9 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            mode === 'sewa' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          Ajukan sewa
        </button>
        <button
          type="button"
          onClick={() => setMode('survei')}
          aria-pressed={mode === 'survei'}
          className={cn(
            'h-9 rounded-lg text-sm font-medium transition-colors',
            mode === 'survei' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          Jadwalkan survei
        </button>
      </div>

      {!tersedia && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
          Kamar {roomNumber} sedang tidak tersedia. Anda masih bisa menjadwalkan survei untuk
          melihatnya, atau memilih kamar lain di halaman kos.
        </p>
      )}

      <form onSubmit={kirim} className="mt-3 space-y-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium">
            {mode === 'sewa' ? 'Tanggal masuk' : 'Tanggal survei'}
          </span>
          <input
            type="date"
            value={tanggal}
            min={besok}
            required
            onChange={(event) => setTanggal(event.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {mode === 'sewa' && (
          <label className="grid gap-1.5">
            <span className="text-xs font-medium">Durasi sewa</span>
            <select
              value={durasi}
              onChange={(event) => setDurasi(Number(event.target.value))}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[1, 3, 6, 12].map((bulan) => (
                <option key={bulan} value={bulan}>
                  {bulan} bulan
                </option>
              ))}
            </select>
          </label>
        )}

        {pesan && (
          <p
            role="status"
            className={
              pesan.nada === 'sukses'
                ? 'rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200'
                : 'rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200'
            }
          >
            {pesan.teks}
          </p>
        )}

        <button
          type="submit"
          disabled={sibuk}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
        >
          {sibuk ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CalendarDays className="size-4" aria-hidden="true" />
          )}
          {mode === 'sewa' ? 'Ajukan sewa' : 'Jadwalkan survei'}
        </button>

        <Link
          href={`/kos/${propertySlug}`}
          className="block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Lihat semua kamar dan biaya di kos ini
        </Link>
      </form>
    </div>
  )
}
