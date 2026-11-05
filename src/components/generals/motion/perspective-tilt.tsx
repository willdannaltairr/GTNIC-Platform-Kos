import type { FC, ReactNode } from 'react'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

interface PerspectiveTiltProps {
  children: ReactNode
  className?: string
}

// Lays its content back in 3D and rights it as the visitor scrolls it into place.
const PerspectiveTilt: FC<PerspectiveTiltProps> = ({ children, className }): ReactNode => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.2'] })

  const rotateX = useTransform(scrollYProgress, [0, 1], [26, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const y = useTransform(scrollYProgress, [0, 1], [80, 0])
  const opacity = useTransform(scrollYProgress, [0, 0.45], [0.35, 1])

  return (
    <div ref={ref} className={className} style={{ perspective: 1600 }}>
      <motion.div style={{ rotateX, scale, y, opacity, transformOrigin: 'center top' }}>{children}</motion.div>
    </div>
  )
}

export default PerspectiveTilt
