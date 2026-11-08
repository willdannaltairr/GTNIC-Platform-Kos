'use client'

import type { FC, PointerEvent, ReactNode } from 'react'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

interface MagneticProps {
  children: ReactNode
  strength?: number
  className?: string
}

/**
 * Menarik isinya sedikit ke arah kursor.
 *
 * Hanya pointer jenis mouse yang diikuti; sentuhan dan pena diabaikan supaya
 * tombol tetap berperilaku biasa di perangkat layar sentuh. Saat pengunjung
 * memilih reduced motion, tarikannya dimatikan sama sekali, tombol yang
 * bergeser sendiri ke arah kursor justru jenis gerakan yang ingin dihindari.
 */
const Magnetic: FC<MagneticProps> = ({ children, strength = 0.3, className }): ReactNode => {
  const still = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 })

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (still || event.pointerType !== 'mouse' || !ref.current) return

    const rect = ref.current.getBoundingClientRect()

    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  const reset = (): void => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={still ? undefined : { x: springX, y: springY }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  )
}

export default Magnetic
