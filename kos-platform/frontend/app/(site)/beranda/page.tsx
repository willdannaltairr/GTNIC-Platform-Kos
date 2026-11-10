import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BerandaSearch } from '@/components/beranda/beranda-search'
import { NearbySection } from '@/components/beranda/nearby-section'
import { RuteSection } from '@/components/beranda/rute-section'
import { TypeSection } from '@/components/beranda/type-section'
import { PopularAreasSection } from '@/components/beranda/popular-areas-section'
import { CampusSection } from '@/components/beranda/campus-section'
import { fetchCampuses, fetchRegions } from '@/lib/api'
import { JudulHalaman, Seksi } from '@/components/site/kerangka'

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
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

/**
 * Beranda aplikasi, halaman pertama setelah pengunjung masuk ke platform.
 *
 * Berbeda dari landing page: di sini navigasinya navbar aplikasi, isinya
 * langsung rekomendasi yang bergantung pada lokasi alih-alih cerita tentang
 * produk, dan tiap bagiannya berdiri sebagai pita sendiri yang dipisahkan garis
 * tipis. Karena itu "Beranda" di navbar menunjuk ke sini, bukan ke landing
 * page: pengunjung yang sudah berada di dalam platform tidak dilempar balik ke
 * halaman pemasaran setiap kali menekan menu pertama.
 *
 * Tiap bagian memakai `Seksi` dari `components/site/kerangka.tsx` yang sudah
 * membawa wadah dan jarak tepinya sendiri, sehingga bagiannya disusun sebagai
 * sederet pita dan bukan sebagai blok-blok di dalam satu wadah panjang.
 */
export default async function BerandaPage() {
  // Diambil di sini, bukan di masing-masing bagian, karena dua bagian memakai
  // daftar yang sama: filter rute butuh keduanya sebagai pilihan titik, dan
  // bagian kampus menampilkannya. Satu pengambilan, dua pemakaian.
  const [campuses, regions] = await Promise.all([fetchCampuses({ limit: 12 }), fetchRegions(12)])

  return (
    <>
      <Seksi garis={false}>
        <JudulHalaman
          eyebrow="Rekomendasi kos"
          title="Mau cari kos di mana?"
          description="Mulai dari yang paling dekat dengan Anda, atau tentukan sendiri titik asal dan tujuannya. Setiap bagian di bawah menjawab satu cara menemukannya."
        />

        <div className="mt-8">
          <BerandaSearch />
        </div>
      </Seksi>

      <NearbySection />

      <RuteSection campuses={campuses ?? []} regions={regions ?? []} />

      <Suspense fallback={<Seksi><KartuSkeleton /></Seksi>}>
        <TypeSection
          type="KOS_PUTRA"
          title="Kos putra"
          description="Kos khusus penghuni laki-laki, dari pemilik yang propertinya sudah diverifikasi admin."
          href="/kos?type=KOS_PUTRA"
        />
      </Suspense>

      <Suspense fallback={<Seksi><KartuSkeleton /></Seksi>}>
        <TypeSection
          type="KOS_PUTRI"
          title="Kos putri"
          description="Kos khusus penghuni perempuan, dengan status ketersediaan kamar yang diperbarui pemilik."
          href="/kos?type=KOS_PUTRI"
        />
      </Suspense>

      <PopularAreasSection regions={regions ?? []} />

      <CampusSection campuses={campuses ?? []} />
    </>
  )
}
