'use client'

import type { FC, ReactNode } from 'react'

import { motion } from 'motion/react'

interface ClipRevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/** Membuka isinya dari bawah ke atas seperti tirai yang ditarik. */
const ClipReveal: FC<ClipRevealProps> = ({ children, className, delay = 0 }): ReactNode => {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

export default ClipReveal
