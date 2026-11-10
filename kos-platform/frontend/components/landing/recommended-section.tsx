import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { fetchProperties } from '@/lib/api'

/**
 * Kos terbaru dari API.
 *
 * Data diambil dari properti terverifikasi yang sudah dipublikasikan. Bila API
 * tidak dapat dihubungi, bagian ini menjelaskan keadaannya, tidak mengarang
 * daftar kos contoh, karena kartu properti di sini akan diklik orang.
 *
 * Kartu di bagian ini memakai mode `gated`: foto dan namanya tetap tampil
 * sebagai gambaran isi platform, tetapi kliknya berhenti di halaman masuk
 * sampai pengunjung punya akun.
 */
export async function RecommendedSection() {
  const result = await fetchProperties({ limit: 6, sort: 'newest' })

  return (
    <section id="kos-terbaru" aria-labelledby="kos-terbaru-title" className="scroll-mt-20 border-y border-border bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-foreground/70 ring-1 ring-black/5">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              Kos terverifikasi
            </p>

            <h2
              id="kos-terbaru-title"
              className="mt-5 text-balance font-heading text-[2.15rem] font-light leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl"
            >
              Kos terbaru di platform.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Properti yang sudah lolos verifikasi admin. Status ketersediaan mengikuti konfirmasi
              terakhir dari pemilik, termasuk kamar yang perlu dikonfirmasi ulang.
            </p>
          </div>

          <Link
            href="/masuk"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full text-sm font-medium text-primary transition-colors hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          >
            Lihat semua kos
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {result && result.items.length > 0 ? (
          <>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((property) => (
                <PropertyCard key={property.id} property={property} gated />
              ))}
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Menampilkan {result.items.length} dari {result.meta.total} properti terverifikasi.
            </p>
          </>
        ) : (
          <div className="mt-12 rounded-[1.75rem] border border-dashed border-border bg-white/60 p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {result === null
                ? 'Daftar properti belum dapat dimuat.'
                : 'Belum ada properti terverifikasi yang dipublikasikan.'}
            </p>

            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              {result === null
                ? 'Server API tidak merespons saat halaman ini dirender. Periksa koneksi ke layanan API lalu muat ulang halaman.'
                : 'Properti akan tampil di sini setelah pemilik melengkapi data dan admin memverifikasinya.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
