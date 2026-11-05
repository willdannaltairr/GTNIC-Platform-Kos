import type { Metadata } from 'next'
import { KosFilters, type KosFilterState } from '@/components/kos/kos-filters'
import { Pagination } from '@/components/pagination'
import { PropertyCard } from '@/components/property-card'
import { fetchProperties } from '@/lib/api'

export const metadata: Metadata = {
  title: 'Cari Kos',
  description:
    'Cari kos berdasarkan kota, kecamatan, rentang harga, tipe kamar, dan fasilitas — dengan estimasi biaya dan status ketersediaan yang jelas.',
}

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

const toInt = (value: string): number | undefined => {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export default async function KosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams

  const q = first(sp.q)
  const city = first(sp.city)
  const district = first(sp.district)
  const type = first(sp.type)
  const bathroom = first(sp.bathroom)
  const minPrice = first(sp.minPrice)
  const maxPrice = first(sp.maxPrice)
  const facilitiesParam = first(sp.facilities)
  const sort = first(sp.sort) || 'newest'
  const page = toInt(first(sp.page)) ?? 1

  const facilities = facilitiesParam ? facilitiesParam.split(',').filter(Boolean) : []

  const initial: KosFilterState = {
    q,
    city,
    district,
    type,
    bathroom,
    minPrice,
    maxPrice,
    facilities,
    sort,
  }

  const result = await fetchProperties({
    q: q || undefined,
    city: city || undefined,
    district: district || undefined,
    type: type || undefined,
    bathroomType: bathroom || undefined,
    minPrice: toInt(minPrice),
    maxPrice: toInt(maxPrice),
    facilities: facilities.length > 0 ? facilities.join(',') : undefined,
    sort,
    page,
    limit: 9,
  })

  const queryForUrl: Record<string, string> = {}
  if (q) queryForUrl.q = q
  if (city) queryForUrl.city = city
  if (district) queryForUrl.district = district
  if (type) queryForUrl.type = type
  if (bathroom) queryForUrl.bathroom = bathroom
  if (minPrice) queryForUrl.minPrice = minPrice
  if (maxPrice) queryForUrl.maxPrice = maxPrice
  if (facilities.length > 0) queryForUrl.facilities = facilities.join(',')
  if (sort !== 'newest') queryForUrl.sort = sort

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cari Kos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Semua filter di bawah diterapkan langsung pada pencarian di server. Hasilnya bisa
          dibagikan lewat URL karena pilihan Anda tersimpan di alamat halaman.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <details className="rounded-2xl border border-border bg-card lg:hidden">
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              Filter pencarian
            </summary>
            <div className="border-t border-border p-4">
              <KosFilters initial={initial} />
            </div>
          </details>

          <div className="hidden rounded-2xl border border-border bg-card p-5 lg:block">
            <h2 className="text-sm font-bold tracking-tight">Filter pencarian</h2>
            <div className="mt-5">
              <KosFilters initial={initial} />
            </div>
          </div>
        </aside>

        <div>
          {result === null ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-semibold text-foreground">Daftar kos belum dapat dimuat.</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Server API tidak merespons saat halaman ini dirender. Jalankan backend dengan
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5">npm run dev:api</code>
                lalu muat ulang halaman ini.
              </p>
            </div>
          ) : result.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                Tidak ada kos yang cocok dengan filter Anda.
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Coba longgarkan rentang harga, hapus beberapa fasilitas, atau ubah kata kunci
                pencarian.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Menampilkan {result.items.length} dari {result.meta.total} kos terverifikasi.
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              <Pagination
                basePath="/kos"
                query={queryForUrl}
                page={result.meta.page}
                totalPages={result.meta.totalPages}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
