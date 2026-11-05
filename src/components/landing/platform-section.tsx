import type { FC, ReactNode } from 'react'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import SectionHeading from '@/components/landing/section-heading'
import ForecastDashboard from '@/components/landing/dashboard/forecast-dashboard'
import PerspectiveTilt from '@/components/generals/motion/perspective-tilt'
import { capabilities } from '@/constants/landing'

const PlatformSection: FC = (): ReactNode => {
  return (
    <section
      id='product'
      aria-labelledby='product-title'
      className='relative isolate scroll-mt-20 overflow-hidden bg-forest py-24 sm:py-32'
    >
      <Image
        src='/images/hills-mist.jpg'
        alt=''
        fill
        sizes='100vw'
        className='-z-20 object-cover object-bottom opacity-60'
      />

      <div
        aria-hidden='true'
        className='absolute inset-0 -z-10 bg-gradient-to-b from-forest via-forest/80 to-forest/95'
      />

      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <SectionHeading
          id='product-title'
          eyebrow='The platform'
          tone='dark'
          align='center'
          title='One calm workspace for the whole energy day.'
          description='Forecasts, storage, prices and recommended actions sit side by side, so the people balancing your grid act on the same picture. Try it: switch the range, hover the chart, schedule an action.'
        />

        <PerspectiveTilt className='mt-14'>
          <ForecastDashboard />
        </PerspectiveTilt>

        <ul className='mt-14 grid gap-8 sm:grid-cols-3'>
          {capabilities.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.title} className='reveal flex gap-4'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-leaf ring-1 ring-white/15'>
                  <Icon className='size-5' aria-hidden='true' />
                </span>

                <div>
                  <h3 className='text-base font-medium text-white'>{item.title}</h3>

                  <p className='mt-1 text-sm leading-relaxed text-forest-foreground/70'>{item.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default PlatformSection
