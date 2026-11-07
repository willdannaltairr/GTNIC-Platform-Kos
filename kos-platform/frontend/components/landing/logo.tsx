import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface LogoMarkProps {
  className?: string
  tone?: 'brand' | 'light'
}

interface LogoProps {
  className?: string
  markClassName?: string
  tone?: 'brand' | 'light'
}

/**
 * Tanda KosPlatform: empat kotak dan satu cakram.
 *
 * Di tone `brand` dua kotak memakai hijau tua; di permukaan gelap keduanya
 * berubah putih dan hanya kotak lembut yang tetap hijau daun.
 */
export const LogoMark: FC<LogoMarkProps> = ({ className, tone = 'brand' }): ReactNode => {
  const strong = tone === 'brand' ? 'fill-primary' : 'fill-white'
  const soft = 'fill-leaf'

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn('size-7 shrink-0', className)}>
      <rect x="2" y="2" width="13" height="13" rx="4" className={strong} />
      <rect x="17" y="2" width="13" height="13" rx="4" className={soft} />
      <rect x="2" y="17" width="13" height="13" rx="4" className={soft} />
      <circle cx="23.5" cy="23.5" r="6.5" className={strong} />
    </svg>
  )
}

export const Logo: FC<LogoProps> = ({ className, markClassName, tone = 'brand' }): ReactNode => {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark tone={tone} className={markClassName} />

      <span
        className={cn(
          'font-heading text-xl font-semibold tracking-tight',
          tone === 'light' ? 'text-white' : 'text-foreground',
        )}
      >
        KosPlatform
      </span>
    </span>
  )
}
