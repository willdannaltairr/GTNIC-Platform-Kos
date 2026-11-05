import type { FC, ReactNode } from 'react'
import type { KpiItem } from '@/constants/dashboard'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sparkline from '@/components/landing/dashboard/sparkline'

interface KpiTileProps {
  item: KpiItem
}

const toneStyles: Record<KpiItem['tone'], string> = {
  good: 'text-accent-foreground',
  bad: 'text-orange-700',
  neutral: 'text-muted-foreground',
}

const KpiTile: FC<KpiTileProps> = ({ item }): ReactNode => {
  const DirectionIcon = item.direction === 'up' ? TrendingUp : item.direction === 'down' ? TrendingDown : null
  const meterShare = item.meter ? Math.round((item.meter.value / item.meter.max) * 100) : 0

  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-card p-4 ring-1 ring-black/[0.06]">
      <p className="truncate text-xs text-muted-foreground">{item.label}</p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-heading text-2xl font-medium tracking-tight text-foreground">
          {item.value}
          <span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span>
        </p>

        {item.trend && <Sparkline values={item.trend} className="mb-1.5 h-7 w-16 shrink-0 sm:w-20" />}
      </div>

      {item.meter && (
        <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-leaf-soft">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${meterShare}%` }}
          />
        </div>
      )}

      <p className={cn('mt-auto flex items-center gap-1.5 pt-3 text-xs', toneStyles[item.tone])}>
        {DirectionIcon && <DirectionIcon className="size-3.5 shrink-0" aria-hidden="true" />}
        <span className="truncate">{item.delta}</span>
      </p>
    </div>
  )
}

export default KpiTile
