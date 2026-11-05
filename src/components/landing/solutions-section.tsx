import type { FC, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import Image from 'next/image'
import { useRef } from 'react'
import { ArrowRight, BatteryCharging, ChartLine, Gauge, ShieldCheck, Wind } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import SectionHeading from '@/components/landing/section-heading'
import PhoneForecast from '@/components/landing/solutions/phone-forecast'
import BalanceVisual from '@/components/landing/solutions/balance-visual'
import TradeVisual from '@/components/landing/solutions/trade-visual'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { solutionsUnderneath } from '@/constants/landing'

interface Stage {
  index: number
  label: string
  icon: LucideIcon
  title: string
  text: string
  handoffLabel: string
  handoffText: string
  visual: ReactNode
  tone: 'dark' | 'light'
}

const stages: Stage[] = [
  {
    index: 1,
    label: 'Forecast',
    icon: ChartLine,
    title: 'See demand and generation coming, a week ahead.',
    text: 'Weather-aware forecasts at 15-minute resolution for every asset you run. Gridora learns each site, from icing turbines to hazy afternoons, and shows you how sure it is.',
    handoffLabel: 'Next, Balance.',
    handoffText: 'The surplus it predicts becomes the battery plan.',
    visual: <PhoneForecast />,
    tone: 'dark',
  },
  {
    index: 2,
    label: 'Balance',
    icon: BatteryCharging,
    title: 'Charge on the surplus. Discharge into the peak.',
    text: 'Dispatch plans that respect cycle limits, warranty terms and grid constraints, ready for one-click approval or autopilot.',
    handoffLabel: 'Next, Trade.',
    handoffText: 'Stored energy is offered into the hours that pay.',
    visual: <BalanceVisual />,
    tone: 'light',
  },
  {
    index: 3,
    label: 'Trade',
    icon: Gauge,
    title: 'Sell every megawatt in the hours that pay.',
    text: 'Gridora ranks every window by price, risk and grid limits, then drafts the bid. Today that is an expected €41,200 more than flat selling.',
    handoffLabel: 'Back to Forecast.',
    handoffText: "Every settled bid sharpens tomorrow's forecast.",
    visual: <TradeVisual />,
    tone: 'light',
  },
]

const SolutionsSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // The panels slide sideways while the section is pinned, so the reader follows
  // the flow instead of scrolling past three unrelated cards.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const shift = useTransform(scrollYProgress, [0, 1], ['0%', '-62%'])

  return (
    <section
      id='solutions'
      aria-labelledby='solutions-title'
      ref={sectionRef}
      className='relative scroll-mt-20 bg-background py-24 sm:py-32 lg:h-[calc(100svh+260svh)] lg:py-0'
    >
      <div className='lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:overflow-hidden lg:pb-10 lg:pt-20'>
        <div className='mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between'>
            <SectionHeading
              id='solutions-title'
              eyebrow='Solutions'
              title='Forecast. Balance. Trade.'
              accent='Three jobs, one platform.'
            />

            <div aria-hidden='true' className='relative hidden w-full max-w-md shrink-0 pb-1 lg:block'>
              <div className='absolute inset-x-[7px] top-[7px] h-px bg-foreground/10' />

              <div className='relative flex justify-between'>
                {stages.map((stage, index) => (
                  <div
                    key={stage.label}
                    className={cn(
                      'flex flex-col gap-1.5',
                      index === 0 ? 'items-start text-left' : index === 1 ? 'items-center text-center' : 'items-end text-right',
                    )}
                  >
                    <span className='relative size-3.5 rounded-full bg-background ring-1 ring-foreground/20'>
                      <span className='absolute inset-0 rounded-full bg-primary shadow-[0_0_0_5px_rgba(30,133,56,0.16)]' />
                    </span>

                    <span className='mt-2 text-sm font-medium text-foreground'>{stage.label}</span>

                    <span className='text-xs text-muted-foreground'>
                      {index === 0 ? 'Predicts the surplus' : index === 1 ? 'Stores it' : 'Sells it at the peak'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className='mt-12 lg:mt-10 lg:min-h-0 lg:flex-1 lg:overflow-clip'>
          <motion.div
            ref={trackRef}
            style={still ? undefined : { x: shift }}
            className='relative mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:mx-0 lg:h-full lg:w-max lg:max-w-none lg:flex-row lg:gap-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]'
          >
            <div className='max-w-xl pb-4 lg:flex lg:w-[21rem] lg:max-w-none lg:shrink-0 lg:flex-col lg:justify-between lg:py-2'>
              <p className='text-base leading-relaxed text-muted-foreground lg:text-lg'>
                Gridora replaces the patchwork of weather feeds, spreadsheets and late phone calls with one system that
                plans the energy day for you. Each stage hands its answer to the next.
              </p>

              <p
                aria-hidden='true'
                className='mt-8 hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-foreground/60 lg:flex'
              >
                Scroll to follow the flow
                <span className='relative h-px w-14 overflow-hidden bg-foreground/15'>
                  <span className='flow-cue-line absolute inset-y-0 left-0 w-1/2 bg-primary' />
                </span>
              </p>
            </div>

            {stages.map((stage) => {
              const Icon = stage.icon
              const dark = stage.tone === 'dark'

              return (
                <article
                  key={stage.label}
                  className={cn(
                    'relative isolate overflow-hidden rounded-[2rem] lg:h-full lg:w-[min(72vw,56rem)] lg:shrink-0',
                    dark ? 'bg-forest text-white' : 'bg-white text-foreground ring-1 ring-inset ring-black/5',
                  )}
                >
                  {dark && (
                    <>
                      <div className='absolute inset-y-0 -left-[12%] -right-[12%] -z-20'>
                        <Image
                          src='/images/hero-turbine.jpg'
                          alt=''
                          fill
                          sizes='(min-width: 1024px) 80vw, 100vw'
                          className='object-cover object-[50%_75%]'
                        />
                      </div>

                      <div
                        aria-hidden='true'
                        className='absolute inset-0 -z-10 bg-gradient-to-b from-forest via-forest/75 to-forest/20 lg:bg-gradient-to-r lg:from-forest lg:via-forest/80 lg:to-forest/10'
                      />
                    </>
                  )}

                  <div className='flex flex-col gap-8 p-6 sm:p-8 lg:h-full lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:p-10'>
                    <div className='flex flex-col'>
                      <div className='flex items-center justify-between gap-4'>
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium',
                            dark ? 'bg-white/10 text-white ring-1 ring-white/15' : 'bg-background text-foreground/75 ring-1 ring-black/5',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-6 items-center justify-center rounded-full',
                              dark ? 'bg-leaf text-forest' : 'bg-accent text-accent-foreground',
                            )}
                          >
                            <Icon className='size-3.5' aria-hidden='true' />
                          </span>
                          {stage.label}
                        </span>

                        <span
                          className={cn('font-mono text-xs', dark ? 'text-white/50' : 'text-muted-foreground')}
                        >
                          0{stage.index} / 03
                        </span>
                      </div>

                      <h3
                        className={cn(
                          'mt-6 max-w-md font-heading text-3xl font-light leading-tight tracking-[-0.03em] sm:text-4xl lg:text-3xl xl:text-4xl',
                          dark ? 'text-white' : 'text-foreground',
                        )}
                      >
                        {stage.title}
                      </h3>

                      <p
                        className={cn(
                          'mt-4 max-w-md text-[15px] leading-relaxed',
                          dark ? 'text-forest-foreground/75' : 'text-muted-foreground',
                        )}
                      >
                        {stage.text}
                      </p>

                      <p
                        className={cn(
                          'mt-auto flex items-center gap-3 pt-8 text-sm leading-snug',
                          dark ? 'text-forest-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full ring-1',
                            dark ? 'bg-white/10 text-leaf ring-white/15' : 'bg-accent text-accent-foreground ring-black/5',
                          )}
                        >
                          <ArrowRight className='size-4' aria-hidden='true' />
                        </span>

                        <span>
                          <span className={cn('font-medium', dark ? 'text-white' : 'text-foreground')}>
                            {stage.handoffLabel}
                          </span>{' '}
                          {stage.handoffText}
                        </span>
                      </p>
                    </div>

                    <div className='-mb-28 flex justify-center sm:-mb-24 lg:mb-0 lg:items-start'>{stage.visual}</div>
                  </div>
                </article>
              )
            })}
          </motion.div>
        </div>

        <div className='mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:mt-10 lg:px-8'>
          <div className='flex flex-col gap-8'>
            <p className='inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>
              <Wind className='size-3.5 text-primary' aria-hidden='true' />
              Running underneath
            </p>

            <ul className='grid gap-8 sm:grid-cols-3'>
              {solutionsUnderneath.map((item) => {
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
      </div>
    </section>
  )
}

export default SolutionsSection
