'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BellRing, BookmarkPlus, Check, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { simpanPencarian } from '@/lib/saved-searches'

/**
 * Tombol simpan pencarian di halaman cari kos.
 *
 * Diletakkan menempel pada penyaringnya, bukan di halaman terpisah: yang
 * disimpan adalah penyaring yang sedang dipakai, dan memindahkan tombolnya ke
 * halaman lain memaksa pengunjung menyusun ulang penyaringnya di sana.
 *
 * Nama pencariannya diminta lewat isian pendek, bukan diambil otomatis dari
 * penyaringnya. Nama otomatis seperti "Bandung, 2 fasilitas" terdengar rapi
 * sampai ada tiga pencarian Bandung yang berbeda, dan saat itu pemiliknya tidak
 * punya cara membedakannya.
 *
 * Tamu melihat tombolnya tapi diarahkan masuk lebih dulu, bukan disembunyikan:
 * menyembunyikannya membuat fitur ini tidak pernah diketahui orang yang justru
 * paling membutuhkannya.
 */
export function TombolSimpanPencarian({
  filters,
  adaIsi,
}: {
  /** Penyaring yang sedang dipakai, bentuknya sama dengan kueri di alamat halaman. */
  filters: Record<string, string | number | undefined>
  /** Apakah ada setidaknya satu penyaring yang terisi. */
  adaIsi: boolean
}) {
  const { user, status } = useSession()
  const [terbuka, setTerbuka] = useState(false)
  const [nama, setNama] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)

  const simpan = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const bersih = nama.trim()
    if (bersih.length < 2) return

    setSibuk(true)
    setPesan(null)

    try {
      await simpanPencarian(bersih, filters)
      setTerbuka(false)
      setNama('')
      setPesan({ nada: 'sukses', teks: `Pencarian "${bersih}" disimpan.` })
    } catch (error) {
      setPesan({ nada: 'bahaya', teks: (error as Error).message })
    } finally {
      setSibuk(false)
    }
  }

  // Tanpa penyaring apa pun, yang disimpan adalah "seluruh kos di platform" dan
  // pemberitahuannya akan berbunyi untuk setiap kos baru. Itu bukan pencarian,
  // itu langganan, dan tidak ada yang menginginkannya tanpa sadar.
  if (!adaIsi) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Isi minimal satu penyaring kalau ingin menyimpan pencarian ini dan diberi tahu saat ada kos
        baru yang cocok.
      </p>
    )
  }

  if (status === 'memuat') {
    return <div className="h-9 w-44 animate-pulse rounded-full bg-muted" />
  }

  if (!user) {
    return (
      <Link
        href="/masuk"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
      >
        <BellRing className="size-4" aria-hidden="true" />
        Masuk untuk menyimpan pencarian
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {terbuka ? (
        <form onSubmit={simpan} className="flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Nama pencarian</span>
            <input
              type="text"
              value={nama}
              onChange={(event) => setNama(event.target.value)}
              placeholder="Nama pencarian, mis. Kos putri Bandung"
              autoFocus
              maxLength={80}
              className="h-9 w-full rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={sibuk || nama.trim().length < 2}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Simpan
          </button>

          <button
            type="button"
            onClick={() => {
              setTerbuka(false)
              setPesan(null)
            }}
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Batal
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <BookmarkPlus className="size-4" aria-hidden="true" />
          Simpan pencarian ini
        </button>
      )}

      {pesan && (
        <p
          role="status"
          className={
            pesan.nada === 'sukses'
              ? 'inline-flex items-center gap-2 text-xs text-emerald-700'
              : 'text-xs text-rose-600'
          }
        >
          {pesan.nada === 'sukses' && <Check className="size-3.5" aria-hidden="true" />}
          {pesan.teks}
          {pesan.nada === 'sukses' && (
            <Link href="/pencarian-tersimpan" className="font-medium underline">
              Lihat daftarnya
            </Link>
          )}
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Kami akan memberi tahu Anda saat ada kos baru yang cocok dengan penyaring ini.
      </p>
    </div>
  )
}
