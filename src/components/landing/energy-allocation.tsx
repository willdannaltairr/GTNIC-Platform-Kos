import type { FC, ReactNode } from 'react'
import type { Variants } from 'motion/react'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import CountUp from '@/components/generals/motion/count-up'

interface AllocationRow {
  label: string
  value: number
  swatch: string
}

interface EnergyAllocationCardProps {
  className?: string
  animated?: boolean
}

const rows: AllocationRow[] = [
  { label: 'Battery storage', value: 92, swatch: 'bg-chart-4' },
  { label: 'Spot market', value: 68, swatch: 'bg-primary-strong' },
  { label: 'Grid demand', value: 47, swatch: 'bg-chart-3' },
  { label: 'Curtailment', value: 19, swatch: 'bg-sun' },
]

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 1.85 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const EnergyAllocationCard: FC<EnergyAllocationCardProps> = ({ className, animated = false }): ReactNode => {
  return (
    <section
      aria-labelledby="allocation-title"
      className={cn(
        'w-full max-w-sm border border-dashed border-primary-strong/50 bg-white/20 p-6 backdrop-blur-[2px] sm:p-7',
        className,
      )}
    >
      <h2 id="allocation-title" className="text-lg font-normal text-primary-strong">
        Energy allocation
      </h2>

      <p className="mt-1 text-xs text-muted-foreground">Where this hour&rsquo;s output should go</p>

      <motion.ul className="mt-5 space-y-4" variants={list} initial={animated ? 'hidden' : false} animate="visible">
        {rows.map((row) => (
          <motion.li key={row.label} variants={item} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2.5 text-[15px] text-primary-strong">
              <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', row.swatch)} />
              {row.label}
            </span>

            <span className="font-heading text-lg font-medium tabular-nums text-primary-strong">
              {animated ? <CountUp value={`${row.value}%`} /> : `${row.value}%`}
            </span>
          </motion.li>
        ))}
      </motion.ul>

      <p className="mt-5 border-t border-dashed border-primary-strong/30 pt-4 text-xs leading-relaxed text-primary-strong/70">
        Recommended by Gridora for the current hour, based on the day-ahead forecast.
      </p>
    </section>
  )
}

export default EnergyAllocationCard
