'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { mulaiPercakapan } from '@/lib/conversations'

/**
 * Tombol "Tanya pemilik" di halaman detail kos.
 *
 * Percakapan dibuat saat tombolnya ditekan, bukan saat dikirim: satu percakapan
 * per penghuni per properti, jadi menekannya berkali-kali membuka percakapan
 * yang sama, bukan menumpuk baris baru.
 *
 * Pertanyaan pembukanya dikirim sekaligus supaya pemilik menerima sesuatu yang
 * bisa dijawab, bukan percakapan kosong yang harus ia tebak isinya.
 */
export function HubungiPemilik({
  propertyId,
  namaPemilik,
}: {
  propertyId: string
  namaPemilik: string
}) {
  const router = useRouter()
  const { status } = useSession()
  const [terbuka, setTerbuka] = useState(false)
  const [isi, setIsi] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  const tamu = status !== 'masuk'

  if (tamu) {
    return (
      <Link
        href="/masuk"
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted"
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        Masuk untuk bertanya
      </Link>
    )
  }

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!isi.trim()) return

    setSibuk(true)
    setPesan(null)

    try {
      const percakapan = await mulaiPercakapan({ propertyId, pesan: isi.trim() })
      router.push(`/pesan/${percakapan.id}`)
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Pertanyaan tidak terkirim')
      setSibuk(false)
    }
  }

  if (!terbuka) {
    return (
      <>
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          Tanya pemilik
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Pertanyaan tentang kamar, biaya tambahan, atau jadwal survei dijawab di halaman pesan.
        </p>
      </>
    )
  }

  return (
    <form onSubmit={kirim} className="mt-4 space-y-3">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium">Pertanyaan untuk {namaPemilik}</span>
        <textarea
          value={isi}
          onChange={(event) => setIsi(event.target.value)}
          rows={3}
          maxLength={2000}
          required
          autoFocus
          placeholder="Mis. kamar masih kosong untuk bulan depan?"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {pesan && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sibuk || !isi.trim()}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
        >
          {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Kirim pertanyaan
        </button>
        <button
          type="button"
          onClick={() => setTerbuka(false)}
          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Batal
        </button>
      </div>
    </form>
  )
}
