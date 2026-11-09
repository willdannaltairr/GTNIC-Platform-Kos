'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { PilihBintang } from '@/components/ulasan/bintang'
import {
  ASPEK_ULASAN,
  fetchUlasanDetail,
  ubahUlasan,
  type AspekUlasan,
  type Ulasan,
} from '@/lib/reviews'
import { formatTanggal } from '@/lib/format'

/**
 * Ubah satu ulasan.
 *
 * Formulirnya diisi dari nilai yang sudah ada, bukan dari keadaan kosong:
 * menyunting dari nol berarti penulisnya mengetik ulang seluruh ulasannya hanya
 * untuk mengubah satu bintang.
 *
 * Sesudah disimpan, ulasannya kembali menunggu tinjauan admin, dan halaman ini
 * mengatakannya apa adanya. Tanpa keterangan itu, penulisnya mengira
 * perubahannya langsung tayang lalu bingung melihatnya hilang dari halaman kos.
 */
export default function UlasanUbahPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, status } = useSession()
  const [data, setData] = useState<Ulasan | null>(null)
  const [siap, setSiap] = useState(false)
  const [nilai, setNilai] = useState<Record<AspekUlasan, number>>({
    rating: 0,
    cleanlinessRating: 0,
    locationRating: 0,
    facilitiesRating: 0,
    ownerServiceRating: 0,
  })
  const [content, setContent] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchUlasanDetail(params.id).then((hasil) => {
      if (!aktif) return

      setData(hasil)

      if (hasil) {
        setNilai({
          rating: hasil.rating,
          cleanlinessRating: hasil.cleanlinessRating ?? 0,
          locationRating: hasil.locationRating ?? 0,
          facilitiesRating: hasil.facilitiesRating ?? 0,
          ownerServiceRating: hasil.ownerServiceRating ?? 0,
        })
        setContent(hasil.content ?? '')
      }

      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const simpan = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (nilai.rating < 1) {
      setPesan('Beri nilai keseluruhan dulu, minimal satu bintang.')
      return
    }

    setSibuk(true)
    setPesan(null)
    setSukses(null)

    try {
      const hasil = await ubahUlasan(params.id, {
        rating: nilai.rating,
        cleanlinessRating: nilai.cleanlinessRating || undefined,
        locationRating: nilai.locationRating || undefined,
        facilitiesRating: nilai.facilitiesRating || undefined,
        ownerServiceRating: nilai.ownerServiceRating || undefined,
        content: content.trim() || undefined,
      })

      setData(hasil)
      setSukses(
        'Perubahan tersimpan dan ulasannya kembali menunggu tinjauan admin sebelum tayang lagi.',
      )
      router.refresh()
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Perubahan tidak tersimpan')
    } finally {
      setSibuk(false)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk mengubah ulasan</h1>
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
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/ulasan"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Ulasan saya
        </Link>

        <div className="mt-6">
          <EmptyRow>
            Ulasan tidak bisa dimuat. Ulasannya mungkin tidak ada, atau bukan milik akun Anda.
          </EmptyRow>
        </div>
      </div>
    )
  }

  const terkunci = data.status === 'HIDDEN'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/ulasan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Ulasan saya
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {data.propertyName ?? 'Ulasan'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ditulis {formatTanggal(data.createdAt)}
          </p>
        </div>
        {data.status && <StatusBadge status={data.status} jenis="ulasan" />}
      </header>

      {data.moderationNotes && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Catatan admin: {data.moderationNotes}
        </p>
      )}

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

      {terkunci ? (
        <div className="mt-6">
          <Panel title="Ulasan ini tidak bisa diubah">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Admin menyembunyikan ulasan ini, jadi isinya tidak bisa Anda ubah lagi. Kalau Anda
              tidak setuju dengan keputusannya, sampaikan lewat halaman laporan supaya bisa
              ditinjau ulang oleh pengelola.
            </p>
            <div className="mt-3">
              <Link
                href="/ulasan"
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Kembali ke ulasan saya
              </Link>
            </div>
          </Panel>
        </div>
      ) : (
        <form
          onSubmit={simpan}
          className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="space-y-5">
            {ASPEK_ULASAN.map((aspek) => (
              <PilihBintang
                key={aspek.kunci}
                label={aspek.label}
                hint={aspek.hint}
                nilai={nilai[aspek.kunci]}
                onChange={(baru) => setNilai((lama) => ({ ...lama, [aspek.kunci]: baru }))}
              />
            ))}
          </div>

          <label className="grid gap-1.5 border-t border-border pt-5">
            <span className="text-xs font-medium">Cerita Anda (opsional)</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Mis. Air panas stabil, tapi parkir motor sempit saat malam."
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <p className="rounded-xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Menyimpan perubahan mengembalikan ulasan ini ke antrean tinjauan admin, dan selama
            ditinjau ia tidak tampil di halaman kos. Ini disengaja: ulasan yang sudah lolos tinjauan
            tidak boleh berubah isinya tanpa diperiksa lagi.
          </p>

          <button
            type="submit"
            disabled={sibuk}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {sibuk ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Simpan perubahan
          </button>
        </form>
      )}
    </div>
  )
}
