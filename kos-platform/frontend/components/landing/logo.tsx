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
 * Tanda HuniKos.
 *
 * Sebuah rumah kecil di atas latar krem: atap dan alas slate, lalu empat ubin
 * hijau yang masing-masing membawa satu janji platform — tambah kamar, jendela
 * atau fasilitas, pintu atau akses, dan target atau kecocokan. Warnanya sengaja
 * hanya krem, slate, hijau, dan putih supaya tetap satu keluarga dengan palet
 * hijau situs, termasuk saat dipasang di permukaan gelap.
 */
export const LogoMark: FC<LogoMarkProps> = ({ className, tone = 'brand' }): ReactNode => {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn(
        'size-7 shrink-0',
        tone === 'light' && 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.28)]',
        className,
      )}
    >
      <rect width="64" height="64" rx="14" fill="#F6F0E1" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="13.5" stroke="#2E3A39" strokeOpacity="0.08" />

      {/* Atap dan alas rumah. */}
      <path
        d="M32 6.5 57.5 26.5H48.2L32 16.1 15.8 26.5H6.5Z"
        fill="#2E3A39"
        stroke="#2E3A39"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="16" y="61.6" width="32" height="1.9" rx="0.95" fill="#2E3A39" />

      {/* Empat ubin: plus, jendela, pintu, dan target kucing. */}
      <rect x="16" y="28.5" width="14.5" height="14.5" rx="3.5" fill="#1E6B3B" />
      <rect x="33.5" y="28.5" width="14.5" height="14.5" rx="3.5" fill="#86C97F" />
      <rect x="16" y="46" width="14.5" height="14.5" rx="3.5" fill="#86C97F" />
      <rect x="33.5" y="46" width="14.5" height="14.5" rx="3.5" fill="#1E6B3B" />

      {/* Plus. */}
      <path
        d="M18.9 35.75H27.6M23.25 31.4V40.1"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Jendela dua kali dua. */}
      <g fill="#FFFFFF">
        <rect x="37.25" y="32.25" width="2.9" height="2.9" rx="0.5" />
        <rect x="41.35" y="32.25" width="2.9" height="2.9" rx="0.5" />
        <rect x="37.25" y="36.35" width="2.9" height="2.9" rx="0.5" />
        <rect x="41.35" y="36.35" width="2.9" height="2.9" rx="0.5" />
      </g>

      {/* Pintu. */}
      <path d="M19.85 58.8V54a3.4 3.4 0 0 1 6.8 0v4.8Z" fill="#FFFFFF" />
      <circle cx="24.9" cy="55.6" r="0.55" fill="#1E6B3B" />

      {/* Target berkuping kucing. */}
      <g fill="#FFFFFF">
        <path d="M37.1 51.4 37.9 47.9 40.3 50.1Z" />
        <path d="M44.4 51.4 43.6 47.9 41.2 50.1Z" />
        <circle cx="40.75" cy="54.6" r="4.3" />
      </g>
      <circle cx="40.75" cy="54.6" r="2.85" fill="none" stroke="#1E6B3B" strokeWidth="0.85" />
      <circle cx="40.75" cy="54.6" r="1.15" fill="#1E6B3B" />
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
          tone === 'light' ? 'text-white' : 'text-forest',
        )}
      >
        Huni
        <span className={tone === 'light' ? 'text-leaf' : 'text-primary'}>Kos</span>
      </span>
    </span>
  )
}
