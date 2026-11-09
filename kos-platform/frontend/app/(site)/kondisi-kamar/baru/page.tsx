'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Play } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { fetchKontrak, type Kontrak } from '@/lib/contracts'
import {
  buatPemeriksaan,
  fetchPemeriksaan,
  JENIS_PEMERIKSAAN,
  type JenisPemeriksaan,
} from '@/lib/room-condition'
import { cn } from '@/lib/utils'

/**
 * Mulai satu pemeriksaan kondisi kamar.
 *
 * Pilihannya kontrak, bukan properti: yang berhak memeriksa kamar adalah orang
 * yang menempatinya, dan hanya kontraknya yang membuktikan itu. Server menolak
 * kontrak yang bukan milik penghuninya, jadi daftar ini kemudahan, bukan batas
 * keamanan.
 *
 * Jenis pemeriksaan yang sudah ada untuk kontrak itu disembunyikan dari
 * pilihan: pemeriksaan masuk dan keluar hanya satu per kontrak, dan
 * menawarkannya lagi hanya menghasilkan penolakan di akhir pengisian.
 */
export default function KondisiKamarBaruPage() {
  const router = useRouter()
  const { user, status } = useSession()
  const [sewa, setSewa] = useState<Kontrak[]>([])
  const [kontrakId, setKontrakId] = useState('')
  const [jenis, setJenis] = useState<JenisPemeriksaan>('CHECK_IN')
  const [sudahAda, setSudahAda] = useState<string[]>([])
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

    void Promise.all([fetchKontrak(), fetchPemeriksaan()]).then(([kontrak, pemeriksaan]) => {
      if (!aktif) return

      // Kontrak aktif untuk pemeriksaan masuk dan berkala; kontrak yang sudah
      // selesai tetap boleh untuk pemeriksaan keluar, karena serah terima
      // kunci sering terjadi beberapa hari setelah kontraknya berakhir.
      const bisa = (kontrak ?? []).filter(
        (item) => item.status === 'ACTIVE' || item.status === 'COMPLETED',
      )

      setSewa(bisa)
      setKontrakId(bisa[0]?.id ?? '')
      setSudahAda((pemeriksaan ?? []).map((item) => `${item.contractId}:${item.reportType}`))
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const sudah = (nilai: JenisPemeriksaan): boolean => sudahAda.includes(`${kontrakId}:${nilai}`)

  const bisaDipilih = (nilai: JenisPemeriksaan): boolean => {
    if (sudah(nilai)) return false

    const kontrak = sewa.find((item) => item.id === kontrakId)
    if (!kontrak) return false

    // Pemeriksaan keluar dari kontrak yang belum selesai memang bisa dibuat —
    // pemilik dan penghuni sering sepakat berhenti lebih awal — tetapi
    // pemeriksaan masuk dan berkala menuntut kontrak yang sedang berjalan.
    if (nilai === 'CHECK_OUT') return kontrak.status === 'ACTIVE' || kontrak.status === 'COMPLETED'
    return kontrak.status === 'ACTIVE'
  }

  const pilihan = JENIS_PEMERIKSAAN.filter((item) => !sudah(item.nilai))
  const adaPilihan = pilihan.some((item) => bisaDipilih(item.nilai))

  const mulai = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!kontrakId) {
      setPesan('Pilih dulu sewa yang kamarnya diperiksa.')
      return
    }

    if (!bisaDipilih(jenis)) {
      setPesan(
        sudah(jenis)
          ? 'Pemeriksaan jenis ini sudah ada untuk sewa itu. Lanjutkan yang ada, tidak perlu dibuat kedua.'
          : 'Sewa itu belum berjalan, jadi belum ada kamar yang bisa diperiksa.',
      )
      return
    }

    setSibuk(true)
    setPesan(null)

    try {
      const hasil = await buatPemeriksaan({ contractId: kontrakId, reportType: jenis })
      router.push(`/kondisi-kamar/${hasil.id}`)
      router.refresh()
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Pemeriksaan tidak terbentuk')
      setSibuk(false)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk mencatat kondisi kamar</h1>
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
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Pemeriksaan dibuat penghuni</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Yang mencatat keadaan kamar adalah orang yang menempatinya. Pemilik menyetujui atau
          mengajukan keberatan atas catatan itu.
        </p>
        <Link
          href="/kondisi-kamar"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buka daftar pemeriksaan
        </Link>
      </div>
    )
  }

  if (sewa.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Belum ada sewa yang bisa diperiksa</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pemeriksaan kondisi dibuat untuk kamar yang sedang atau pernah Anda sewa. Belum ada
          kontrak seperti itu di akun ini.
        </p>
        <Link
          href="/kontrak"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buka kontrak sewa
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/kondisi-kamar"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kondisi kamar
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pemeriksaan baru</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Setelah dibuat, Anda mengisi keadaan tiap bagian kamar beserta fotonya, lalu mengirimnya
          ke pemilik untuk disetujui. Catatan yang sudah disetujui tidak bisa diubah lagi.
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

      {!adaPilihan && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Seluruh sewa Anda sudah punya pemeriksaan masuk dan keluarnya. Bila ada yang perlu dicatat
          lagi di tengah masa sewa, pilih pemeriksaan berkala pada salah satu sewa yang berjalan.
        </p>
      )}

      <form
        onSubmit={mulai}
        className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Sewa yang diperiksa</span>
          <select
            value={kontrakId}
            onChange={(event) => setKontrakId(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sewa.map((item) => (
              <option key={item.id} value={item.id}>
                {item.propertyName} · kamar {item.roomNumber} · {item.contractNumber}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Pemeriksaan masuk dan keluar hanya satu untuk tiap sewa.
          </span>
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Jenis pemeriksaan</legend>
          <div className="grid gap-2">
            {JENIS_PEMERIKSAAN.map((item) => {
              const terpakai = sudah(item.nilai)
              const boleh = bisaDipilih(item.nilai)

              return (
                <label
                  key={item.nilai}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
                    !boleh
                      ? 'cursor-not-allowed border-border opacity-60'
                      : 'cursor-pointer',
                    boleh && jenis === item.nilai
                      ? 'border-primary bg-secondary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="jenis"
                    value={item.nilai}
                    checked={jenis === item.nilai}
                    disabled={!boleh}
                    onChange={() => setJenis(item.nilai)}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {terpakai ? 'Sudah ada untuk sewa ini.' : item.keterangan}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={sibuk || !adaPilihan}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
        >
          {sibuk ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          Mulai pemeriksaan
        </button>
      </form>
    </div>
  )
}
