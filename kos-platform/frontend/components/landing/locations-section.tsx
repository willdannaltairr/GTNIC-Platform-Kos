import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import { LOCATIONS } from '@/lib/constants'

/**
 * Lokasi populer.
 *
 * Setiap kartu membuka /kos dengan kota yang sudah tersaring. Kota pertama
 * dibuat lebih besar supaya blok ini punya satu titik masuk yang jelas, bukan
 * enam tombol yang setara.
 */
const LocationsSection: FC = (): ReactNode => {
  return (
    <section id="lokasi" aria-labelledby="lokasi-title" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="lokasi-title"
          eyebrow="Lokasi"
          title="Mulai dari kawasan yang dekat dengan keseharian Anda."
          description="Setiap kota membuka hasil pencarian yang sudah tersaring — bukan halaman contoh. Jumlah kos yang tampil mengikuti data terverifikasi di database."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATIONS.map((location, index) => {
            const featured = index === 0

            return (
              <li
                key={location.city}
                className={cn(
                  featured && 'sm:col-span-2 lg:col-span-1 lg:row-span-2',
                  // Kartu terakhir membentang dua kolom di layar lebar, supaya
                  // barisnya tidak menyisakan sel kosong di sebelah kanan.
                  !featured && index === LOCATIONS.length - 1 && 'lg:col-span-2',
                )}
              >
                <Link
                  href={location.href}
                  className={
                    featured
                      ? 'group relative isolate flex h-full min-h-56 flex-col justify-between overflow-hidden rounded-[2rem] bg-forest p-6 text-white ring-1 ring-inset ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:min-h-64'
                      : 'group flex h-full min-h-36 flex-col justify-between rounded-[1.5rem] bg-white p-6 ring-1 ring-inset ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:ring-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4'
                  }
                >
                  {featured && (
                    <>
                      <div className="absolute inset-0 -z-20 bg-[url('/images/kos-4.jpg')] bg-cover bg-center" />

                      <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-gradient-to-t from-forest via-forest/75 to-forest/20"
                      />
                    </>
                  )}

                  <span className="flex items-start justify-between gap-4">
                    <span
                      className={
                        featured
                          ? 'flex size-11 items-center justify-center rounded-xl bg-white/10 text-leaf ring-1 ring-white/15'
                          : 'flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground'
                      }
                    >
                      <MapPin className="size-5" aria-hidden="true" />
                    </span>

                    <ArrowUpRight
                      className={
                        featured
                          ? 'size-5 text-white/60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5'
                          : 'size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5'
                      }
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mt-8 block">
                    <span
                      className={
                        featured
                          ? 'block font-heading text-3xl font-light tracking-[-0.03em] text-white'
                          : 'block text-lg font-medium text-foreground'
                      }
                    >
                      {location.city}
                    </span>

                    <span className={featured ? 'mt-1 block text-sm text-forest-foreground/70' : 'mt-1 block text-sm text-muted-foreground'}>
                      {location.area}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default LocationsSection
