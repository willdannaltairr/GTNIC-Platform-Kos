import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { ArrowUpRight, Building2, Check, Search } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import { BENEFITS } from '@/lib/landing'

/**
 * Manfaat dipisah per sisi.
 *
 * Kedua kartu memakai kerangka yang sama: kepala kartu, daftar manfaat yang
 * dikelompokkan dalam satu panel, lalu satu ajakan di bawah. Sisi pencari kos
 * memakai permukaan hijau muda, sisi pemilik memakai hijau pekat, sehingga
 * keduanya terbaca sebagai dua alat yang setara tanpa kartu hitam.
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

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="relative isolate flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#e5f5e0] via-[#f2f9ef] to-white p-8 ring-1 ring-inset ring-primary/10 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 -z-10 size-64 rounded-full bg-primary/10 blur-3xl"
            />

            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_rgba(30,133,56,0.7)]">
                <Search className="size-5" aria-hidden="true" />
              </span>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Untuk pencari kos
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Informasi lengkap sebelum memesan.
                </p>
              </div>
            </div>

            <h3 className="mt-6 font-heading text-2xl font-normal tracking-tight text-foreground">
              Keputusan yang tidak perlu ditebak
            </h3>

            <ul className="mt-7 divide-y divide-primary/10 overflow-hidden rounded-2xl bg-white/70 ring-1 ring-inset ring-primary/10">
              {BENEFITS.tenant.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 px-4 py-3.5 text-[15px] leading-relaxed text-foreground"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href="/masuk"
              className="mt-8 inline-flex h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            >
              Mulai cari kos
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative isolate flex flex-col overflow-hidden rounded-[2rem] bg-[#0f5132] p-8 text-forest-foreground ring-1 ring-inset ring-white/10 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 -z-10 size-72 rounded-full bg-leaf/20 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -left-24 -z-10 size-72 rounded-full bg-primary/20 blur-3xl"
            />

            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-leaf ring-1 ring-inset ring-white/15">
                <Building2 className="size-5" aria-hidden="true" />
              </span>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf">
                  Untuk pemilik kos
                </p>
                <p className="mt-0.5 text-sm text-forest-foreground/60">
                  Satu dashboard untuk operasional harian.
                </p>
              </div>
            </div>

            <h3 className="mt-6 font-heading text-2xl font-normal tracking-tight text-white">
              Alat kerja yang rapi, bukan tumpukan chat
            </h3>

            <ul className="mt-7 divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
              {BENEFITS.owner.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 px-4 py-3.5 text-[15px] leading-relaxed text-forest-foreground/85"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-leaf text-forest">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href="/masuk"
              className="mt-8 inline-flex h-11 items-center gap-2 self-start rounded-full bg-leaf px-5 text-sm font-semibold text-forest transition-colors hover:bg-leaf/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
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
