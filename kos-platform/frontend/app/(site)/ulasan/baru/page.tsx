'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { PilihBintang } from '@/components/ulasan/bintang'
import { fetchKontrak, type Kontrak } from '@/lib/contracts'
import { ASPEK_ULASAN, fetchUlasanSaya, tulisUlasan, type AspekUlasan } from '@/lib/reviews'

/**
 * Formulir ulasan baru.
 *
 * Pilihannya bukan daftar seluruh kos di platform, melainkan kontrak milik
 * penghuni sendiri yang sudah berjalan atau sudah selesai: hanya orang yang
 * benar-benar menempati kamarnya yang punya bahan untuk dinilai. Kontrak yang
 * sudah pernah diulas disaring keluar, karena satu sewa melahirkan satu ulasan
 * dan menawarkannya lagi hanya menghasilkan penolakan di akhir pengisian.
 *
 * Penilaian keseluruhan wajib; aspek lain boleh dikosongkan dan disimpan sebagai
 * kosong, bukan nol.
 */
export default function UlasanBaruPage() {
  const router = useRouter()
  const { user, status } = useSession()
  const [sewa, setSewa] = useState<Kontrak[]>([])
  const [kontrakId, setKontrakId] = useState('')
  const [nilai, setNilai] = useState<Record<AspekUlasan, number>>({
    rating: 0,
    cleanlinessRating: 0,
    locationRating: 0,
    facilitiesRating: 0,
    ownerServiceRating: 0,
  })
  const [content, setContent] = useState('')
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void Promise.all([fetchKontrak(), fetchUlasanSaya()]).then(([kontrak, ulasan]) => {
      if (!aktif) return

      const sudahDiulas = new Set(
        (ulasan ?? []).map((item) => item.bookingId).filter((id): id is string => Boolean(id)),
      )

      const bisa = (kontrak ?? []).filter(
        (item) =>
          (item.status === 'ACTIVE' || item.status === 'COMPLETED') && !sudahDiulas.has(item.bookingId),
      )

      setSewa(bisa)
      setKontrakId(bisa[0]?.id ?? '')
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!kontrakId) {
      setPesan('Pilih dulu sewa yang ingin Anda nilai.')
      return
    }

    if (nilai.rating < 1) {
      setPesan('Beri nilai keseluruhan dulu, minimal satu bintang.')
      return
    }

    setSibuk(true)
    setPesan(null)

    try {
      await tulisUlasan({
        contractId: kontrakId,
        rating: nilai.rating,
        // Aspek yang tidak dinilai tidak ikut dikirim sama sekali, supaya
        // tersimpan sebagai kosong dan tidak ikut menekan rata-rata.
        cleanlinessRating: nilai.cleanlinessRating || undefined,
        locationRating: nilai.locationRating || undefined,
        facilitiesRating: nilai.facilitiesRating || undefined,
        ownerServiceRating: nilai.ownerServiceRating || undefined,
        content: content.trim() || undefined,
      })

      router.push('/ulasan')
      router.refresh()
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Ulasan tidak terkirim')
      setSibuk(false)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk menulis ulasan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ulasan hanya bisa ditulis penghuni yang pernah atau sedang menempati kamarnya.
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

  if (user.role !== 'TENANT') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Ulasan ditulis penghuni</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Yang menilai kos adalah orang yang pernah tinggal di dalamnya. Pemilik properti membacanya
          di halaman kosnya.
        </p>
        <Link
          href="/ulasan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buka daftar ulasan
        </Link>
      </div>
    )
  }

  if (sewa.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Belum ada sewa yang bisa dinilai</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ulasan bisa ditulis untuk sewa yang sedang berjalan atau yang sudah selesai, dan setiap
          sewa hanya mekar sekali. Kalau Anda sudah menilai semuanya, ulasannya ada di halaman
          ulasan.
        </p>
        <Link
          href="/ulasan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke ulasan saya
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/ulasan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Ulasan saya
      </Link>

      <header className="mt-4">
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Tulis ulasan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ceritakan pengalaman Anda selama menempati kosnya. Ulasan ditayangkan di halaman kos
          setelah ditinjau admin, dan setelah itu masih bisa Anda ubah.
        </p>
      </header>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      <form
        onSubmit={kirim}
        className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Sewa yang dinilai</span>
          <select
            value={kontrakId}
            onChange={(event) => setKontrakId(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sewa.map((item) => (
              <option key={item.id} value={item.id}>
                {item.propertyName} · kamar {item.roomNumber}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Hanya sewa Anda yang sudah berjalan atau selesai, dan yang belum pernah Anda nilai.
          </span>
        </label>

        <div className="space-y-5 border-t border-border pt-5">
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
            placeholder="Mis. Air panas stabil, tapi parkir motor sempit saat malam. Pemilik cepat menanggapi saat lampu kamar mati."
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground">
            Tulis hal yang bisa diperiksa pembaca berikutnya. Nama orang, tuduhan, dan hal yang tidak
            Anda alami sendiri bisa membuat ulasan ditolak admin.
          </span>
        </label>

        <button
          type="submit"
          disabled={sibuk}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
        >
          {sibuk ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          Kirim ulasan
        </button>
      </form>
    </div>
  )
}
