import type { FC, ReactNode } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import { LOCATION_SHOWCASE } from '@/lib/landing'

/**
 * Lokasi populer.
 *
 * Grid memakai pola portfolio asimetris: kartu lebar dan sempit bergantian di
 * atas bidang 12 kolom, dengan permukaan hijau dan putih berselang-seling.
 * Tidak ada kartu hitam. Setiap kartu mengarah ke halaman masuk karena hasil
 * pencarian per kota hanya bisa dibuka dengan akun.
 */
const LocationsSection: FC = (): ReactNode => {
  return (
    <section id="lokasi" aria-labelledby="lokasi-title" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="lokasi-title"
            eyebrow="Lokasi"
            title="Mulai dari kawasan yang dekat dengan keseharian Anda."
            description="Setiap kota punya karakter dan hasil pencariannya sendiri, dari kawasan kampus sampai koridor perkantoran. Masuk dengan akun Anda untuk membukanya."
          />

          <Link
            href="/masuk"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full text-sm font-medium text-primary transition-colors hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 md:self-auto"
          >
            Mulai cari kos
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-12 lg:gap-6">
          {LOCATION_SHOWCASE.map((location) => {
            const green = location.tone === 'green'

            return (
              <li
                key={location.city}
                className={cn('min-w-0', location.wide ? 'md:col-span-7' : 'md:col-span-5')}
              >
                <Link
                  href="/masuk"
                  style={{ backgroundColor: location.color }}
                  className={cn(
                    'group relative isolate flex h-[390px] flex-col overflow-hidden rounded-[2rem] transition-all duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:h-[430px] lg:h-[460px]',
                    green
                      ? 'text-white ring-1 ring-inset ring-white/10 hover:shadow-[0_24px_60px_-20px_rgba(11,36,20,0.45)]'
                      : 'text-forest ring-1 ring-inset ring-black/10 shadow-[0_18px_40px_-34px_rgba(11,36,20,0.5)] hover:shadow-[0_24px_50px_-26px_rgba(11,36,20,0.35)]',
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute inset-0',
                      green
                        ? 'bg-[radial-gradient(120%_120%_at_8%_0%,rgba(255,255,255,0.18),transparent_46%)]'
                        : 'bg-[radial-gradient(120%_120%_at_8%_0%,rgba(30,133,56,0.1),transparent_46%)]',
                    )}
                  />

                  {green && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent"
                    />
                  )}

                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute -right-2 -top-8 select-none font-heading text-[9rem] font-light leading-none sm:text-[11rem]',
                      green ? 'text-white/[0.07]' : 'text-primary/[0.08]',
                    )}
                  >
                    {location.city.charAt(0)}
                  </span>

                  <div className="relative z-10 flex flex-1 flex-col p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset backdrop-blur-md',
                          green
                            ? 'bg-white/10 text-white/90 ring-white/20'
                            : 'bg-primary/10 text-primary-strong ring-primary/20',
                        )}
                      >
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {location.area}
                      </span>

                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                          green
                            ? 'bg-white/10 ring-white/20 group-hover:bg-white/20'
                            : 'bg-primary/10 text-primary-strong ring-primary/20 group-hover:bg-primary group-hover:text-white',
                        )}
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </span>
                    </div>

                    <h3
                      className={cn(
                        'mt-5 font-heading text-3xl font-light tracking-[-0.03em] sm:text-4xl',
                        green ? 'text-white' : 'text-forest',
                      )}
                    >
                      {location.city}
                    </h3>

                    <p
                      className={cn(
                        'mt-2 max-w-sm text-sm leading-relaxed sm:text-[15px]',
                        green ? 'text-white/85' : 'text-forest/65',
                      )}
                    >
                      {location.description}
                    </p>
                  </div>

                  <div className="relative mt-auto w-full px-5 sm:px-7">
                    <div
                      className={cn(
                        'relative h-40 overflow-hidden rounded-t-[1.35rem] sm:h-44 lg:h-48',
                        green
                          ? 'shadow-[0_-18px_45px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-white/25'
                          : 'shadow-[0_-18px_45px_rgba(11,36,20,0.18)] ring-1 ring-inset ring-black/10',
                      )}
                    >
                      <Image
                        src={location.image}
                        alt={location.imageAlt}
                        fill
                        sizes={
                          location.wide
                            ? '(min-width: 768px) 58vw, 100vw'
                            : '(min-width: 768px) 42vw, 100vw'
                        }
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />

                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                      />
                    </div>
                  </div>
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
