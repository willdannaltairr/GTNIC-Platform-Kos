import type { FC, ReactNode } from 'react'

import Image from 'next/image'
import SectionHeading from '@/components/landing/section-heading'
import SearchPreview from '@/components/landing/dashboard/search-preview'
import PerspectiveTilt from '@/components/motion/perspective-tilt'
import { PLATFORM_CAPABILITIES } from '@/lib/landing'

/**
 * Bagian produk: satu panel besar berisi pratinjau layar pencarian, ditemani
 * tiga janji yang membuat angkanya bisa dipercaya. Latar hutan gelap supaya
 * panel terang di tengahnya terbaca sebagai "layar".
 */
const PlatformSection: FC = (): ReactNode => {
  return (
    <section
      id="produk"
      aria-labelledby="produk-title"
      className="relative isolate scroll-mt-20 overflow-hidden bg-forest py-24 sm:py-32"
    >
      <Image src="/images/kos-3.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-25" />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-forest via-forest/85 to-forest/95"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="produk-title"
          eyebrow="Platform"
          tone="dark"
          align="center"
          title="Satu tempat untuk semua pertanyaan sebelum menyewa."
          description="Kecocokan, biaya total, dan jarak disusun berdampingan, sehingga keputusan diambil dengan angka yang sama — bukan dari ingatan atau kira-kira."
        />

        <PerspectiveTilt className="mt-14">
          <SearchPreview />
        </PerspectiveTilt>

        <ul className="mt-14 grid gap-8 sm:grid-cols-3">
          {PLATFORM_CAPABILITIES.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.title} className="reveal flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-leaf ring-1 ring-white/15">
                  <Icon className="size-5" aria-hidden="true" />
                </span>

                <div>
                  <h3 className="text-base font-medium text-white">{item.title}</h3>

                  <p className="mt-1 text-sm leading-relaxed text-forest-foreground/70">{item.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default PlatformSection
