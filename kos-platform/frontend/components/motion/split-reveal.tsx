'use client'

import type { FC, ReactNode } from 'react'
import type { Variants } from 'motion/react'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface SplitRevealProps {
  text: string
  className?: string
  delay?: number
  stagger?: number
  trigger?: 'view' | 'mount'
}

const EASE = [0.22, 1, 0.36, 1] as const

const word: Variants = {
  hidden: { y: '115%' },
  visible: { y: '0%', transition: { duration: 0.95, ease: EASE } },
}

/**
 * Reveal kata demi kata dengan masking.
 *
 * Pembaca layar menerima kalimat utuh sekali lewat `sr-only`, sedangkan salinan
 * yang dianimasikan ditandai `aria-hidden` supaya tidak dibacakan dua kali.
 */
const SplitReveal: FC<SplitRevealProps> = ({
  text,
  className,
  delay = 0,
  stagger = 0.07,
  trigger = 'view',
}): ReactNode => {
  const words = text.split(' ')

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  }

  const play =
    trigger === 'mount'
      ? { animate: 'visible' }
      : { whileInView: 'visible', viewport: { once: true, margin: '0px 0px -12% 0px' } }

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>

      <motion.span aria-hidden="true" initial="hidden" variants={container} {...play}>
        {words.map((item, index) => (
          <span key={`${item}-${index}`}>
            <span className="-my-[0.12em] inline-block overflow-hidden py-[0.12em] align-bottom">
              <motion.span variants={word} className={cn('inline-block will-change-transform')}>
                {item}
              </motion.span>
            </span>
            {index < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

export default SplitReveal
