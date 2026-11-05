import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SlotState = 'idle' | 'charge' | 'discharge'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STATE_OF_CHARGE = 72

// A day of storage decisions: charge into the midday solar peak, discharge into
// the evening peak, idle either side of them.
const plan: SlotState[] = Array.from({ length: 24 }, (_, hour) => {
  if (hour >= 11 && hour <= 14) return 'charge'
  if (hour >= 17 && hour <= 20) return 'discharge'
  return 'idle'
})

const slotStyles: Record<SlotState, string> = {
  idle: 'bg-mist',
  charge: 'bg-primary',
  discharge: 'bg-chart-2',
}

const facts = [
  { label: 'Charging now', value: '+42 MW' },
  { label: 'Full by', value: '15:10' },
  { label: 'Held for the peak', value: '520 MWh' },
]

const BalanceVisual: FC = (): ReactNode => {
  return (
    <div>
      <div className="flex items-center gap-6 sm:gap-8">
        <div
          role="img"
          aria-label={`Battery state of charge ${STATE_OF_CHARGE}%`}
          className="relative size-28 shrink-0 sm:size-32"
        >
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-leaf-soft" />

            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - STATE_OF_CHARGE / 100)}
              className="stroke-primary"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-3xl font-light tracking-tight text-foreground">{STATE_OF_CHARGE}%</span>

            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Charged</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">Storage plan, 24 hours</p>

          <div aria-hidden="true" className="mt-3 grid grid-cols-12 gap-[3px]">
            {plan.map((slot, hour) => (
              <span
                key={hour}
                className={cn('h-2.5 rounded-[3px]', slotStyles[slot])}
                title={`${String(hour).padStart(2, '0')}:00 — ${slot}`}
              />
            ))}
          </div>

          <ul className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-primary" />
              Charge
            </li>

            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-chart-2" />
              Discharge
            </li>

            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-mist" />
              Idle
            </li>
          </ul>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>

            <dd className="mt-1 font-heading text-lg font-medium tabular-nums text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default BalanceVisual
