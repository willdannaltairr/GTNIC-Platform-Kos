'use client'

import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Logo } from '@/components/landing/logo'
import { LANDING_CTA, LANDING_FOOTER_COLUMNS } from '@/lib/landing'

const WORDMARK = 'KosPlatform'.split('')

/** Footer landing: kolom tautan di atas, wordmark raksasa di bawah. */
export const LandingFooter: FC = (): ReactNode => {
  return (
    <footer className="relative overflow-hidden bg-forest text-forest-foreground">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="KosPlatform, beranda"
              className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              <Logo tone="light" />
            </Link>

            <p className="mt-5 text-[15px] leading-relaxed text-forest-foreground/70">
              Platform pencarian dan pengelolaan kos yang mengutamakan transparansi biaya,
              kecocokan kebutuhan, dan kepercayaan antara penghuni dengan pemilik kos.
            </p>

            <Link
              href={LANDING_CTA.href}
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              {LANDING_CTA.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {LANDING_FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold text-white">{column.title}</h2>

                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="rounded text-sm text-forest-foreground/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-forest-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 KosPlatform. Seluruh hak cipta dilindungi.</p>

          <p>Properti dan akun demo berisi data fiktif untuk demonstrasi.</p>
        </div>
      </div>

      {/* Wordmark naik huruf demi huruf saat footer masuk ke layar.
          Pemicunya dipasang di wadah, bukan di tiap huruf: huruf mulai dari
          translateY(100%) di dalam wadah overflow-hidden, sehingga pengamat
          irisan pada huruf itu sendiri tidak pernah melihatnya masuk layar
          dan animasinya tidak akan pernah berjalan. */}
      <motion.div
        aria-hidden="true"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        className="pointer-events-none flex select-none justify-center overflow-hidden px-2 font-heading text-[15vw] font-semibold leading-[0.78] tracking-[-0.06em]"
      >
        {WORDMARK.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            variants={{
              hidden: { opacity: 0, y: '100%' },
              visible: { opacity: 1, y: '0%', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="wordmark-footer inline-block"
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </footer>
  )
}
