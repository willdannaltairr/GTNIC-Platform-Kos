import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Navigation } from 'lucide-react'
import { PROPERTY_TYPE_LABEL, formatJarak, formatRupiah } from '@/lib/format'
import type { FaktorSkor, HasilKosMatch } from '@/lib/kosmatch'
import { cn } from '@/lib/utils'

/**
 * Satu hasil KosMatch beserta rincian faktornya.
 *
 * Persentasenya tidak pernah tampil sendiri. Setiap skor selalu disertai
 * rincian faktor yang membentuknya, karena angka kecocokan tanpa penjelasan
 * persis angka yang dilarang dipakai: yang membuatnya berguna bukan
 * persentasenya, melainkan alasan di baliknya.
 *
 * Faktor yang tidak dihitung ditampilkan apa adanya dengan keterangan, bukan
 * disembunyikan. Pengguna yang mengosongkan anggaran berhak tahu bahwa harganya
 * memang tidak ikut dinilai, bukan menyangka dirinya kebetulan cocok.
 */

/**
 * Nada warna lencana skor.
 *
 * Sampai di puncak, warna dipakai untuk menunjukkan seberapa kuat kecocokannya.
 * Skor rendah justru tidak diberi merah: hasil yang tidak cocok bukan kesalahan
 * penggunanya, dan merah di situ terbaca seperti pesan galat.
 */
const nadaSkor = (skor: number): string => {
  if (skor >= 75) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (skor >= 50) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-muted text-muted-foreground ring-border'
}

/** Lebar batang skor faktor, dijaga di dalam rentang 0 sampai 100. */
const lebar = (skor: number | null): string => {
  if (skor === null) return '0%'
  return `${Math.max(0, Math.min(100, skor))}%`
}

function BarisFaktor({ faktor }: { faktor: FaktorSkor }) {
  const dihitung = faktor.skor !== null

  return (
    <li className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-xs font-medium text-foreground">
          {faktor.label}
          <span className="ml-1.5 font-normal text-muted-foreground">bobot {faktor.bobot}</span>
        </span>

        <span className={cn('text-xs font-semibold', dihitung ? 'text-foreground' : 'text-muted-foreground')}>
          {dihitung ? `${faktor.skor}` : 'tidak dihitung'}
        </span>
      </div>

      <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className={cn('block h-full rounded-full', dihitung ? 'bg-primary' : 'bg-transparent')}
          style={{ width: lebar(faktor.skor) }}
        />
      </span>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{faktor.alasan}</p>
    </li>
  )
}

export function KartuKecocokan({ hasil, peringkat }: { hasil: HasilKosMatch; peringkat: number }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <Link
          href={`/kos/${hasil.slug}`}
          className="relative block aspect-[4/3] shrink-0 overflow-hidden rounded-xl bg-muted sm:aspect-square sm:w-40"
        >
          {hasil.imageUrl ? (
            <Image
              src={hasil.imageUrl}
              alt={hasil.imageAlt ?? hasil.name}
              fill
              sizes="(max-width: 640px) 100vw, 160px"
              className="object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center px-2 text-center text-xs text-muted-foreground">
              Foto belum tersedia
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Peringkat {peringkat}
              </p>
              <h3 className="mt-1 text-base font-semibold tracking-tight">
                <Link href={`/kos/${hasil.slug}`} className="hover:underline">
                  {hasil.name}
                </Link>
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">
                  {hasil.district}, {hasil.city}
                </span>
              </p>
            </div>

            <span
              className={cn(
                'shrink-0 rounded-2xl px-3 py-2 text-center ring-1',
                nadaSkor(hasil.skorTotal),
              )}
            >
              <span className="block text-xl font-bold leading-none tracking-tight">
                {hasil.skorTotal}
                <span className="text-xs font-semibold">%</span>
              </span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.1em]">
                kecocokan
              </span>
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Harga termurah</dt>
              <dd className="mt-0.5 font-semibold">
                {formatRupiah(hasil.hargaTermurah)}
                <span className="font-normal text-muted-foreground"> /bulan</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kamar tersedia</dt>
              <dd className="mt-0.5 font-semibold">{hasil.kamarTersedia}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jarak</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold">
                {hasil.jarakKm !== null && (
                  <Navigation className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                )}
                {hasil.jarakKm === null ? 'Tidak diukur' : formatJarak(hasil.jarakKm)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jenis</dt>
              <dd className="mt-0.5 font-semibold">
                {PROPERTY_TYPE_LABEL[hasil.propertyType] ?? hasil.propertyType}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-border px-4 pb-4 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Dari mana angka ini
        </p>

        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {hasil.faktor.map((faktor) => (
            <BarisFaktor key={faktor.id} faktor={faktor} />
          ))}
        </ul>
      </div>
    </article>
  )
}
