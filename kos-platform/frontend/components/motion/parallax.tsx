'use client'

import type { FC, ReactNode } from 'react'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

interface ParallaxProps {
  children: ReactNode
  /** Jarak geser puncak dalam piksel; makin besar makin terasa dalam. */
  offset?: number
  className?: string
}

/** Menggeser isinya berlawanan arah gulir untuk memberi kesan kedalaman. */
const Parallax: FC<ParallaxProps> = ({ children, offset = 60, className }): ReactNode => {
  const still = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])

  return (
    <motion.div ref={ref} style={still ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  )
}

export default Parallax
