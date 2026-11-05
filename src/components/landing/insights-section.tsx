import type { FC, ReactNode } from 'react'
import type { Testimonial } from '@/constants/landing'

import Image from 'next/image'
import { Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import SectionHeading from '@/components/landing/section-heading'
import CountUp from '@/components/generals/motion/count-up'
import { featuredTestimonial, stats, testimonials } from '@/constants/landing'

interface PersonProps {
  person: Testimonial
  tone?: 'light' | 'dark'
}

const Person: FC<PersonProps> = ({ person, tone = 'light' }): ReactNode => {
  const isDark = tone === 'dark'

  return (
    <figcaption className='flex items-center gap-3'>
      <span
        aria-hidden='true'
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          isDark ? 'bg-leaf text-forest' : 'bg-accent text-accent-foreground',
        )}
      >
        {person.initials}
      </span>

      <span>
        <span className={cn('block text-sm font-medium', isDark ? 'text-white' : 'text-foreground')}>
          {person.name}
        </span>

        <span className={cn('block text-sm', isDark ? 'text-forest-foreground/65' : 'text-muted-foreground')}>
          {person.role}, {person.company}
        </span>
      </span>
    </figcaption>
  )
}

const InsightsSection: FC = (): ReactNode => {
  return (
    <section id='insights' aria-labelledby='insights-title' className='scroll-mt-20 bg-white py-24 sm:py-32'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <SectionHeading
          id='insights-title'
          eyebrow='Insights'
          title='Operators see the difference in the first season.'
          description="Results from each customer's first twelve months on Gridora, measured against their own baseline from the year before."
        />

        <dl className='mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat) => (
            <div key={stat.label} className='reveal flex flex-col border-t border-border pt-6'>
              <dt className='mt-3 text-sm font-medium text-foreground'>{stat.label}</dt>

              <dd className='order-first font-heading text-5xl font-light tracking-[-0.04em] text-foreground sm:text-6xl'>
                <CountUp value={stat.value} />
              </dd>

              <dd className='mt-2 text-sm leading-relaxed text-muted-foreground'>{stat.detail}</dd>
            </div>
          ))}
        </dl>

        <div className='mt-16 grid gap-4 lg:grid-cols-[1.35fr_1fr]'>
          <figure className='reveal relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-forest p-8 sm:p-10'>
            <Image
              src='/images/forest-fog.jpg'
              alt=''
              fill
              sizes='(min-width: 1024px) 60vw, 100vw'
              className='-z-20 object-cover opacity-40'
            />

            <div
              aria-hidden='true'
              className='absolute inset-0 -z-10 bg-gradient-to-br from-forest via-forest/85 to-primary/40'
            />

            <Quote className='size-8 text-leaf' aria-hidden='true' />

            <blockquote className='mt-8 font-heading text-2xl font-light leading-snug tracking-[-0.02em] text-white sm:text-3xl'>
              <p>{featuredTestimonial.quote}</p>
            </blockquote>

            <div className='mt-10'>
              <Person person={featuredTestimonial} tone='dark' />
            </div>
          </figure>

          <div className='grid gap-4'>
            {testimonials.map((item) => (
              <figure key={item.name} className='reveal flex flex-col justify-between rounded-[2rem] bg-background p-8'>
                <blockquote className='text-lg leading-relaxed text-foreground'>
                  <p>{item.quote}</p>
                </blockquote>

                <div className='mt-8'>
                  <Person person={item} />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default InsightsSection
