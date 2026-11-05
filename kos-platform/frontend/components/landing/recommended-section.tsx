import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { fetchProperties } from '@/lib/api'

/**
 * Rekomendasi properti untuk beranda.
 *
 * Data diambil dari API (properti terverifikasi & terpublikasi). Bila API
 * tidak dapat dihubungi, bagian ini menjelaskan keadaannya — tidak mengarang
 * daftar kos contoh.
 */
export async function RecommendedSection() {
  const result = await fetchProperties({ limit: 6, sort: 'newest' })

  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Kos Terbaru di Platform</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Properti yang sudah lolos verifikasi admin. Status ketersediaan mengikuti
              konfirmasi terakhir dari pemilik.
            </p>
          </div>
          <Link
            href="/kos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-strong"
          >
            Lihat semua kos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {result && result.items.length > 0 ? (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Menampilkan {result.items.length} dari {result.meta.total} properti terverifikasi.
            </p>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/50 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {result === null
                ? 'Daftar properti belum dapat dimuat.'
                : 'Belum ada properti terverifikasi yang dipublikasikan.'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              {result === null
                ? 'Server API tidak merespons saat halaman ini dirender. Jalankan backend (npm run dev:api) lalu muat ulang halaman.'
                : 'Properti akan tampil di sini setelah pemilik melengkapi data dan admin memverifikasinya.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
