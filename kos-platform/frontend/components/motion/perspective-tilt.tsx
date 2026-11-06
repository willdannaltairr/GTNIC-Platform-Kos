'use client'

import type { FC, ReactNode } from 'react'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

interface PerspectiveTiltProps {
  children: ReactNode
  className?: string
}

/**
 * Meletakkan isinya mundur dalam ruang 3D lalu menegakkannya saat halaman
 * digulir — panel seolah "duduk" saat masuk ke layar.
 *
 * Penjaga `still` diperlukan di sini secara eksplisit: nilai dari useTransform
 * dipasang lewat `style`, dan MotionConfig reducedMotion hanya mematikan
 * animasi berbasis target (animate/whileInView) — nilai yang terikat langsung
 * ke style tetap bergerak mengikuti gulir.
 */
const PerspectiveTilt: FC<PerspectiveTiltProps> = ({ children, className }): ReactNode => {
  const still = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.2'] })

  const rotateX = useTransform(scrollYProgress, [0, 1], [26, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const y = useTransform(scrollYProgress, [0, 1], [80, 0])
  const opacity = useTransform(scrollYProgress, [0, 0.45], [0.35, 1])

  return (
    <div ref={ref} className={className} style={{ perspective: 1600 }}>
      <motion.div style={still ? undefined : { rotateX, scale, y, opacity, transformOrigin: 'center top' }}>
        {children}
      </motion.div>
    </div>
  )
}

export default PerspectiveTilt
