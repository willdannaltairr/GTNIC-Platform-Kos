import type { FC, KeyboardEvent, ReactNode } from 'react'

import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

const prices = [62, 58, 55, 53, 54, 60, 74, 92, 98, 88, 72, 58, 46, 41, 44, 63, 89, 112, 128, 131, 117, 96, 81, 70]

const bidHours = new Set([7, 8, 9, 17, 18, 19, 20])

const maxPrice = Math.max(...prices)
const minPrice = Math.min(...prices)
const peakHour = prices.indexOf(maxPrice)

const hourLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`

const TradeVisual: FC = (): ReactNode => {
  const [active, setActive] = useState<number | null>(null)
  const descriptionId = useId()

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setActive((current) => (current === null ? peakHour : Math.min(prices.length - 1, current + 1)))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setActive((current) => (current === null ? peakHour : Math.max(0, current - 1)))
    } else if (event.key === 'Escape') {
      setActive(null)
    }
  }

  const activePrice = active === null ? null : prices[active]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Day-ahead price, €/MWh</p>

        <ul className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-primary" />
            Bid window
          </li>

          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-sage" />
            Other hours
          </li>
        </ul>
      </div>

      <div className="relative mt-8">
        <div
          role="group"
          tabIndex={0}
          aria-roledescription="chart"
          aria-label="Hourly day-ahead prices with recommended bid windows"
          aria-describedby={descriptionId}
          onKeyDown={onKeyDown}
          className="flex h-40 items-end gap-[2px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        >
          {prices.map((price, hour) => {
            const isBid = bidHours.has(hour)
            const height = ((price - minPrice) / (maxPrice - minPrice)) * 100

            return (
              <button
                key={hour}
                type="button"
                onClick={() => setActive(hour)}
                onPointerEnter={() => setActive(hour)}
                aria-label={`${hourLabel(hour)}: €${price} per megawatt hour${isBid ? ', in the bid window' : ''}`}
                className={cn(
                  'flex-1 rounded-t-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isBid ? 'bg-primary' : 'bg-sage/60',
                  active === hour && 'ring-2 ring-primary-strong',
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            )
          })}
        </div>

        <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>

        <p id={descriptionId} className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {activePrice === null
            ? 'Hover or use the arrow keys to inspect an hour and bid window.'
            : `${hourLabel(active as number)} — €${activePrice} per megawatt hour${
                bidHours.has(active as number) ? ', in the recommended bid window' : ', outside the bid window'
              }.`}
        </p>
      </div>
    </div>
  )
}

export default TradeVisual
