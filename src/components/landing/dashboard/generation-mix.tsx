import type { FC, ReactNode } from 'react'
import type { MixItem } from '@/constants/dashboard'
import { cn } from '@/lib/utils'
interface GenerationMixProps {
  mix: MixItem[]
}
const mixColors: Record<MixItem['id'], string> = {
  wind: 'bg-chart-1',
  solar: 'bg-chart-3',
  hydro: 'bg-chart-4',
  other: 'bg-chart-5',
}
const GenerationMix: FC<GenerationMixProps> = ({ mix }): ReactNode => {
  const summary = mix.map((item) => `${item.label} ${item.share}%`).join(', ')
  return (
    <div>
      {' '}
      <div className="flex items-baseline justify-between gap-3">
        {' '}
        <h4 className="text-sm font-medium text-foreground"> Generation mix </h4>{' '}
        <p className="text-xs text-muted-foreground"> Share of output </p>{' '}
      </div>{' '}
      <div
        role="img"
        aria-label={`Generation mix: ${summary}`}
        className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full"
      >
        {' '}
        {mix.map((item) => (
          <div
            key={item.id}
            className={cn('h-full transition-[flex-grow] duration-500', mixColors[item.id])}
            style={{ flexGrow: item.share, flexBasis: 0 }}
          />
        ))}{' '}
      </div>{' '}
      <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
        {' '}
        {mix.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
            {' '}
            <span className="flex items-center gap-2 text-foreground">
              {' '}
              <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', mixColors[item.id])} /> {item.label}{' '}
            </span>{' '}
            <span className="font-medium tabular-nums text-foreground"> {item.share}% </span>{' '}
          </li>
        ))}{' '}
      </ul>{' '}
    </div>
  )
}
export default GenerationMix
