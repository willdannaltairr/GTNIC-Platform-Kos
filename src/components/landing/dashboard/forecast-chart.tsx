import type { FC, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import type { DashboardRange } from '@/constants/dashboard'

import { useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { areaToBaselinePath, bandPath, linePath, type ChartPoint } from '@/lib/chart'

interface ForecastChartProps {
  range: DashboardRange
}

const WIDTH = 1000
const HEIGHT = 300

const formatter = new Intl.NumberFormat('en-US')

const ForecastChart: FC<ForecastChartProps> = ({ range }): ReactNode => {
  const points = range.points
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const instructionsId = useId()

  // The axis ticks are the chart's domain, so the band the data sits in always
  // lands on labelled gridlines rather than floating between them.
  const ticks = range.yTicks
  const min = ticks[0]
  const max = ticks[ticks.length - 1]
  const span = max - min || 1

  const xPercent = (index: number): number => (points.length < 2 ? 0 : (index / (points.length - 1)) * 100)

  const toChart = (values: (number | null)[]): ChartPoint[] =>
    values.map((value, index) => ({
      x: xPercent(index),
      y: HEIGHT - (((value ?? min) - min) / span) * HEIGHT,
    }))

  const actualValues = points.map((point) => point.actual)
  const lastActual = actualValues.reduce<number>((last, value, index) => (value === null ? last : index), -1)

  const band = bandPath(toChart(points.map((point) => point.high)), toChart(points.map((point) => point.low)))
  const forecastLine = linePath(toChart(points.map((point) => point.forecast)))
  const actualLine =
    lastActual >= 1 ? linePath(toChart(actualValues.slice(0, lastActual + 1) as number[])) : ''
  const actualArea =
    lastActual >= 1 ? areaToBaselinePath(toChart(actualValues.slice(0, lastActual + 1) as number[]), HEIGHT) : ''

  const peakIndex = points.reduce((best, point, index) => (point.forecast > points[best].forecast ? index : best), 0)

  const describePoint = (point: (typeof points)[number]): string =>
    `${point.label}: forecast ${formatter.format(point.forecast)} megawatts, ${
      point.actual === null ? 'not yet metered' : `actual ${formatter.format(point.actual)} megawatts`
    }, expected between ${formatter.format(point.low)} and ${formatter.format(point.high)} megawatts.`

  const indexFromEvent = (event: { clientX: number }): number | null => {
    const element = wrapRef.current
    if (!element || points.length < 2) return null

    const rect = element.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const index = Math.round(ratio * (points.length - 1))

    return Math.min(points.length - 1, Math.max(0, index))
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setActiveIndex((current) => (current === null ? 0 : Math.min(points.length - 1, current + 1)))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setActiveIndex((current) => (current === null ? 0 : Math.max(0, current - 1)))
    } else if (event.key === 'Escape') {
      setActiveIndex(null)
    }
  }

  const activePoint = activeIndex === null ? null : points[activeIndex]

  return (
    <div className='relative mt-3 h-60 pb-7 pl-12 pt-9 sm:h-72'>
      <div aria-hidden='true' className='absolute bottom-7 left-0 top-9 w-10'>
        {ticks
          .slice()
          .reverse()
          .map((tick, index) => (
            <span
              key={tick}
              className='absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground'
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              {formatter.format(tick)}
            </span>
          ))}
      </div>

      <div className='relative h-full'>
        <svg
          aria-hidden='true'
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio='none'
          className='absolute inset-0 size-full'
        >
          {ticks.map((tick, index) => {
            const y = HEIGHT - ((tick - min) / span) * HEIGHT

            return (
              <line
                key={tick}
                x1={0}
                x2={WIDTH}
                y1={y}
                y2={y}
                strokeWidth={1}
                vectorEffect='non-scaling-stroke'
                className='stroke-border'
                data-tick={index}
              />
            )
          })}

          <path d={band} className='fill-chart-2/[0.07]' />
          <path d={actualArea} className='fill-primary/10' />

          <path
            d={forecastLine}
            fill='none'
            strokeWidth={2}
            strokeDasharray='6 6'
            strokeLinecap='round'
            strokeLinejoin='round'
            vectorEffect='non-scaling-stroke'
            className='stroke-chart-2'
          />

          {actualLine && (
            <path
              d={actualLine}
              fill='none'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              vectorEffect='non-scaling-stroke'
              className='stroke-primary'
            />
          )}
        </svg>

        {range.nowIndex !== null && range.nowIndex < points.length && (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-y-0 w-px bg-foreground/20'
            style={{ left: `${xPercent(range.nowIndex)}%` }}
          >
            <span className='absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-white'>
              Now
            </span>
          </div>
        )}

        <span
          aria-hidden='true'
          className='pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun ring-2 ring-white'
          style={{
            left: `${xPercent(peakIndex)}%`,
            top: `${HEIGHT - ((points[peakIndex].forecast - min) / span) * HEIGHT}px`,
          }}
        />

        <p
          aria-hidden='true'
          className='pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-[11px] font-medium text-muted-foreground'
        >
          {range.caption}
        </p>

        <div
          ref={wrapRef}
          role='group'
          tabIndex={0}
          aria-roledescription='chart'
          aria-label={`${range.chartTitle}, ${range.chartSubtitle}`}
          aria-describedby={instructionsId}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            setDragging(true)
            setActiveIndex(indexFromEvent(event))
          }}
          onPointerMove={(event) => {
            if (!dragging && event.pointerType !== 'mouse') return
            setActiveIndex(indexFromEvent(event))
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
          className='absolute inset-0 cursor-crosshair touch-pan-y rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4'
        />

        <p id={instructionsId} className='sr-only'>
          Use the left and right arrow keys to move through the chart.
        </p>

        <p className='sr-only' aria-live='polite'>
          {activePoint ? describePoint(activePoint) : ''}
        </p>

        {activePoint && (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-xl bg-foreground px-3 py-2 text-xs text-white shadow-lg'
            style={{ left: `${xPercent(activeIndex as number)}%` }}
          >
            <p className='font-medium tabular-nums'>{activePoint.label}</p>
            <p className='mt-1 tabular-nums text-white/75'>Forecast {formatter.format(activePoint.forecast)} MW</p>
            <p className='tabular-nums text-white/75'>
              Actual {activePoint.actual === null ? 'not yet' : `${formatter.format(activePoint.actual)} MW`}
            </p>
          </div>
        )}
      </div>

      <div aria-hidden='true' className='absolute bottom-0 left-12 right-0 h-5'>
        {points.map((point, index) => {
          if (index % range.tickEvery !== 0) return null

          const left = xPercent(index)

          return (
            <span
              key={point.label}
              className={cn(
                'absolute top-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground',
                left === 0 ? 'translate-x-0' : left === 100 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: `${left}%` }}
            >
              {point.label}
            </span>
          )
        })}
      </div>

      <table className='sr-only'>
        <caption>
          Load forecast versus actual, {range.chartSubtitle.toLowerCase()}
        </caption>

        <thead>
          <tr>
            <th scope='col'>Time</th>
            <th scope='col'>Forecast (MW)</th>
            <th scope='col'>Actual (MW)</th>
            <th scope='col'>Expected low (MW)</th>
            <th scope='col'>Expected high (MW)</th>
          </tr>
        </thead>

        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope='row'>{point.label}</th>
              <td>{formatter.format(point.forecast)}</td>
              <td>{point.actual === null ? 'Not yet available' : formatter.format(point.actual)}</td>
              <td>{formatter.format(point.low)}</td>
              <td>{formatter.format(point.high)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ForecastChart
