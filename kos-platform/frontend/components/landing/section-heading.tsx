'use client'

import type { FC, ReactNode } from 'react'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import SplitReveal from '@/components/motion/split-reveal'

interface SectionHeadingProps {
  id: string
  eyebrow: string
  title: string
  accent?: string
  description?: ReactNode
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
  className?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Judul bagian yang dipakai berulang: label kecil, judul, lalu keterangan. */
const SectionHeading: FC<SectionHeadingProps> = ({
  id,
  eyebrow,
  title,
  accent,
  description,
  align = 'left',
  tone = 'light',
  className,
}): ReactNode => {
  const isDark = tone === 'dark'
  const titleWords = title.split(' ').length

  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 0.7, ease: EASE }}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]',
          isDark
            ? 'bg-white/10 text-forest-foreground/85 ring-1 ring-white/15'
            : 'bg-white text-foreground/70 ring-1 ring-black/5',
        )}
      >
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', isDark ? 'bg-leaf' : 'bg-primary')} />
        {eyebrow}
      </motion.p>

      <h2
        id={id}
        className={cn(
          'mt-5 text-balance font-heading text-[2.15rem] font-light leading-[1.08] tracking-[-0.035em] sm:text-5xl',
          isDark ? 'text-white' : 'text-foreground',
        )}
      >
        <SplitReveal text={title} delay={0.1} />

        {accent && (
          <SplitReveal
            text={accent}
            delay={0.1 + titleWords * 0.07}
            className={cn('block', isDark ? 'text-white/45' : 'text-foreground/45')}
          />
        )}
      </h2>

      {description && (
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
          className={cn(
            'mt-5 text-pretty text-base leading-relaxed sm:text-lg',
            align === 'center' && 'mx-auto max-w-2xl',
            isDark ? 'text-forest-foreground/75' : 'text-muted-foreground',
          )}
        >
          {description}
        </motion.p>
      )}
    </div>
  )
}

export default SectionHeading
