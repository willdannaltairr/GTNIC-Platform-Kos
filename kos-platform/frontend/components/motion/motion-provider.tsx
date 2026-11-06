'use client'

import type { FC, ReactNode } from 'react'

import { MotionConfig } from 'motion/react'
import IntroCurtain from '@/components/motion/intro-curtain'
import SmoothScroll from '@/components/motion/smooth-scroll'
import ScrollProgress from '@/components/motion/scroll-progress'

/**
 * Semua yang perlu hidup hanya di landing page: tirai pembuka, penggulungan
 * halus, garis kemajuan baca, dan satu kebijakan gerak untuk seluruh pohon.
 *
 * Dipasang di (landing)/layout.tsx, bukan layout akar, supaya halaman /kos,
 * /masuk, dan /daftar tetap memakai penggulungan bawaan browser.
 */
const MotionProvider: FC<{ children: ReactNode }> = ({ children }): ReactNode => {
  return (
    <MotionConfig reducedMotion="user">
      <IntroCurtain />
      <SmoothScroll />
      <ScrollProgress />

      {children}
    </MotionConfig>
  )
}

export default MotionProvider
