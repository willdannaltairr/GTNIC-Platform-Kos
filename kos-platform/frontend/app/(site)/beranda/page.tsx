import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BerandaSearch } from '@/components/beranda/beranda-search'
import { NearbySection } from '@/components/beranda/nearby-section'
import { RuteSection } from '@/components/beranda/rute-section'
import { TypeSection } from '@/components/beranda/type-section'
import { PopularAreasSection } from '@/components/beranda/popular-areas-section'
import { CampusSection } from '@/components/beranda/campus-section'
import { fetchCampuses, fetchRegions } from '@/lib/api'

export const metadata: Metadata = {
  title: 'Beranda',
  description:
    'Rekomendasi kos berdasarkan lokasi Anda, pencarian dari lokasi ke lokasi, area terpopuler, dan kos di sekitar kampus di Indonesia.',
}

/** Kerangka tiga kartu selama daftar rekomendasi diambil dari API. */
function KartuSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  )
}

/**
 * Beranda aplikasi — halaman pertama setelah pengunjung masuk ke platform.
 *
 * Berbeda dari landing page: di sini navigasinya sidebar, dan isinya langsung
 * rekomendasi yang bergantung pada lokasi, bukan cerita tentang produk.
 * Karena itu "Beranda" di sidebar menunjuk ke sini, bukan ke landing page —
 * pengunjung yang sudah berada di dalam platform tidak dilempar balik ke
 * halaman pemasaran setiap kali menekan menu pertama.
 */
export default async function BerandaPage() {
  // Diambil di sini, bukan di masing-masing bagian, karena dua bagian memakai
  // daftar yang sama: filter rute butuh keduanya sebagai pilihan titik, dan
  // bagian kampus menampilkannya. Satu pengambilan, dua pemakaian.
  const [campuses, regions] = await Promise.all([fetchCampuses({ limit: 12 }), fetchRegions(12)])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Mau cari kos di mana?
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Mulai dari yang paling dekat dengan Anda, atau tentukan sendiri titik asal dan tujuannya.
        </p>
      </header>

      <div className="mt-6">
        <BerandaSearch />
      </div>

      <div className="mt-12 space-y-14">
        <NearbySection />

        <RuteSection campuses={campuses ?? []} regions={regions ?? []} />

        <Suspense fallback={KartuSkeleton()}>
          <TypeSection
            type="KOS_PUTRA"
            title="Kos putra"
            description="Kos khusus penghuni laki-laki, dari pemilik yang propertinya sudah diverifikasi admin."
            href="/kos?type=KOS_PUTRA"
          />
        </Suspense>

        <Suspense fallback={KartuSkeleton()}>
          <TypeSection
            type="KOS_PUTRI"
            title="Kos putri"
            description="Kos khusus penghuni perempuan, dengan status ketersediaan kamar yang diperbarui pemilik."
            href="/kos?type=KOS_PUTRI"
          />
        </Suspense>

        <PopularAreasSection regions={regions ?? []} />

        <CampusSection campuses={campuses ?? []} />
      </div>
    </div>
  )
}
