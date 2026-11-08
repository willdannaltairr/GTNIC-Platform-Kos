'use client'

import type { FC, ReactNode } from 'react'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Testimonial } from '@/lib/landing'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Carousel testimoni.
 *
 * Dikendalikan tombol, bukan klik di mana saja seperti acuan visualnya.
 * Alasannya bukan soal selera: area yang bisa diklik tanpa penanda membuat teks
 * kutipan ikut terpilih saat pengunjung mencoba menyorotnya, dan pembaca
 * papan ketik tidak punya cara tahu bahwa seluruh blok itu bisa ditekan.
 *
 * Kutipan dipecah per kata dan muncul berurutan. Kata-katanya tetap satu
 * kalimat di mata pembaca layar karena seluruhnya berada dalam satu
 * `<blockquote>`, yang bergerak hanya tampilannya, bukan struktur teksnya.
 */
const TestimonialCarousel: FC<{ items: Testimonial[] }> = ({ items }): ReactNode => {
  const [index, setIndex] = useState(0)
  const [arah, setArah] = useState(1)
  const regionRef = useRef<HTMLDivElement>(null)

  const total = items.length

  const pindah = useCallback(
    (langkah: number): void => {
      setArah(langkah)
      setIndex((sebelumnya) => (sebelumnya + langkah + total) % total)
    },
    [total],
  )

  /** Panah kiri/kanan hanya bekerja saat carousel ini sedang difokus. */
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      pindah(1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      pindah(-1)
    }
  }

  // Pergantian otomatis berhenti saat pengunjung memilih reduced motion -
  // teks yang berganti sendiri sulit dibaca oleh sebagian orang, dan pilihan
  // itu memang ada untuk dihormati.
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAuto(!query.matches)

    const onChange = (event: MediaQueryListEvent): void => setAuto(!event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!auto) return

    const timer = window.setInterval(() => pindah(1), 9000)
    return () => window.clearInterval(timer)
  }, [auto, pindah])

  // Interval di atas tidak direset saat pengunjung menekan tombol, sehingga
  // kutipan yang baru saja dibuka bisa langsung berganti. Fokus dipindahkan ke
  // wadahnya supaya pembaca yang mengendalikan sendiri tidak kehilangan tempat.
  const ke = (langkah: number): void => {
    pindah(langkah)
    regionRef.current?.focus()
  }

  const aktif = items[index]
  if (!aktif) return null

  return (
    <div
      ref={regionRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Testimoni penghuni dan pemilik"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="outline-none"
    >
      <div className="min-h-[13rem] sm:min-h-[11rem]">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={index}
            initial={{ opacity: 0, y: arah * 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: arah * -16, transition: { duration: 0.2, ease: EASE } }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-pretty font-heading text-xl font-light leading-relaxed tracking-tight text-foreground sm:text-2xl"
          >
            “{aktif.quote}”
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="relative pl-4"
          >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-leaf" />

            <span className="block text-sm font-medium tracking-wide text-foreground">
              {aktif.author}
            </span>
            <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {aktif.role}, {aktif.company}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground">{String(index + 1).padStart(2, '0')}</span> /{' '}
            {String(total).padStart(2, '0')}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ke(-1)}
              aria-label="Testimoni sebelumnya"
              className="grid size-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => ke(1)}
              aria-label="Testimoni berikutnya"
              className="grid size-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Titik penanda posisi: mana yang sedang tampil dan berapa banyak sisanya. */}
      <div className="mt-5 flex gap-1.5" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={item.author}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === index ? 'w-8 bg-primary' : 'w-4 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default TestimonialCarousel
