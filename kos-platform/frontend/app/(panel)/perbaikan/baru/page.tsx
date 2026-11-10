'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import {
  createLaporan,
  KATEGORI_PERBAIKAN,
  type PerbaikanKategori,
  type PerbaikanPrioritas,
} from '@/lib/maintenance'
import { fetchKontrak, type Kontrak } from '@/lib/contracts'
import { cn } from '@/lib/utils'

/**
 * Formulir laporan perbaikan baru.
 *
 * Hanya penghuni, dan hanya untuk kamar yang sedang disewanya. Pilihannya
 * karena itu bukan daftar seluruh kos di platform, melainkan kontrak aktif
 * miliknya sendiri. Kontrak yang dipakai, bukan properti, karena satu properti
 * bisa disewa di lebih dari satu kamar, dan laporan harus menunjuk kamar yang
 * benar.
 *
 * Server tetap menolak laporan untuk kamar yang tidak disewa, jadi daftar ini
 * kemudahan, bukan batas keamanan.
 */

const PRIORITAS: { nilai: PerbaikanPrioritas; label: string; keterangan: string }[] = [
  { nilai: 'LOW', label: 'Rendah', keterangan: 'Bisa ditunggu, tidak mengganggu harian' },
  { nilai: 'MEDIUM', label: 'Sedang', keterangan: 'Mengganggu, tapi masih bisa dipakai' },
  { nilai: 'HIGH', label: 'Tinggi', keterangan: 'Sulit dipakai sehari-hari' },
  { nilai: 'URGENT', label: 'Mendesak', keterangan: 'Berbahaya atau membuat kamar tidak layak' },
]

export default function PerbaikanBaruPage() {
  const router = useRouter()
  const { user, status } = useSession()
  const [sewa, setSewa] = useState<Kontrak[]>([])
  const [kontrakId, setKontrakId] = useState('')
  const [siap, setSiap] = useState(false)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PerbaikanKategori>('ELEKTRIK')
  const [priority, setPriority] = useState<PerbaikanPrioritas>('MEDIUM')
  const [description, setDescription] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    // Hanya sewa yang benar-benar berjalan yang bisa dilaporkan: laporan untuk
    // sewa yang sudah berakhir tidak bisa ditangani siapa pun, karena pemilik
    // propertinya sudah tidak punya kewajiban atas kamar itu.
    void fetchKontrak('ACTIVE').then((hasil) => {
      if (!aktif) return
      const daftar = hasil ?? []
      setSewa(daftar)
      setKontrakId(daftar[0]?.id ?? '')
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const kontrak = sewa.find((item) => item.id === kontrakId)
    if (!kontrak) {
      setPesan('Pilih dulu sewa yang bermasalah.')
      return
    }

    setSibuk(true)
    setPesan(null)

    try {
      const hasil = await createLaporan({
        propertyId: kontrak.propertyId,
        roomId: kontrak.roomId,
        title: title.trim(),
        category,
        priority,
        description: description.trim() || undefined,
      })

      router.push(`/perbaikan/${hasil.id}`)
      router.refresh()
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Laporan tidak terkirim')
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
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk melaporkan kerusakan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Laporan perbaikan hanya bisa dibuat penghuni yang sedang menempati kamarnya.
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
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Laporan dibuat penghuni</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Yang melaporkan kerusakan adalah penghuni yang menempati kamarnya. Pemilik properti
          memindahkan status laporan, bukan membuatnya.
        </p>
        <Link
          href="/perbaikan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buka daftar laporan
        </Link>
      </div>
    )
  }

  if (sewa.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Belum ada sewa yang berjalan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Laporan perbaikan hanya bisa dibuat untuk kamar yang sedang Anda sewa. Belum ada kontrak
          aktif di akun ini.
        </p>
        <Link
          href="/perbaikan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/perbaikan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Laporan perbaikan
      </Link>

      <header className="mt-4">
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Lapor kerusakan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tulis apa yang rusak sedetail mungkin. Setelah tersimpan, fotonya bisa ditambahkan dari
          halaman laporan, dan pemilik properti menerima pemberitahuannya.
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
        className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Sewa yang bermasalah</span>
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
            Hanya kamar yang sedang Anda sewa yang bisa dilaporkan.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Judul singkat</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={5}
            maxLength={150}
            placeholder="Mis. Lampu kamar mati sejak kemarin"
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground">
            Minimal 5 karakter, supaya jelas apa yang rusak tanpa harus membuka laporannya.
          </span>
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Kategori</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {KATEGORI_PERBAIKAN.map((item) => (
              <label
                key={item.nilai}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  category === item.nilai
                    ? 'border-primary bg-secondary font-medium'
                    : 'border-border hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="kategori"
                  value={item.nilai}
                  checked={category === item.nilai}
                  onChange={() => setCategory(item.nilai)}
                  className="size-4 accent-[var(--primary)]"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Seberapa mendesak</legend>
          <div className="grid gap-2">
            {PRIORITAS.map((item) => (
              <label
                key={item.nilai}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
                  priority === item.nilai
                    ? 'border-primary bg-secondary'
                    : 'border-border hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="prioritas"
                  value={item.nilai}
                  checked={priority === item.nilai}
                  onChange={() => setPriority(item.nilai)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.keterangan}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Keterangan tambahan</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Mis. Lampu utama dan lampu baca mati, sakelarnya juga tidak bereaksi"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
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
          Kirim laporan
        </button>
      </form>
    </div>
  )
}
