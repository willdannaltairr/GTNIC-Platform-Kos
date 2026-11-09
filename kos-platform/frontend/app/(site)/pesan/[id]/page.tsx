'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow } from '@/components/dashboard/kit'
import {
  fetchPercakapanDetail,
  kirimPesan,
  type PercakapanDetail,
} from '@/lib/conversations'
import { formatTanggalJam } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Satu percakapan.
 *
 * Server menandai pesan lawan bicara sebagai terbaca saat rute ini dipanggil,
 * jadi membuka halaman ini sudah cukup untuk menurunkan angka belum dibaca;
 * tidak ada permintaan kedua yang perlu diingat dari sini.
 *
 * Isinya disegarkan berkala selama tabnya terlihat. Percakapan adalah satu-
 * satunya halaman yang isinya bertambah dari pihak lain, dan tanpa penyegaran
 * balasan pemilik baru terlihat kalau penghuninya menekan muat ulang sendiri.
 * Penyegaran berhenti saat tabnya disembunyikan supaya tidak ada permintaan
 * yang jalan terus di latar belakang.
 */
const JEDA_SEGAR_MS = 20_000

export default function PesanDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<PercakapanDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [isi, setIsi] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const ujungRef = useRef<HTMLDivElement>(null)

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchPercakapanDetail(params.id))
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchPercakapanDetail(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  useEffect(() => {
    if (status !== 'masuk' || !user) return

    const segarkan = (): void => {
      if (document.visibilityState === 'visible') void muat()
    }

    const timer = window.setInterval(segarkan, JEDA_SEGAR_MS)
    return () => window.clearInterval(timer)
  }, [status, user, muat])

  // Pesan terbaru selalu yang perlu terlihat saat halaman dibuka.
  useEffect(() => {
    ujungRef.current?.scrollIntoView({ block: 'end' })
  }, [data?.pesan.length])

  const kirimPesanBaru = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!isi.trim()) return

    setSibuk(true)
    setPesan(null)

    try {
      await kirimPesan(params.id, isi.trim())
      setIsi('')
      await muat()
    } catch (error) {
      // Pesan server menyebutkan sebabnya (kosong, terlalu panjang), dan itu
      // yang perlu dibaca pengirimnya.
      setPesan(error instanceof Error ? error.message : 'Pesan tidak terkirim')
    } finally {
      setSibuk(false)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membaca pesan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Percakapan hanya bisa dibuka dua pihak yang ada di dalamnya.
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/pesan"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke daftar pesan
        </Link>
        <div className="mt-6">
          <EmptyRow>
            Percakapan tidak bisa dimuat. Percakapannya mungkin tidak ada, atau sudah tidak bisa
            Anda buka.
          </EmptyRow>
        </div>
      </div>
    )
  }

  // Admin boleh membaca untuk menengahi sengketa, tetapi tidak mengirim pesan
  // atas nama siapa pun; composer-nya karena itu tidak ditampilkan.
  const bolehKirim = user.role === 'TENANT' || user.role === 'OWNER'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <Link
          href="/pesan"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Semua pesan
        </Link>

        <div className="mt-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{data.lawanBicara}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/kos/${data.propertySlug}`} className="hover:underline">
              {data.propertyName}
            </Link>
          </p>
        </div>
      </header>

      <div className="mt-6 flex-1">
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          {data.pesan.length === 0 ? (
            <EmptyRow>
              Belum ada pesan di percakapan ini. Tulis pertanyaan pertama Anda di bawah.
            </EmptyRow>
          ) : (
            <ul className="space-y-4">
              {data.pesan.map((item) => {
                const milikSendiri = item.senderId === user.id

                return (
                  <li
                    key={item.id}
                    className={cn('flex flex-col', milikSendiri ? 'items-end' : 'items-start')}
                  >
                    <span className="text-[11px] text-muted-foreground">
                      {milikSendiri ? 'Anda' : item.senderName} ·{' '}
                      {formatTanggalJam(item.createdAt)}
                    </span>

                    <p
                      className={cn(
                        'mt-1 max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        milikSendiri
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {item.body}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}

          <div ref={ujungRef} />
        </div>
      </div>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      {bolehKirim ? (
        <form onSubmit={kirimPesanBaru} className="mt-4 flex items-end gap-2">
          <label className="grid flex-1 gap-1.5">
            <span className="sr-only">Tulis pesan</span>
            <textarea
              value={isi}
              onChange={(event) => setIsi(event.target.value)}
              rows={2}
              maxLength={2000}
              required
              placeholder={`Tulis pesan untuk ${data.lawanBicara}`}
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <button
            type="submit"
            disabled={sibuk || !isi.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {sibuk ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Kirim
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-xl bg-muted px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Admin dapat membaca percakapan untuk menengahi sengketa, tetapi tidak mengirim pesan atas
          nama siapa pun.
        </p>
      )}

      <p className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{data.pesan.length} pesan dimuat.</span>
        <span className="hidden sm:inline">Diperbarui otomatis tiap 20 detik.</span>
      </p>
    </div>
  )
}
