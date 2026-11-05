import type { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { linePath } from '@/lib/chart'
interface SparklineProps {
  values: number[]
  className?: string
  tone?: 'light' | 'dark'
}
const WIDTH = 100
const HEIGHT = 32
const PADDING = 3
const Sparkline: FC<SparklineProps> = ({ values, className, tone = 'light' }): ReactNode => {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * WIDTH,
    y: PADDING + (1 - (value - min) / span) * (HEIGHT - PADDING * 2),
  }))
  const last = points[points.length - 1]
  return (
    <div aria-hidden="true" className={cn('relative', className)}>
      {' '}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="size-full overflow-visible">
        {' '}
        <path
          d={linePath(points)}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={tone === 'dark' ? 'stroke-white/35' : 'stroke-sage'}
        />{' '}
      </svg>{' '}
      <span
        className={cn(
          'absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2',
          tone === 'dark' ? 'bg-leaf ring-forest' : 'bg-primary ring-white',
        )}
        style={{ left: '100%', top: `${(last.y / HEIGHT) * 100}%` }}
      />{' '}
    </div>
  )
}
export default Sparkline
