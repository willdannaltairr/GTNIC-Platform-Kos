'use client'

import Link from 'next/link'
import { Check, Scale } from 'lucide-react'
import { MAKS_BANDINGKAN, useBandingkan } from '@/lib/bandingkan'
import { cn } from '@/lib/utils'

/**
 * Tombol tambah atau lepas dari daftar perbandingan.
 *
 * Dua bentuk, dipakai di dua tempat yang berbeda kebutuhannya: ikon bulat di
 * sudut kartu, dan tombol lebar berlabel di halaman detail. Yang ikon hanya
 * memberi tahu keadaannya lewat warna dan label pembaca layar; yang lebar
 * menuliskannya, karena di sana tidak ada kartu lain yang menjelaskan.
 *
 * Tombolnya tidak pernah mengarahkan ke halaman lain: menandai kos untuk
 * dibandingkan adalah keputusan yang diambil sambil melihat beberapa pilihan,
 * dan berpindah halaman setiap kali menandai membuat orang kehilangan tempat.
 * Tautan ke halaman perbandingan ada di navbar dan di halaman perbandingan itu
 * sendiri.
 */
export function TombolBandingkan({
  slug,
  varian = 'ikon',
  className,
}: {
  slug: string
  varian?: 'ikon' | 'lebar'
  className?: string
}) {
  const { daftar, penuh, tambah, hapus } = useBandingkan()
  const terpilih = daftar.includes(slug)
  const mati = !terpilih && penuh

  const label = terpilih
    ? 'Hapus dari perbandingan'
    : mati
      ? `Perbandingan penuh, maksimal ${MAKS_BANDINGKAN} kos`
      : 'Tambahkan ke perbandingan'

  const tekan = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    if (terpilih) {
      hapus(slug)
      return
    }

    if (!mati) tambah(slug)
  }

  if (varian === 'lebar') {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={tekan}
          disabled={mati}
          aria-pressed={terpilih}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors disabled:opacity-60',
            terpilih
              ? 'border-primary bg-secondary text-primary'
              : 'border-border hover:bg-muted',
          )}
        >
          {terpilih ? (
            <Check className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <Scale className="size-4 shrink-0" aria-hidden="true" />
          )}
          {terpilih ? 'Masuk daftar perbandingan' : 'Bandingkan kos ini'}
        </button>

        {terpilih && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Kos ini ada di daftar perbandingan Anda.{' '}
            <Link href="/bandingkan" className="font-medium text-primary hover:text-primary-strong">
              Buka perbandingan
            </Link>
          </p>
        )}

        {mati && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Daftar perbandingan sudah berisi {MAKS_BANDINGKAN} kos. Lepas salah satu dulu untuk
            menambahkan yang ini.
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={tekan}
      disabled={mati}
      aria-label={label}
      aria-pressed={terpilih}
      title={label}
      className={cn(
        'grid size-8 place-items-center rounded-full bg-background/90 ring-1 ring-border backdrop-blur transition-colors hover:bg-background disabled:opacity-60',
        className,
      )}
    >
      {terpilih ? (
        <Check className="size-4 text-primary" aria-hidden="true" />
      ) : (
        <Scale className="size-4 text-muted-foreground" aria-hidden="true" />
      )}
    </button>
  )
}
