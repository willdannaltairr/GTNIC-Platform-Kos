import type { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/constants/site'

interface LogoMarkProps {
  className?: string
  tone?: 'brand' | 'light' | 'white'
}

interface LogoProps {
  className?: string
  markClassName?: string
  tone?: 'brand' | 'light'
}

// The mark is four tiles and a disc. On the brand tone two tiles take the deep
// green; on dark surfaces they turn white and only the soft tiles stay leaf.
export const LogoMark: FC<LogoMarkProps> = ({ className, tone = 'brand' }): ReactNode => {
  const strong = tone === 'brand' ? 'fill-primary' : 'fill-white'
  const soft = 'fill-leaf'

  return (
    <svg viewBox='0 0 32 32' aria-hidden='true' focusable='false' className={cn('size-7 shrink-0', className)}>
      <rect x='2' y='2' width='13' height='13' rx='4' className={strong} />
      <rect x='17' y='2' width='13' height='13' rx='4' className={soft} />
      <rect x='2' y='17' width='13' height='13' rx='4' className={soft} />
      <circle cx='23.5' cy='23.5' r='6.5' className={strong} />
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
        {siteConfig.name}
      </span>
    </span>
  )
}
