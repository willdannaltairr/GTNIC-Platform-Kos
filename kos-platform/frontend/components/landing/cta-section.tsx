import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Magnetic from '@/components/motion/magnetic'

/**
 * Ajakan terakhir.
 *
 * Dua jalur yang jelas: mencari kos (tujuan utama) dan mendaftar sebagai
 * pemilik. Tanpa formulir, karena formulir hanya menarik kalau tujuannya sudah
 * pasti — di sini tujuannya masih bercabang.
 */
const CtaSection: FC = (): ReactNode => {
  return (
    <section
      id="mulai"
      aria-labelledby="mulai-title"
      className="relative isolate scroll-mt-20 overflow-hidden bg-background pb-24 pt-4 sm:pb-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-forest px-6 py-16 text-center sm:px-12 sm:py-24">
          <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[url('/images/kos-5.jpg')] bg-cover bg-center opacity-30" />

          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-forest via-forest/90 to-primary/50"
          />

          <div
            aria-hidden="true"
            className="absolute -left-24 bottom-0 -z-10 size-80 rounded-full bg-leaf/20 blur-3xl"
          />

          <h2
            id="mulai-title"
            className="mx-auto max-w-3xl text-balance font-heading text-4xl font-light leading-[1.05] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl"
          >
            Mulai dari angka yang jelas, bukan dari kira-kira.
          </h2>

          <p className="reveal mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-forest-foreground/80 sm:text-lg">
            Cari kos, bandingkan biaya totalnya, lalu datang survei membawa daftar pertanyaan yang tepat.
            Gratis untuk pencari kos.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic strength={0.18}>
              <Link
                href="/masuk"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-leaf px-7 text-[15px] font-semibold text-forest transition-colors hover:bg-leaf/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
              >
                Cari kos sekarang
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Magnetic>

            <Link
              href="/masuk"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-7 text-[15px] font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
            >
              Daftar sebagai pemilik
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CtaSection
