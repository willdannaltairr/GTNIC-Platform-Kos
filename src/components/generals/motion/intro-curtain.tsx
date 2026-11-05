import type { FC, ReactNode } from 'react'

import { LogoMark } from '@/components/generals/logo'
import { siteConfig } from '@/constants/site'

// Pure CSS opening curtain: it plays once per full page load, needs no JavaScript,
// never blocks clicks and is skipped for visitors who prefer reduced motion.
const IntroCurtain: FC = (): ReactNode => {
  return (
    <div
      aria-hidden="true"
      className="intro-curtain pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-forest"
    >
      <div className="intro-curtain-inner flex items-center gap-3">
        <LogoMark tone="light" className="size-10" />

        <span className="font-heading text-4xl font-medium tracking-[-0.04em] text-white">{siteConfig.name}</span>
      </div>

      <span className="intro-curtain-bar absolute bottom-0 left-0 h-[2px] w-full origin-left bg-leaf" />
    </div>
  )
}

export default IntroCurtain
