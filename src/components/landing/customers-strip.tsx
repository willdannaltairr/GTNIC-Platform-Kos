import type { FC, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { CustomerLogo } from '@/constants/landing'
import { BatteryFull, Mountain, Sun, Waves, Wind, Zap } from 'lucide-react'
import { customers } from '@/constants/landing'
const icons: Record<CustomerLogo['icon'], LucideIcon> = {
  wind: Wind,
  sun: Sun,
  zap: Zap,
  mountain: Mountain,
  battery: BatteryFull,
  waves: Waves,
}
const CustomersStrip: FC = (): ReactNode => {
  return (
    <section id="customers" aria-labelledby="customers-title" className="bg-background py-14 sm:py-20">
      {' '}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {' '}
        <h2 id="customers-title" className="reveal text-center text-sm text-muted-foreground">
          {' '}
          Trusted by operators balancing 14 GW of wind, solar and storage{' '}
        </h2>{' '}
      </div>{' '}
      <div className="marquee marquee-mask mt-10 overflow-hidden">
        {' '}
        <div className="marquee-track flex w-max">
          {' '}
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              className={copy === 1 ? 'marquee-copy flex shrink-0 items-center' : 'flex shrink-0 items-center'}
            >
              {' '}
              {customers.map((customer) => {
                const Icon = icons[customer.icon]
                return (
                  <li
                    key={customer.name}
                    className="flex items-center gap-2.5 px-8 text-foreground/40 transition-colors duration-300 hover:text-primary-strong sm:px-12"
                  >
                    {' '}
                    <Icon className="size-6 shrink-0" aria-hidden="true" />{' '}
                    <span className="whitespace-nowrap font-heading text-2xl font-semibold tracking-tight">
                      {' '}
                      {customer.name}{' '}
                    </span>{' '}
                  </li>
                )
              })}{' '}
            </ul>
          ))}{' '}
        </div>{' '}
      </div>{' '}
    </section>
  )
}
export default CustomersStrip
