'use client'

import type { FC, ReactNode } from 'react'
import type { MotionValue } from 'motion/react'

import { useRef } from 'react'
import { Check } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import SpotlightCard from '@/components/motion/spotlight-card'
import SectionHeading from '@/components/landing/section-heading'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { LANDING_STEPS } from '@/lib/landing'

interface TimelineStepProps {
  step: { number: string; title: string; text: string }
  index: number
  still: boolean
}

interface TimelineRailProps {
  fill: MotionValue<number>
  dotTop: MotionValue<string>
  still: boolean
}

const stepWhen: Record<string, string> = {
  '01': 'Hari ini',
  '02': 'Saat memilih',
  '03': 'Saat survei',
  '04': 'Saat masuk',
}

// Satu langkah pada garis waktu: simpulnya menyala saat garis tiba, dan
// kartunya berayun naik dari kemiringan alih-alih sekadar memudar.
const TimelineStep: FC<TimelineStepProps> = ({ step, index, still }): ReactNode => {
  const ref = useRef<HTMLLIElement>(null)
  const fromLeft = index % 2 === 0

  const { scrollYProgress: arrive } = useScroll({ target: ref, offset: ['start end', 'start 0.55'] })
  const { scrollYProgress: reach } = useScroll({ target: ref, offset: ['start 0.64', 'start 0.54'] })

  const rotateX = useTransform(arrive, [0, 1], [28, 0])
  const rotate = useTransform(arrive, [0, 1], [fromLeft ? -2.5 : 2.5, 0])
  const y = useTransform(arrive, [0, 1], [72, 0])
  const scale = useTransform(arrive, [0, 1], [0.92, 1])
  const opacity = useTransform(arrive, [0, 0.6], [0.3, 1])
  const whenX = useTransform(arrive, [0, 1], [fromLeft ? 56 : -56, 0])
  const lit = useTransform(reach, [0, 1], [0, 1])

  const when = stepWhen[step.number] ?? step.number

  return (
    <li
      ref={ref}
      className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 [perspective:1200px] md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] md:gap-x-12"
    >
      <div className="relative z-10 col-start-1 row-start-1 md:col-start-2">
        <span className="relative flex size-12 items-center justify-center rounded-full bg-white font-heading text-sm font-medium text-muted-foreground ring-1 ring-black/10">
          {step.number}

          <motion.span
            aria-hidden="true"
            style={still ? undefined : { opacity: lit, scale: lit }}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-primary text-white shadow-[0_0_0_8px_rgba(30,133,56,0.12)]"
          >
            {step.number}
          </motion.span>
        </span>
      </div>

      <motion.div
        style={still ? undefined : { rotateX, rotate, y, scale, opacity, transformOrigin: 'center top' }}
        className={cn('col-start-2 row-start-1', fromLeft ? 'md:col-start-1' : 'md:col-start-3')}
      >
        <SpotlightCard className="rounded-[1.75rem] bg-white p-7 ring-1 ring-black/5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary md:hidden">{when}</p>

          <h3 className="mt-2 text-lg font-medium text-foreground md:mt-0">{step.title}</h3>

          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
        </SpotlightCard>
      </motion.div>

      <motion.p
        aria-hidden="true"
        style={still ? undefined : { x: whenX }}
        className={cn(
          'row-start-1 hidden pt-1 font-heading text-4xl font-light tracking-[-0.04em] text-foreground/15 md:block lg:text-5xl',
          fromLeft ? 'md:col-start-3 md:text-left' : 'md:col-start-1 md:text-right',
        )}
      >
        {when}
      </motion.p>
    </li>
  )
}

// Garis vertikalnya sendiri: terisi warna seiring gulir, sehingga pembaca tahu
// sejauh mana prosesnya sudah berjalan.
const TimelineRail: FC<TimelineRailProps> = ({ fill, dotTop, still }): ReactNode => {
  return (
    <div aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px -translate-x-1/2 bg-foreground/10 md:left-1/2">
      <motion.div
        style={still ? { scaleY: 1 } : { scaleY: fill }}
        className="absolute inset-0 origin-top bg-gradient-to-b from-leaf via-primary to-primary-strong"
      />

      {!still && (
        <motion.span
          style={{ top: dotTop }}
          className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf shadow-[0_0_14px_3px_rgba(87,199,106,0.7)]"
        />
      )}
    </div>
  )
}

/** Cara kerja: empat langkah dari mencari sampai menempati kamar. */
const HowItWorksSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.6'] })
  const dotTop = useTransform(scrollYProgress, (value) => `${Math.min(100, Math.max(0, value * 100))}%`)

  return (
    <section id="cara-kerja" aria-labelledby="cara-kerja-title" className="scroll-mt-20 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="cara-kerja-title"
          eyebrow="Cara kerja"
          align="center"
          title="Dari pencarian sampai kunci di tangan."
          description="Empat langkah, masing-masing meninggalkan catatan yang bisa Anda buka kembali, termasuk dokumentasi kondisi kamar saat masuk dan keluar."
        />

        <div ref={ref} className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <TimelineRail fill={scrollYProgress} dotTop={dotTop} still={still} />

          <ol className="relative space-y-14 md:space-y-20">
            {LANDING_STEPS.map((step, index) => (
              <TimelineStep key={step.number} step={step} index={index} still={still} />
            ))}

            <li className="relative grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-5 md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] md:gap-x-12">
              <div className="relative z-10 col-start-1 row-start-1 md:col-start-2">
                <span className="relative flex size-12 items-center justify-center rounded-full bg-white text-muted-foreground ring-1 ring-black/10">
                  <Check className="size-5" aria-hidden="true" />

                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-forest text-leaf shadow-[0_0_0_8px_rgba(87,199,106,0.18)]"
                  >
                    <Check className="size-5" />
                  </span>
                </span>
              </div>

              <p className="col-start-2 row-start-1 text-base text-muted-foreground md:col-start-3">
                <span className="font-medium text-foreground">Room Passport tersimpan.</span> Kondisi kamar
                terdokumentasi dan disetujui kedua pihak, jadi tidak ada yang perlu diperdebatkan di akhir masa sewa.
              </p>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
