import type { FC, ReactNode } from 'react'
import type { RangeId } from '@/constants/dashboard'

import { useState } from 'react'
import { BatteryCharging, Bell, ChartLine, LayoutGrid, Search, Settings, Wind } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/generals/logo'
import KpiTile from '@/components/landing/dashboard/kpi-tile'
import ActionList from '@/components/landing/dashboard/action-list'
import ForecastChart from '@/components/landing/dashboard/forecast-chart'
import GenerationMix from '@/components/landing/dashboard/generation-mix'
import { dashboardRanges } from '@/constants/dashboard'

const tabs = ['Overview', 'Forecast & balancing', 'Operations', 'Assets', 'Markets', 'Reports']

const railIcons = [LayoutGrid, ChartLine, BatteryCharging, Wind, Bell]

const legend = (
  <ul className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground'>
    <li className='flex items-center gap-2'>
      <span aria-hidden='true' className='h-0.5 w-4 rounded-full bg-primary' />
      Actual
    </li>

    <li className='flex items-center gap-2'>
      <svg aria-hidden='true' viewBox='0 0 16 2' className='h-0.5 w-4'>
        <line x1='0' y1='1' x2='16' y2='1' strokeWidth='2' strokeDasharray='4 3' className='stroke-chart-2' />
      </svg>
      Forecast
    </li>

    <li className='flex items-center gap-2'>
      <span aria-hidden='true' className='h-2.5 w-4 rounded-[3px] bg-chart-2/10' />
      Expected range
    </li>

    <li className='flex items-center gap-2'>
      <span aria-hidden='true' className='size-2.5 rounded-full bg-sun ring-2 ring-white' />
      Forecast peak
    </li>
  </ul>
)

const ForecastDashboard: FC = (): ReactNode => {
  const [rangeId, setRangeId] = useState<RangeId>('today')
  const [scheduled, setScheduled] = useState<Record<string, boolean>>({})

  const range = dashboardRanges.find((item) => item.id === rangeId) ?? dashboardRanges[0]

  const toggleAction = (id: string): void => {
    setScheduled((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <div
      role='region'
      aria-label='Interactive preview of the Gridora dashboard'
      className='overflow-hidden rounded-[1.75rem] bg-background text-left shadow-[0_60px_120px_-50px_rgba(0,0,0,0.75)] ring-1 ring-white/15'
    >
      <div className='flex'>
        <div
          aria-hidden='true'
          className='hidden w-[68px] shrink-0 flex-col items-center border-r border-black/5 bg-white/70 py-5 lg:flex'
        >
          <LogoMark className='size-7' />

          <div className='mt-8 flex flex-col gap-2'>
            {railIcons.map((Icon, index) => (
              <span
                key={index}
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  index === 1 ? 'bg-foreground text-white' : 'text-muted-foreground',
                )}
              >
                <Icon className='size-5' />
              </span>
            ))}
          </div>

          <span className='mt-auto flex size-10 items-center justify-center rounded-xl text-muted-foreground'>
            <Settings className='size-[18px]' />
          </span>
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-4 border-b border-black/5 bg-white/70 px-4 py-3 sm:px-6'>
            <div aria-hidden='true' className='flex min-w-0 items-center gap-1 overflow-hidden'>
              {tabs.map((tab, index) => (
                <span
                  key={tab}
                  className={cn(
                    'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium',
                    index === 1
                      ? 'bg-background text-foreground ring-1 ring-black/5'
                      : 'hidden text-muted-foreground',
                    index > 1 && index < 4 && 'md:inline',
                    index >= 4 && 'md:hidden xl:inline',
                  )}
                >
                  {tab}
                </span>
              ))}
            </div>

            <div aria-hidden='true' className='flex shrink-0 items-center gap-2'>
              <span className='hidden items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-black/5 sm:inline-flex'>
                <Search className='size-3.5' />
                Search sites
              </span>

              <span className='flex size-8 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-white'>
                MH
              </span>
            </div>
          </div>

          <div className='p-4 sm:p-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <h3 className='font-heading text-xl font-medium tracking-tight text-foreground sm:text-2xl'>
                  Load forecast &amp; balancing
                </h3>

                <p className='mt-1 text-xs text-muted-foreground sm:text-sm'>
                  AI forecasts for 42 sites, refreshed every five minutes
                </p>
              </div>

              <div
                role='group'
                aria-label='Time range'
                className='inline-flex self-start rounded-full bg-white p-1 ring-1 ring-black/5 sm:self-auto'
              >
                {dashboardRanges.map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => setRangeId(item.id)}
                    aria-pressed={item.id === range.id}
                    className={cn(
                      'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      item.id === range.id
                        ? 'bg-foreground text-white'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4'>
              {range.kpis.map((item) => (
                <KpiTile key={item.id} item={item} />
              ))}
            </div>

            <div className='mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]'>
              <div className='min-w-0 rounded-2xl bg-card p-4 ring-1 ring-black/[0.06] sm:p-5'>
                <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                  <h4 className='text-sm font-medium text-foreground'>{range.chartTitle}</h4>

                  <p className='text-xs text-muted-foreground'>{range.chartSubtitle}</p>
                </div>

                <div className='mt-3'>
                  {legend}

                  <ForecastChart range={range} />
                </div>
              </div>

              <div className='min-w-0 rounded-2xl bg-card p-4 ring-1 ring-black/[0.06] sm:p-5'>
                <GenerationMix mix={range.mix} />
              </div>
            </div>

            <div className='mt-3 rounded-2xl bg-card p-4 ring-1 ring-black/[0.06] sm:p-5'>
              <ActionList actions={range.actions} scheduled={scheduled} onToggle={toggleAction} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForecastDashboard
