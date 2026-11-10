'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, Bookmark, Loader2, Trash2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow } from '@/components/dashboard/kit'
import {
  fetchPencarianTersimpan,
  hapusPencarian,
  keKueriKos,
  ringkasPenyaring,
  type PencarianTersimpan,
} from '@/lib/saved-searches'
import { formatTanggal } from '@/lib/format'

/**
 * Daftar pencarian tersimpan.
 *
 * Yang ditampilkan adalah penyaring yang tersimpan beserta kapan pencarian itu
 * terakhir menghasilkan pemberitahuan. Waktu itu ditaruh di tiap baris karena
 * pertanyaan pertama pemiliknya biasanya "apakah ini masih jalan", dan tanpa
 * keterangan itu ia tidak punya cara tahu selain menunggu pemberitahuan yang
 * mungkin memang belum ada.
 *
 * Pemberitahuannya sendiri muncul di halaman notifikasi seperti notifikasi lain.
 * Halaman ini tempat mengelola pencariannya: melihat, membuka hasilnya lagi, dan
 * menghapus yang sudah tidak dipakai.
 */
export default function PencarianTersimpanPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<PencarianTersimpan[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sedangHapus, setSedangHapus] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = useCallback(async (): Promise<void> => {
    setDaftar(await fetchPencarianTersimpan())
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchPencarianTersimpan().then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const hapus = async (item: PencarianTersimpan): Promise<void> => {
    setSedangHapus(item.id)
    setPesan(null)

    const berhasil = await hapusPencarian(item.id)

    if (berhasil) {
      setPesan(`Pencarian "${item.name}" dihapus.`)
      await muat()
    } else {
      setPesan(`Pencarian "${item.name}" tidak bisa dihapus sekarang. Coba lagi.`)
    }

    setSedangHapus(null)
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Masuk untuk melihat pencarian tersimpan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pencarian tersimpan melekat pada akun Anda, jadi bisa dibuka lagi dari perangkat lain.
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header>
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
          Pencarian tersimpan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Setiap pencarian di bawah diawasi: begitu ada kos baru terbit yang cocok dengan
          penyaringnya, Anda menerima pemberitahuan di halaman notifikasi.
        </p>
      </header>

      {pesan && (
        <p className="mt-5 rounded-2xl bg-accent/60 px-4 py-3 text-sm text-accent-foreground ring-1 ring-primary/15">
          {pesan}
        </p>
      )}

      <div className="mt-6">
        {daftar === null ? (
          <EmptyRow>
            Daftar pencarian belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang
            halaman.
          </EmptyRow>
        ) : daftar.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <Bookmark className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium">Belum ada pencarian yang disimpan.</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Buka halaman cari kos, isi penyaringnya, lalu tekan "Simpan pencarian ini". Pencarian
              yang disimpan akan memberi tahu Anda saat ada kos baru yang cocok.
            </p>
            <Link
              href="/kos"
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
            >
              Cari kos
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {daftar.map((item) => {
              const bagian = ringkasPenyaring(item.filters)

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold tracking-tight">{item.name}</h2>

                      <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {bagian.length > 0 ? (
                          bagian.map((satu) => (
                            <span
                              key={satu}
                              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80"
                            >
                              {satu}
                            </span>
                          ))
                        ) : (
                          <span>Tanpa penyaring</span>
                        )}
                      </p>

                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <BellRing className="size-3 shrink-0" aria-hidden="true" />
                        {item.lastNotifiedAt === null
                          ? `Disimpan ${formatTanggal(item.createdAt)}, belum ada kos baru yang cocok`
                          : `Terakhir diberitakan ${formatTanggal(item.lastNotifiedAt)}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/kos?${keKueriKos(item.filters)}`}
                        className="inline-flex h-9 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/40"
                      >
                        Buka hasilnya
                      </Link>

                      <button
                        type="button"
                        onClick={() => void hapus(item)}
                        disabled={sedangHapus === item.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
                      >
                        {sedangHapus === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        )}
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Pemberitahuan dikirim sekali untuk setiap kos baru yang cocok, tepat saat kosnya pertama
        kali terbit. Kos yang ditarik pemiliknya lalu diterbitkan ulang tidak diberitakan lagi,
        karena bagi Anda kos itu bukan kos baru.
      </p>
    </div>
  )
}
