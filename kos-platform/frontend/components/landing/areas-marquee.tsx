import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { AREA_LINKS } from '@/lib/landing'

/**
 * Marquee kawasan populer.
 *
 * Bentuknya teks polos tanpa kotak, dengan ikon di kiri dan peredupan di tepi.
 * Bedanya, setiap butir di sini adalah tautan yang membuka pencarian kota
 * tersebut.
 *
 * Dua salinan daftar yang identik digeser tepat setengah trek, sehingga
 * perulangannya mulus tanpa mengukur lebar di JavaScript. Saat pengunjung
 * memilih reduced motion, salinan kedua disembunyikan dan daftar dibiarkan
 * membungkus ke baris berikutnya (lihat `.marquee` di globals.css).
 */
const AreasMarquee: FC = (): ReactNode => {
  return (
    <section id="kawasan" aria-labelledby="kawasan-title" className="bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="kawasan-title" className="reveal text-center text-sm text-muted-foreground">
          Kawasan yang paling sering dicari — tiap tautan membuka pencarian yang sudah tersaring
        </h2>
      </div>

      <div className="marquee marquee-mask mt-10 overflow-hidden">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              className={copy === 1 ? 'marquee-copy flex shrink-0 items-center' : 'flex shrink-0 items-center'}
            >
              {AREA_LINKS.map((area) => {
                const Icon = area.icon

                return (
                  <li key={`${copy}-${area.name}`} className="px-2">
                    <Link
                      href={area.href}
                      tabIndex={copy === 1 ? -1 : undefined}
                      className="flex items-center gap-2.5 px-6 py-2 text-foreground/40 transition-colors duration-300 hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-10"
                    >
                      <Icon className="size-6 shrink-0" aria-hidden="true" />

                      <span className="whitespace-nowrap font-heading text-2xl font-semibold tracking-tight">
                        {area.name}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AreasMarquee
