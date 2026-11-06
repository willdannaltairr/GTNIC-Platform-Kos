import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface MatchVisualProps {
  factors: { label: string; weight: number; score: number }[]
  className?: string
}

/**
 * Skor KosMatch yang bisa ditelusuri: empat faktor, bobotnya terbuka, dan
 * kontribusi masing-masing terhadap skor akhir.
 */
const MatchVisual: FC<MatchVisualProps> = ({ factors, className }): ReactNode => {
  const total = Math.round(factors.reduce((sum, factor) => sum + (factor.score * factor.weight) / 100, 0))

  return (
    <div className={cn('w-full rounded-2xl bg-card p-5 ring-1 ring-black/5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">KosMatch</p>
          <h3 className="mt-1.5 font-heading text-lg font-medium tracking-tight text-foreground">
            Kos Melati, Sleman
          </h3>
        </div>

        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-center ring-1 ring-black/5">
          <span>
            <span className="block font-heading text-xl font-semibold leading-none text-accent-foreground">
              {total}
            </span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-accent-foreground/70">
              skor
            </span>
          </span>
        </span>
      </div>

      <ul className="mt-5 space-y-4">
        {factors.map((factor) => (
          <li key={factor.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{factor.label}</span>

              <span className="text-xs text-muted-foreground">
                bobot <span className="tabular-nums">{factor.weight}%</span> · skor{' '}
                <span className="tabular-nums">{factor.score}</span>
              </span>
            </div>

            <span aria-hidden="true" className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-leaf-soft">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-leaf to-primary-strong"
                style={{ width: `${factor.score}%` }}
              />
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        Skor adalah estimasi kecocokan berdasarkan bobot di atas — bukan jaminan kualitas kos.
      </p>
    </div>
  )
}

export default MatchVisual
