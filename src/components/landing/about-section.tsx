import type { FC, ReactNode } from 'react'

import Image from 'next/image'
import CountUp from '@/components/generals/motion/count-up'
import SectionHeading from '@/components/landing/section-heading'
import { aboutFacts, principles } from '@/constants/landing'

const AboutSection: FC = (): ReactNode => {
  return (
    <section id='about' aria-labelledby='about-title' className='scroll-mt-20 bg-background pb-24 sm:pb-32'>
      <div className='mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8'>
        <div className='relative'>
          <div className='relative aspect-[4/5] overflow-hidden rounded-[2rem] sm:aspect-[5/4] lg:aspect-[4/5]'>
            <Image
              src='/images/about-wind-farm.jpg'
              alt='A wind turbine standing in a snowy landscape under a clear blue sky'
              fill
              sizes='(min-width: 1024px) 50vw, 100vw'
              className='object-cover object-bottom'
            />
          </div>

          <div className='reveal absolute bottom-5 left-5 right-5 rounded-2xl bg-white/85 p-5 ring-1 ring-black/5 backdrop-blur-xl sm:left-auto sm:w-72'>
            <p className='text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>Our mission</p>

            <p className='mt-2 text-[15px] leading-relaxed text-foreground'>
              Make renewable power as dependable as the grid needs it to be.
            </p>
          </div>
        </div>

        <div>
          <SectionHeading
            id='about-title'
            eyebrow='About Gridora'
            title='Built by grid engineers who got tired of guessing.'
            description='Gridora started in a control room, where forecasts lived in spreadsheets and the evening peak always arrived early. Today our team pairs power systems engineering with machine learning, so operators can plan the day instead of chasing it.'
          />

          <dl className='reveal mt-10 grid grid-cols-3 gap-4 border-y border-border py-6'>
            {aboutFacts.map((fact) => (
              <div key={fact.label} className='flex flex-col'>
                <dt className='mt-1 text-xs text-muted-foreground sm:text-sm'>{fact.label}</dt>

                <dd className='order-first font-heading text-2xl font-light tracking-tight text-foreground sm:text-4xl'>
                  <CountUp value={fact.value} />
                </dd>
              </div>
            ))}
          </dl>

          <ul className='mt-8 space-y-5'>
            {principles.map((item) => {
              const Icon = item.icon

              return (
                <li key={item.title} className='reveal flex gap-4'>
                  <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-black/5'>
                    <Icon className='size-5' aria-hidden='true' />
                  </span>

                  <div>
                    <h3 className='text-base font-medium text-foreground'>{item.title}</h3>

                    <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>{item.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default AboutSection
