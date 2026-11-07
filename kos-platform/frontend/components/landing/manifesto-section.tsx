'use client'

import type { FC, ReactNode } from 'react'
import type { MotionValue } from 'motion/react'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { MANIFESTO } from '@/lib/landing'

interface TokenProps {
  progress: MotionValue<number>
  range: [number, number]
  still: boolean
}

interface WordProps extends TokenProps {
  word: string
  accent: boolean
}

interface PillProps extends TokenProps {
  src: string
}

// Kalimat menyala bertahap di sepanjang bagian gulir yang disematkan ini.
const START = 0.06
const END = 0.84
const STEP = (END - START) / MANIFESTO.length

const Word: FC<WordProps> = ({ word, accent, progress, range, still }): ReactNode => {
  const opacity = useTransform(progress, range, [0.12, 1])
  const y = useTransform(progress, range, ['0.22em', '0em'])

  return (
    <motion.span style={still ? undefined : { opacity, y }} className={cn('inline-block', accent && 'text-primary')}>
      {word}
    </motion.span>
  )
}

// Kapsul foto kecil yang membuka di tengah kalimat saat gulir mencapainya.
const Pill: FC<PillProps> = ({ src, progress, range, still }): ReactNode => {
  const clipPath = useTransform(progress, range, [
    'inset(0% 100% 0% 0% round 999px)',
    'inset(0% 0% 0% 0% round 999px)',
  ])
  const scale = useTransform(progress, range, [1.5, 1])

  return (
    <motion.span
      aria-hidden="true"
      style={still ? undefined : { clipPath, scale }}
      className="relative mx-1 inline-block h-[0.78em] w-[1.9em] overflow-hidden rounded-full align-[-0.04em]"
    >
      <Image src={src} alt="" fill sizes="8rem" className="object-cover" />
    </motion.span>
  )
}

/**
 * Manifesto: satu kalimat panjang yang menyala kata demi kata mengikuti gulir,
 * dengan bilah kemajuan di bawahnya. Tinggi 260svh memberi ruang gerak tanpa
 * memaksa pembaca menunggu terlalu lama.
 */
const ManifestoSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  const ref = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const barWidth = useTransform(scrollYProgress, (value) => `${Math.round(Math.min(1, value * 1.15) * 100)}%`)
  const barLabel = useTransform(scrollYProgress, (value) => `${Math.round(Math.min(1, value * 1.15) * 100)}%`)

  return (
    <section ref={ref} id="manifesto" aria-labelledby="manifesto-title" className="relative h-[260svh] bg-background">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h2
              id="manifesto-title"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-foreground/70 ring-1 ring-black/5"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              Kenapa KosPlatform
            </h2>

            <span aria-hidden="true" className="h-px flex-1 bg-foreground/10" />
          </div>

          <p className="mt-8 font-heading text-[1.85rem] font-light leading-[1.16] tracking-[-0.035em] sm:mt-10 sm:text-5xl sm:leading-[1.1] lg:text-6xl">
            {MANIFESTO.map((token, index) => {
              const start = START + index * STEP
              const range: [number, number] = [start, Math.min(1, start + STEP)]

              return (
                <span key={`${token.word}-${index}`}>
                  {token.pill && (
                    <Pill src={token.pill} progress={scrollYProgress} range={range} still={still} />
                  )}

                  <Word word={token.word} accent={token.accent} progress={scrollYProgress} range={range} still={still} />

                  {index < MANIFESTO.length - 1 ? ' ' : null}
                </span>
              )
            })}
          </p>

          <div className="mt-10 flex items-center gap-4 sm:mt-14">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Informasi terbuka
            </span>

            <span aria-hidden="true" className="relative h-1 flex-1 overflow-hidden rounded-full bg-leaf-soft">
              <motion.span
                style={still ? { width: '100%' } : { width: barWidth }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-leaf to-primary-strong"
              />
            </span>

            <span className="w-12 text-right font-mono text-sm tabular-nums text-foreground">
              {still ? '100%' : <motion.span>{barLabel}</motion.span>}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ManifestoSection
