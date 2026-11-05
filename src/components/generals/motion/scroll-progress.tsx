import type { FC, ReactNode } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
const ScrollProgress: FC = (): ReactNode => {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-leaf via-primary to-primary-strong"
      style={{ scaleX }}
    />
  )
}
export default ScrollProgress
