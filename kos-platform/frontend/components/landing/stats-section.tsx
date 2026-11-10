import type { FC, ReactNode } from 'react'

import { Quote, ShieldCheck } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import CountUp from '@/components/motion/count-up'
import { LANDING_STATS, LANDING_TRUST } from '@/lib/landing'

/**
 * Angka yang bisa diperiksa, lalu janji yang menopangnya.
 *
 * Semua angka di sini berasal dari cara kerja produk (bobot KosMatch, rentang
 * proyeksi biaya, jumlah label biaya), bukan hasil survei yang tidak bisa
 * ditelusuri asalnya.
 */
const StatsSection: FC = (): ReactNode => {
  return (
    <section id="angka" aria-labelledby="angka-title" className="scroll-mt-20 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="angka-title"
          eyebrow="Terbuka"
          title="Angkanya berasal dari cara kerja, bukan dari klaim."
          description="Bobot rekomendasi, rentang proyeksi biaya, dan tingkat kepercayaan informasi semuanya bisa Anda periksa sendiri di dalam produk."
        />

        <dl className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_STATS.map((stat) => (
            <div key={stat.label} className="reveal flex flex-col border-t border-border pt-6">
              <dt className="mt-3 text-sm font-medium text-foreground">{stat.label}</dt>

              <dd className="order-first font-heading text-5xl font-light tracking-[-0.04em] text-foreground sm:text-6xl">
                <CountUp value={stat.value} />
              </dd>

              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{stat.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <figure className="reveal relative isolate flex min-h-[24rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-forest p-8 sm:p-10">
            <div className="absolute inset-0 -z-20 bg-[url('/images/kos-2.jpg')] bg-cover bg-center opacity-40" />

            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-br from-forest via-forest/85 to-primary/40"
            />

            <Quote className="size-8 text-leaf" aria-hidden="true" />

            <blockquote className="mt-8 font-heading text-2xl font-light leading-snug tracking-[-0.02em] text-white sm:text-3xl">
              <p>
                Kami lebih memilih menyampaikan apa yang belum diketahui daripada menampilkan angka yang
                terlihat pasti padahal belum dikonfirmasi.
              </p>
            </blockquote>

            <figcaption className="mt-10 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-leaf text-forest"
              >
                <ShieldCheck className="size-5" />
              </span>

              <span>
                <span className="block text-sm font-medium text-white">Prinsip HuniKos</span>

                <span className="block text-sm text-forest-foreground/65">Transparansi sebelum persuasi</span>
              </span>
            </figcaption>
          </figure>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {LANDING_TRUST.map((item) => (
              <div
                key={item.title}
                className="reveal flex flex-col rounded-[2rem] bg-white p-8 ring-1 ring-inset ring-black/5"
              >
                <h3 className="text-base font-medium text-foreground">{item.title}</h3>

                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default StatsSection
