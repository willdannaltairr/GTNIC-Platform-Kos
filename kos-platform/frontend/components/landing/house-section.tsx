'use client'

import type { FC, ReactNode } from 'react'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import SectionHeading from '@/components/landing/section-heading'
import HouseViewer from '@/components/landing/house-viewer/house-viewer'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

/**
 * Kartu penutup sebelum footer: model bangunan kos yang bisa diputar.
 *
 * Bentuknya judul, keterangan, lalu panel yang menyatu saat digulir, tetapi
 * modelnya rumah kos, bukan deret panel surya.
 *
 * Catatan kejujuran: model ini gambaran umum tipe bangunan, bukan properti
 * tertentu. Kalimat itu ditulis terbuka di bawah panel supaya tidak ada yang
 * membaca model ini sebagai janji bentuk kos yang akan disurvei.
 */
const HouseSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({ target: panelRef, offset: ['start end', 'end end'] })
  const panelScale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const panelY = useTransform(scrollYProgress, [0, 1], [70, 0])

  return (
    <section
      id="model-bangunan"
      aria-labelledby="model-bangunan-title"
      className="scroll-mt-20 overflow-hidden border-t border-border bg-white"
    >
      <div className="relative mx-auto max-w-6xl border-x border-border">
        <div className="px-4 pb-14 pt-24 text-center sm:px-10 sm:pt-32">
          <SectionHeading
            id="model-bangunan-title"
            eyebrow="Tampilan 3D"
            title="Lihat bangunannya dari segala sisi, bukan hanya dari satu foto."
            description="Foto pemasaran selalu diambil dari sudut terbaiknya. Putar model ini untuk melihat bentuk atap, sisi samping, dan bagian belakang yang jarang masuk daftar, hal yang biasanya baru ketahuan saat Anda tiba di lokasi."
            align="center"
          />
        </div>

        <div className="border-t border-border px-4 pb-14 pt-8 sm:px-10 sm:pb-16">
          <motion.div
            ref={panelRef}
            style={still ? undefined : { scale: panelScale, y: panelY }}
            className="relative mx-auto max-w-5xl"
          >
            <HouseViewer />
          </motion.div>

          <p className="mx-auto mt-8 max-w-xl text-balance text-center text-xs leading-relaxed text-muted-foreground">
            Model ini gambaran umum bangunan kos, bukan properti tertentu. Data tiap kos tetap berasal
            dari informasi yang dikonfirmasi pemiliknya.
          </p>
        </div>
      </div>
    </section>
  )
}

export default HouseSection
