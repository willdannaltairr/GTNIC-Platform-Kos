import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import { BENEFITS } from '@/lib/landing'

/**
 * Manfaat dipisah per sisi.
 *
 * Dua kolom dengan bobot visual berbeda: sisi pemilik memakai latar hutan
 * supaya terbaca sebagai alat kerja, bukan sekadar daftar keunggulan.
 */
const BenefitsSection: FC = (): ReactNode => {
  return (
    <section id="manfaat" aria-labelledby="manfaat-title" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="manfaat-title"
          eyebrow="Manfaat"
          title={BENEFITS.title}
          description={BENEFITS.description}
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-[2rem] bg-background p-8 ring-1 ring-inset ring-black/5 sm:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Untuk pencari kos</p>

            <h3 className="mt-3 font-heading text-2xl font-normal tracking-tight text-foreground">
              Keputusan yang tidak perlu ditebak
            </h3>

            <ul className="mt-7 space-y-4">
              {BENEFITS.tenant.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href="/kos"
              className="mt-8 inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary transition-colors hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            >
              Mulai cari kos
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative isolate flex flex-col overflow-hidden rounded-[2rem] bg-forest p-8 text-forest-foreground sm:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-leaf/15 blur-3xl"
            />

            <p className="text-xs font-medium uppercase tracking-[0.14em] text-leaf">Untuk pemilik kos</p>

            <h3 className="mt-3 font-heading text-2xl font-normal tracking-tight text-white">
              Alat kerja yang rapi, bukan tumpukan chat
            </h3>

            <ul className="mt-7 space-y-4">
              {BENEFITS.owner.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[15px] leading-relaxed text-forest-foreground/85">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-leaf ring-1 ring-white/15">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href="/daftar"
              className="mt-8 inline-flex h-11 items-center gap-2 self-start rounded-full bg-white/10 px-5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              Daftar sebagai pemilik
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BenefitsSection
