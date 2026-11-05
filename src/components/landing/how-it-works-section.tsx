import type { FC, ReactNode } from 'react'
import type { MotionValue } from 'motion/react'

import { useRef } from 'react'
import { Cable, Check } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import SpotlightCard from '@/components/generals/motion/spotlight-card'
import SectionHeading from '@/components/landing/section-heading'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { integrations, stepEpilogue, steps } from '@/constants/landing'
import type { Step } from '@/constants/landing'

interface TimelineStepProps {
  step: Step
  index: number
  still: boolean
}

interface FinishProps {
  fill: MotionValue<number>
  dotTop: MotionValue<string>
  still: boolean
}

// One step on the timeline: its node lights as the line reaches it, and the card
// swings up from a tilt into place rather than simply fading in.
const TimelineStep: FC<TimelineStepProps> = ({ step, index, still }): ReactNode => {
  const ref = useRef<HTMLLIElement>(null)
  const fromLeft = index % 2 === 0

  const { scrollYProgress: arrive } = useScroll({ target: ref, offset: ['start end', 'start 0.55'] })
  const { scrollYProgress: reach } = useScroll({ target: ref, offset: ['start 0.64', 'start 0.54'] })

  const rotateX = useTransform(arrive, [0, 1], [28, 0])
  const rotate = useTransform(arrive, [0, 1], [fromLeft ? -2.5 : 2.5, 0])
  const y = useTransform(arrive, [0, 1], [72, 0])
  const scale = useTransform(arrive, [0, 1], [0.92, 1])
  const opacity = useTransform(arrive, [0, 0.6], [0.3, 1])
  const whenX = useTransform(arrive, [0, 1], [fromLeft ? 56 : -56, 0])
  const lit = useTransform(reach, [0, 1], [0, 1])

  return (
    <li
      ref={ref}
      className='relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 [perspective:1200px] md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] md:gap-x-12'
    >
      <div className='relative z-10 col-start-1 row-start-1 md:col-start-2'>
        <span className='relative flex size-12 items-center justify-center rounded-full bg-white font-heading text-sm font-medium text-muted-foreground ring-1 ring-black/10'>
          {step.number}

          <motion.span
            aria-hidden='true'
            style={still ? undefined : { opacity: lit, scale: lit }}
            className='absolute inset-0 flex items-center justify-center rounded-full bg-primary text-white shadow-[0_0_0_8px_rgba(30,133,56,0.12)]'
          >
            {step.number}
          </motion.span>
        </span>
      </div>

      <motion.div
        style={still ? undefined : { rotateX, rotate, y, scale, opacity, transformOrigin: 'center top' }}
        className={cn('col-start-2 row-start-1', fromLeft ? 'md:col-start-1' : 'md:col-start-3')}
      >
        <SpotlightCard className='rounded-[1.75rem] bg-white p-7 ring-1 ring-black/5'>
          <p className='text-xs font-medium uppercase tracking-[0.14em] text-primary md:hidden'>{step.when}</p>

          <h3 className='mt-2 text-lg font-medium text-foreground md:mt-0'>{step.title}</h3>

          <p className='mt-2 text-[15px] leading-relaxed text-muted-foreground'>{step.text}</p>
        </SpotlightCard>
      </motion.div>

      <motion.p
        aria-hidden='true'
        style={still ? undefined : { x: whenX }}
        className={cn(
          'row-start-1 hidden pt-1 font-heading text-5xl font-light tracking-[-0.04em] text-foreground/15 md:block lg:text-6xl',
          fromLeft ? 'md:col-start-3 md:text-left' : 'md:col-start-1 md:text-right',
        )}
      >
        {step.when}
      </motion.p>
    </li>
  )
}

// The vertical line itself: it fills with colour as the timeline scrolls past,
// so the reader can see how far down the process they are.
const TimelineRail: FC<FinishProps> = ({ fill, dotTop, still }): ReactNode => {
  return (
    <div aria-hidden='true' className='absolute bottom-6 left-6 top-6 w-px -translate-x-1/2 bg-foreground/10 md:left-1/2'>
      <motion.div
        style={still ? { scaleY: 1 } : { scaleY: fill }}
        className='absolute inset-0 origin-top bg-gradient-to-b from-leaf via-primary to-primary-strong'
      />

      {!still && (
        <motion.span
          style={{ top: dotTop }}
          className='absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf shadow-[0_0_14px_3px_rgba(87,199,106,0.7)]'
        />
      )}
    </div>
  )
}

const HowItWorksSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.6'] })
  const dotTop = useTransform(scrollYProgress, (value) => `${Math.min(100, Math.max(0, value * 100))}%`)

  return (
    <section
      id='how-it-works'
      aria-labelledby='how-it-works-title'
      className='scroll-mt-20 bg-background py-24 sm:py-32'
    >
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <SectionHeading
          id='how-it-works-title'
          eyebrow='How it works'
          align='center'
          title='Live in three weeks, not three quarters.'
          description='Gridora works with the systems you already run. Our grid engineers handle the setup alongside your team.'
        />

        <div ref={ref} className='relative mx-auto mt-16 max-w-5xl sm:mt-20'>
          <TimelineRail fill={scrollYProgress} dotTop={dotTop} still={still} />

          <ol className='relative space-y-14 md:space-y-20'>
            {steps.map((step, index) => (
              <TimelineStep key={step.number} step={step} index={index} still={still} />
            ))}

            <li className='relative grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-5 md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] md:gap-x-12'>
              <div className='relative z-10 col-start-1 row-start-1 md:col-start-2'>
                <span className='relative flex size-12 items-center justify-center rounded-full bg-white text-muted-foreground ring-1 ring-black/10'>
                  <Check className='size-5' aria-hidden='true' />

                  <span
                    aria-hidden='true'
                    className='absolute inset-0 flex items-center justify-center rounded-full bg-forest text-leaf shadow-[0_0_0_8px_rgba(87,199,106,0.18)]'
                  >
                    <Check className='size-5' />
                  </span>
                </span>
              </div>

              <p className='col-start-2 row-start-1 text-base text-muted-foreground md:col-start-3'>
                <span className='font-medium text-foreground'>Live by day 21.</span> {stepEpilogue.replace('Live by day 21. ', '')}
              </p>
            </li>
          </ol>
        </div>

        <div className='reveal mt-20 rounded-[1.75rem] bg-white p-6 ring-1 ring-black/5 sm:p-8'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-start gap-4'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground'>
                <Cable className='size-5' aria-hidden='true' />
              </span>

              <div>
                <h3 className='text-base font-medium text-foreground'>Connects to what you already run</h3>

                <p className='mt-1 text-sm text-muted-foreground'>
                  Standard industrial protocols, market data and weather feeds, read only by default.
                </p>
              </div>
            </div>

            <ul className='flex flex-wrap gap-2 lg:max-w-xl lg:justify-end'>
              {integrations.map((item) => (
                <li
                  key={item}
                  className='rounded-full bg-background px-3.5 py-1.5 text-sm text-foreground ring-1 ring-black/5'
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
