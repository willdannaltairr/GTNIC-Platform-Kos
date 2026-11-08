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

interface KamarTersedia {
  id: string
  roomNumber: string
  monthlyPrice: number
}

/**
 * Panel pengajuan sewa dan penjadwalan survei di halaman detail kos.
 *
 * Dua alur yang berbeda ditempatkan di satu panel karena pengunjung mengambil
 * salah satunya pada momen yang sama: setelah membaca rincian biaya. Memisahnya
 * ke dua halaman berarti satu di antaranya hampir tidak pernah ditemukan.
 *
 * Seluruh perhitungan biaya di sini hanya untuk gambaran awal. Angka yang
 * mengikat tetap yang tersimpan di booking, karena harga dan deposit disalin
 * backend saat pengajuan, bukan dihitung ulang di klien.
 */
export function BookingPanel({
  propertyId,
  rooms,
}: {
  propertyId: string
  rooms: KamarTersedia[]
}) {
  const router = useRouter()
  const { status } = useSession()
  const [mode, setMode] = useState<'sewa' | 'survei'>('sewa')
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '')
  const [tanggal, setTanggal] = useState('')
  const [durasi, setDurasi] = useState(3)
  const [catatan, setCatatan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)

  const tamu = status !== 'masuk'

  // Tanggal masuk paling cepat besok: pengajuan untuk hari yang sudah lewat
  // tidak bisa ditindaklanjuti siapa pun, dan mengirimkannya hanya menghabiskan
  // satu putaran sebelum ditolak.
  const besok = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSibuk(true)
    setPesan(null)

    try {
      if (mode === 'sewa') {
        if (!roomId) throw new Error('Pilih kamar yang ingin diajukan')

        await createBooking({
          propertyId,
          roomId,
          startDate: new Date(`${tanggal}T00:00:00`).toISOString(),
          durasiBulan: durasi,
          catatan: catatan.trim() || undefined,
        })

        setPesan({ nada: 'sukses', teks: 'Pengajuan terkirim. Membuka daftar booking...' })
        router.push('/booking')
        router.refresh()
        return
      }

      // Survei memakai jam yang wajar kalau pengunjung hanya memilih tanggal:
      // jadwal tanpa jam akan terbaca sebagai tengah malam, dan itu bukan jam
      // orang berkunjung.
      await createVisit({
        propertyId,
        roomId: roomId || undefined,
        scheduledAt: new Date(`${tanggal}T10:00:00`).toISOString(),
        catatan: catatan.trim() || undefined,
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

  const kamarTerpilih = rooms.find((kamar) => kamar.id === roomId)
  const perkiraan = kamarTerpilih ? kamarTerpilih.monthlyPrice * durasi : 0

  if (tamu) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-bold tracking-tight">Ajukan sewa atau survei</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Masuk dulu untuk memilih kamar, mengajukan sewa, atau menjadwalkan kunjungan.
        </p>
        <Link
          href="/masuk"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk untuk melanjutkan
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode('sewa')}
          aria-pressed={mode === 'sewa'}
          className={cn(
            'h-9 rounded-lg text-sm font-medium transition-colors',
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

      <form onSubmit={kirim} className="mt-4 space-y-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium">
            Kamar {mode === 'survei' && <span className="text-muted-foreground">(opsional)</span>}
          </span>
          <select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mode === 'survei' && <option value="">Belum menentukan kamar</option>}
            {rooms.map((kamar) => (
              <option key={kamar.id} value={kamar.id}>
                Kamar {kamar.roomNumber}, {formatRupiah(kamar.monthlyPrice)} per bulan
              </option>
            ))}
          </select>
        </label>

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
          {mode === 'survei' && (
            <span className="text-[11px] text-muted-foreground">
              Survei dijadwalkan pukul 10.00. Ubah waktunya dengan pemilik lewat catatan.
            </span>
          )}
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

        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Catatan untuk pemilik</span>
          <textarea
            value={catatan}
            onChange={(event) => setCatatan(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={
              mode === 'sewa'
                ? 'Mis. butuh kamar lantai bawah, rencana masuk awal bulan'
                : 'Mis. ingin melihat kamar dan area parkir'
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {mode === 'sewa' && perkiraan > 0 && (
          <p className="rounded-xl bg-muted px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            Perkiraan sewa {durasi} bulan: <strong className="text-foreground">{formatRupiah(perkiraan)}</strong>.
            Deposit dan biaya lain ditambahkan pemilik saat pengajuan ditinjau, jadi angka ini belum
            termasuk keduanya.
          </p>
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
          disabled={sibuk || rooms.length === 0}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
        >
          {sibuk ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CalendarDays className="size-4" aria-hidden="true" />
          )}
          {mode === 'sewa' ? 'Ajukan sewa' : 'Jadwalkan survei'}
        </button>

        {rooms.length === 0 && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Belum ada kamar yang berstatus tersedia di kos ini. Coba jadwalkan survei dulu, atau
            hubungi pemilik lewat catatan.
          </p>
        )}
      </form>
    </div>
  )
}
