import type { FC, PointerEvent, ReactNode } from 'react'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  as?: 'article' | 'li' | 'div' | 'figure'
  children: ReactNode
  className?: string
  tone?: 'light' | 'dark'
}

// A soft glow that follows the pointer across the card surface.
const SpotlightCard: FC<SpotlightCardProps> = ({ as: Tag = 'div', children, className, tone = 'light' }): ReactNode => {
  const ref = useRef<HTMLElement>(null)

  const onMove = (event: PointerEvent<HTMLElement>): void => {
    const element = ref.current

    if (!element) return

    const rect = element.getBoundingClientRect()

    element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }

  const glow = tone === 'dark' ? 'rgba(87, 199, 106, 0.28)' : 'rgba(87, 199, 106, 0.16)'

  return (
    <Tag
      ref={ref as never}
      onPointerMove={onMove}
      className={cn(
        'group/spot relative isolate transition-transform duration-500 ease-out hover:-translate-y-1',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${glow}, transparent 65%)`,
        }}
      />

      {children}
    </Tag>
  )
}

export default SpotlightCard
