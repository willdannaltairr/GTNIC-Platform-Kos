import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GraduationCap, MapPin } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { JudulHalaman, MataSeksi, Seksi, TOMBOL_SEKUNDER } from '@/components/site/kerangka'
import { fetchCampusDetail } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Radius yang bisa dipilih pengunjung, dalam kilometer. */
const RADIUS = [2, 5, 10, 20] as const
const RADIUS_BAWAAN = 5

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

/**
 * Radius dari alamat halaman.
 *
 * Hanya nilai yang ada di daftar yang diterima. Nilai lain diabaikan dan
 * radius bawaannya yang dipakai: alamat halaman bisa diketik siapa saja, dan
 * radius yang tidak terduga membuat daftarnya menampilkan hal yang tidak
 * diminta pengunjung tanpa penjelasan.
 */
const radiusDari = (nilai: string): number => {
  const angka = Number.parseInt(nilai, 10)
  return RADIUS.includes(angka as (typeof RADIUS)[number]) ? angka : RADIUS_BAWAAN
}

/**
 * Judul dan deskripsi halaman diambil dari data kampusnya.
 *
 * notFound() dipanggil di sini juga, bukan hanya di komponen halaman, supaya
 * status HTTP-nya tetap 404 saat kampusnya tidak ada - bukan halaman 404
 * berstatus 200.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const hasil = await fetchCampusDetail(slug)

  if (hasil === null) notFound()

  return {
    title: `Kos dekat ${hasil.campus.name}`,
    description: `Kos terverifikasi di sekitar ${hasil.campus.name}, ${hasil.campus.city}, diurutkan dari yang paling dekat dengan kampusnya.`,
  }
}

/**
 * Kos di sekitar satu kampus.
 *
 * Halaman ini menjawab pertanyaan yang tidak dijawab pencarian biasa: kos mana
 * yang benar-benar dekat kampus ini. Jaraknya diukur dari kampus, bukan dari
 * lokasi pembaca, sehingga urutannya sama untuk semua orang dan angkanya bisa
 * dibandingkan antar-kos. Itu juga sebabnya pilihan radiusnya dari kampus,
 * bukan "dari lokasi Anda".
 *
 * Radiusnya bisa diubah pengunjung lewat alamat halaman, bukan lewat keadaan di
 * peramban: hasil pencarian yang bisa dibagikan lebih berguna daripada pilihan
 * yang hilang saat halaman ditutup.
 */
export default async function KampusPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { slug } = await params
  const sp = await searchParams
  const radiusKm = radiusDari(first(sp.radiusKm))

  const hasil = await fetchCampusDetail(slug, { radiusKm, limit: 12 })

  if (hasil === null) notFound()

  const { campus, items } = hasil
  const sebutan = campus.abbreviation ?? campus.name

  return (
    <>
      <Seksi garis={false}>
        <nav className="text-xs text-muted-foreground">
          <Link href="/kawasan" className="hover:text-foreground">
            Kawasan
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{sebutan}</span>
        </nav>

        <div className="mt-5">
          <JudulHalaman
            eyebrow="Kampus"
            title={`Kos dekat ${sebutan}`}
            description={
              <>
                {campus.name}, {campus.city}, {campus.province}. Jarak di halaman ini diukur
                dari kampusnya, bukan dari lokasi Anda, jadi urutannya sama untuk siapa pun dan
                bisa dibandingkan antar-kos.
              </>
            }
            aksi={
              <Link href={`/kos?city=${encodeURIComponent(campus.city)}`} className={TOMBOL_SEKUNDER}>
                <MapPin className="size-4" aria-hidden="true" />
                Semua kos di {campus.city}
              </Link>
            }
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Jarak dari kampus</span>

          {RADIUS.map((pilihan) => {
            const aktif = pilihan === radiusKm

            return (
              <Link
                key={pilihan}
                href={`/kampus/${campus.slug}${pilihan === RADIUS_BAWAAN ? '' : `?radiusKm=${pilihan}`}`}
                aria-current={aktif ? 'true' : undefined}
                className={cn(
                  'inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium tabular-nums transition-colors',
                  aktif
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/40',
                )}
              >
                {pilihan} km
              </Link>
            )
          })}
        </div>
      </Seksi>

      <Seksi>
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold">
              Belum ada kos terverifikasi dalam {radiusKm} km dari {sebutan}
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Kos yang muncul di sini hanya yang sudah terbit dan lolos verifikasi admin, jadi
              daftarnya memang bisa kosong di kampus yang belum banyak pemiliknya. Coba perluas
              radiusnya, atau lihat seluruh kos di {campus.city}.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {RADIUS.filter((pilihan) => pilihan > radiusKm).map((pilihan) => (
                <Link key={pilihan} href={`/kampus/${campus.slug}?radiusKm=${pilihan}`} className={TOMBOL_SEKUNDER}>
                  Perluas ke {pilihan} km
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                  {formatNumber(items.length)} kos dalam {radiusKm} km
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Diurutkan dari yang paling dekat dengan {sebutan}. Angka di tiap kartu adalah
                  jarak lurus propertinya ke kampus, bukan jarak tempuh lewat jalan.
                </p>
              </div>
            </div>

            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="min-w-0">
                  <PropertyCard property={item} jarakDari={sebutan} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Seksi>

      {/* Bagian ini menyebut apa yang tidak dihitung halaman ini. Jarak lurus
          selalu lebih pendek daripada jarak tempuh, dan pengunjung yang menyangka
          sebaliknya akan kecewa saat survei - bukan karena datanya salah,
          melainkan karena tidak ada yang memberi tahu bedanya. */}
      <Seksi nada="gelap">
        <div className="max-w-3xl">
          <MataSeksi tone="dark">Cara membaca jaraknya</MataSeksi>

          <h2 className="mt-3 text-balance font-heading text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            Jarak lurus, bukan jarak tempuh.
          </h2>

          <p className="mt-4 text-[15px] leading-[1.8] text-primary-foreground/80">
            Angka jarak di halaman ini dihitung dari koordinat kampus ke koordinat properti,
            jadi bentuknya garis lurus. Jarak yang benar-benar Anda tempuh bisa lebih jauh,
            tergantung jalan, belokan, dan angkutan yang dipakai. Pakai angka ini untuk menyaring
            pilihan, lalu periksa rutenya di peta sebelum berangkat survei.
          </p>

          <p className="mt-4 text-[15px] leading-[1.8] text-primary-foreground/80">
            Kos yang belum punya koordinat tidak ikut dihitung jaraknya, karena mengarang titik
            hanya akan menghasilkan angka yang tampak pasti padahal bukan. Kos seperti itu tetap
            bisa ditemukan lewat pencarian biasa.
          </p>
        </div>
      </Seksi>
    </>
  )
}
