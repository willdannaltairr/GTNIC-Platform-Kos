import type { FC, PointerEvent, ReactNode } from 'react'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/utils'

interface MagneticProps {
  children: ReactNode
  strength?: number
  className?: string
}

// Pulls its child gently toward a mouse pointer. Touch and pen input are ignored.
const Magnetic: FC<MagneticProps> = ({ children, strength = 0.3, className }): ReactNode => {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 })

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== 'mouse' || !ref.current) return

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
      style={{ x: springX, y: springY }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  )
}

export default Magnetic
