import type { FC, ReactNode } from 'react'

import { BatteryCharging, ShieldCheck } from 'lucide-react'
import { areaToBaselinePath, linePath, type ChartPoint } from '@/lib/chart'

const WIDTH = 100
const HEIGHT = 100

const forecast = [1860, 1690, 1670, 2010, 2410, 2380, 2220, 2260, 2600, 2914, 2690, 2240]

const points: ChartPoint[] = forecast.map((value, index) => ({
  x: (index / (forecast.length - 1)) * WIDTH,
  y: HEIGHT - ((value - 1600) / (3000 - 1600)) * HEIGHT,
}))

const peak = points.reduce((highest, point) => (point.y < highest.y ? point : highest), points[0])

const PhoneForecast: FC = (): ReactNode => {
  return (
    <div className="mx-auto w-full max-w-[19rem] rounded-[2.25rem] bg-forest p-4 text-white shadow-[0_40px_80px_-40px_rgba(14,26,18,0.7)] ring-1 ring-white/10">
      <div className="rounded-[1.75rem] bg-white/[0.04] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Gridora</p>

          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/80">Today</span>
        </div>

        <p className="mt-5 font-heading text-[2.6rem] font-light leading-none tracking-tight">
          2,914
          <span className="ml-1 text-sm font-normal text-white/60">MW</span>
        </p>

        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/70">
          <span className="size-1.5 rounded-full bg-sun" />
          Peak expected at 18:00
        </p>

        <div className="relative mt-5 h-28">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <path d={areaToBaselinePath(points, HEIGHT)} className="fill-leaf/15" />

            <path
              d={linePath(points)}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-leaf"
            />
          </svg>

          <span
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun ring-2 ring-forest"
            style={{ left: `${(peak.x / WIDTH) * 100}%`, top: `${(peak.y / HEIGHT) * 100}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-white/45">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[0.08] p-3">
            <ShieldCheck className="size-4 text-leaf" aria-hidden="true" />

            <p className="mt-2 text-lg font-medium leading-none">94%</p>

            <p className="mt-1 text-[10px] text-white/60">Confidence</p>
          </div>

          <div className="rounded-2xl bg-white/[0.08] p-3">
            <BatteryCharging className="size-4 text-leaf" aria-hidden="true" />

            <p className="mt-2 text-lg font-medium leading-none">680</p>

            <p className="mt-1 text-[10px] text-white/60">MWh ready</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhoneForecast
