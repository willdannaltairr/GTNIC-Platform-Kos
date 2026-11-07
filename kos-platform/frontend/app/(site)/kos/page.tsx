import type { Metadata } from 'next'
import { Suspense } from 'react'
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

interface KosQuery {
  q: string
  city: string
  district: string
  type: string
  bathroom: string
  minPrice: string
  maxPrice: string
  facilities: string[]
  sort: string
  page: number
}

/** Kerangka kartu selama daftar hasil diambil dari API. */
function KosResultsSkeleton() {
  return (
    <div>
      <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

async function KosResults({ query }: { query: KosQuery }) {
  const result = await fetchProperties({
    q: query.q || undefined,
    city: query.city || undefined,
    district: query.district || undefined,
    type: query.type || undefined,
    bathroomType: query.bathroom || undefined,
    minPrice: toInt(query.minPrice),
    maxPrice: toInt(query.maxPrice),
    facilities: query.facilities.length > 0 ? query.facilities.join(',') : undefined,
    sort: query.sort,
    page: query.page,
    limit: 9,
  })

  if (result === null) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-semibold text-foreground">Daftar kos belum dapat dimuat.</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
          Server API tidak merespons saat halaman ini dirender. Jalankan backend dengan
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5">npm run dev:api</code>
          lalu muat ulang halaman ini.
        </p>
      </div>
    )
  }

  if (result.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-semibold text-foreground">
          Tidak ada kos yang cocok dengan filter Anda.
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
          Coba longgarkan rentang harga, hapus beberapa fasilitas, atau ubah kata kunci pencarian.
        </p>
      </div>
    )
  }

  const queryForUrl: Record<string, string> = {}
  if (query.q) queryForUrl.q = query.q
  if (query.city) queryForUrl.city = query.city
  if (query.district) queryForUrl.district = query.district
  if (query.type) queryForUrl.type = query.type
  if (query.bathroom) queryForUrl.bathroom = query.bathroom
  if (query.minPrice) queryForUrl.minPrice = query.minPrice
  if (query.maxPrice) queryForUrl.maxPrice = query.maxPrice
  if (query.facilities.length > 0) queryForUrl.facilities = query.facilities.join(',')
  if (query.sort !== 'newest') queryForUrl.sort = query.sort

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Menampilkan {result.items.length} dari {result.meta.total} kos terverifikasi.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
  )
}

/**
 * Halaman cari kos.
 *
 * Filter tampil sebagai satu bagian utuh tepat di bawah judul, bukan kolom
 * sempit di samping hasil: pilihan filter adalah hal pertama yang dicari
 * pengunjung, sementara kolom samping memaksa kartu kos berdesakan di ruang
 * yang tersisa.
 */
export default async function KosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const facilitiesParam = first(sp.facilities)

  const query: KosQuery = {
    q: first(sp.q),
    city: first(sp.city),
    district: first(sp.district),
    type: first(sp.type),
    bathroom: first(sp.bathroom),
    minPrice: first(sp.minPrice),
    maxPrice: first(sp.maxPrice),
    facilities: facilitiesParam ? facilitiesParam.split(',').filter(Boolean) : [],
    sort: first(sp.sort) || 'newest',
    page: toInt(first(sp.page)) ?? 1,
  }

  const initial: KosFilterState = {
    q: query.q,
    city: query.city,
    district: query.district,
    type: query.type,
    bathroom: query.bathroom,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    facilities: query.facilities,
    sort: query.sort,
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cari Kos</h1>
      </header>

      <div className="mt-6">
        <KosFilters initial={initial} />
      </div>

      <div className="mt-8">
        {/*
          Skeleton pemuatan dipasang lewat Suspense di sini, bukan lewat
          loading.tsx: loading.tsx pada segmen /kos juga membungkus rute
          anaknya (/kos/[slug]), dan shell yang sudah ter-flush membuat
          halaman "tidak ditemukan" berstatus 200, bukan 404.
        */}
        <Suspense fallback={<KosResultsSkeleton />}>
          <KosResults query={query} />
        </Suspense>
      </div>
    </div>
  )
}
