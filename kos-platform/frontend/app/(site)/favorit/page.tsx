'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/session/session-provider'
import { PropertyCard } from '@/components/property-card'
import { fetchFavorites } from '@/lib/favorites'
import type { PropertyListItem } from '@/lib/api'

/**
 * Halaman kos favorit.
 *
 * Daftarnya dikirim backend dalam bentuk kartu yang sama dengan halaman
 * pencarian, jadi kartunya tampil utuh tanpa pemanggilan tambahan. Properti
 * yang sudah tidak dipublikasikan tidak ikut muncul: kartunya akan menuju
 * halaman yang tidak ada.
 */
export default function FavoritPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<PropertyListItem[] | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchFavorites().then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk menyimpan favorit</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Favorit tersimpan di akun Anda, jadi bisa dibuka lagi dari perangkat lain.
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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header>
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Kos favorit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {daftar && daftar.length > 0
            ? `${daftar.length} kos disimpan.`
            : 'Kos yang Anda simpan akan muncul di sini.'}
        </p>
      </header>

      <div className="mt-6">
        {daftar === null ? (
          <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            Daftar favorit belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
          </p>
        ) : daftar.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <p className="text-sm font-medium">Belum ada kos yang disimpan.</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Tekan ikon hati pada kartu kos untuk menyimpannya ke sini.
            </p>
            <Link
              href="/kos"
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
            >
              Cari kos
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {daftar.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
