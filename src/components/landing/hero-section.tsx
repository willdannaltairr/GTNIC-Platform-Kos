import type { FC, ReactNode } from 'react'

import Image from 'next/image'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

type HeroScene = 'morning' | 'night'

interface SceneCopy {
  label: string
  caption: string
  description: string
  house: string
}

const SCENES: Record<HeroScene, SceneCopy> = {
  morning: {
    label: 'Morning',
    caption: 'Panels charge the battery',
    description:
      "Gridora forecasts every sunrise across your portfolio and stores the surplus instead of selling it at the day's cheapest hour.",
    house: '/images/hero-house-morning.jpg',
  },
  night: {
    label: 'Night',
    caption: 'Battery covers the peak',
    description:
      'When the sun sets and prices climb, Gridora releases what you stored, so the evening peak runs on your own clean power.',
    house: '/images/hero-house-night.jpg',
  },
}

// Fixed star field: a fixed list keeps server and client markup identical, where
// random positions would not survive hydration.
const STARS = [
  { left: 7, top: 3, size: 3, delay: 0 },
  { left: 44.3, top: 20.9, size: 1.5, delay: 0.61 },
  { left: 81.6, top: 38.8, size: 1.5, delay: 1.22 },
  { left: 18.9, top: 12.7, size: 2, delay: 1.83 },
  { left: 56.2, top: 30.6, size: 3, delay: 2.44 },
  { left: 93.5, top: 4.5, size: 1.5, delay: 3.05 },
  { left: 30.8, top: 22.4, size: 2, delay: 0.06 },
  { left: 68.1, top: 40.3, size: 1.5, delay: 0.67 },
  { left: 5.4, top: 14.2, size: 3, delay: 1.28 },
  { left: 42.7, top: 32.1, size: 2, delay: 1.89 },
  { left: 80, top: 6, size: 1.5, delay: 2.5 },
  { left: 17.3, top: 23.9, size: 1.5, delay: 3.11 },
  { left: 54.6, top: 41.8, size: 3, delay: 0.12 },
  { left: 91.9, top: 15.7, size: 1.5, delay: 0.73 },
  { left: 29.2, top: 33.6, size: 1.5, delay: 1.34 },
  { left: 66.5, top: 7.5, size: 2, delay: 1.95 },
  { left: 3.8, top: 25.4, size: 3, delay: 2.56 },
  { left: 41.1, top: 43.3, size: 1.5, delay: 3.17 },
  { left: 78.4, top: 17.2, size: 2, delay: 0.18 },
  { left: 15.7, top: 35.1, size: 1.5, delay: 0.79 },
  { left: 53, top: 9, size: 3, delay: 1.4 },
  { left: 90.3, top: 26.9, size: 2, delay: 2.01 },
  { left: 27.6, top: 0.8, size: 1.5, delay: 2.62 },
  { left: 64.9, top: 18.7, size: 1.5, delay: 3.23 },
]

const HeroSection: FC = (): ReactNode => {
  const [scene, setScene] = useState<HeroScene>('morning')
  const still = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const lineOpacity = useTransform(scrollYProgress, [0, 0.55], [0, 1])
  const lineBlur = useTransform(scrollYProgress, [0, 0.55], ['blur(0px)', 'blur(10px)'])
  const lineScale = useTransform(scrollYProgress, [0, 0.55], [1, 0.92])

  // Scroll back to the top whenever the reader switches time of day, so the
  // scene they picked is the one filling the screen.
  useEffect(() => {
    if (scene === 'night') document.documentElement.dataset.heroScene = 'night'
    else delete document.documentElement.dataset.heroScene
  }, [scene])

  const night = scene === 'night'

  return (
    <section id='hero' ref={sectionRef} aria-labelledby='hero-title' className='relative h-[175svh] bg-background'>
      <div className='sticky top-0 h-[100svh] overflow-hidden'>
        <div aria-hidden='true' className='absolute inset-0 overflow-hidden'>
          <div className='absolute inset-0'>
            <div className={cn('absolute inset-0 transition-colors duration-[1400ms]', night ? 'bg-[#0d1219]' : 'bg-[#dcdccb]')} />

            {/* Blurred backdrop: the same house photos, softened and scaled up. */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms] ease-in-out',
                night ? 'opacity-0' : 'opacity-100',
              )}
            >
              <Image
                src='/images/hero-house-morning.jpg'
                alt=''
                fill
                priority
                sizes='50vw'
                className='scale-125 object-cover object-top blur-2xl'
              />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms] ease-in-out',
                night ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Image
                src='/images/hero-house-night.jpg'
                alt=''
                fill
                sizes='50vw'
                className='scale-125 object-cover object-top blur-2xl'
              />
            </div>

            {/* Warm sun by day, cool moon and stars by night. */}
            <div
              className={cn(
                'absolute -right-[12%] -top-[24%] size-[70vmax] rounded-full transition-opacity duration-[1400ms]',
                night ? 'opacity-0' : 'opacity-100',
              )}
              style={{
                background:
                  'radial-gradient(closest-side, rgba(255,221,180,0.55), rgba(255,221,180,0) 70%)',
              }}
            />

            <div
              className={cn(
                'absolute inset-0 transition-opacity-[1600ms]',
                night ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div
                className='absolute right-[6%] top-[4%] size-[34vmax] rounded-full'
                style={{
                  background:
                    'radial-gradient(closest-side, rgba(186,204,232,0.22), rgba(186,204,232,0) 70%)',
                }}
              />

              <div className='absolute right-[17%] top-[17%] size-8 rounded-full bg-[#eef1f6] opacity-85 shadow-[0_0_48px_14px_rgba(206,218,240,0.28)] sm:size-11' />

              {!still &&
                STARS.map((star, index) => (
                  <span
                    key={index}
                    className='hero-star absolute rounded-full bg-white'
                    style={{
                      left: `${star.left}%`,
                      top: `${star.top}%`,
                      width: `${star.size}px`,
                      height: `${star.size}px`,
                      animationDelay: `${star.delay}s`,
                    }}
                  />
                ))}
            </div>

            <div className='hero-fog-slow absolute -inset-x-[15%] top-[22%] h-[34%]'>
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  night ? 'opacity-0' : 'opacity-100',
                )}
                style={{
                  background:
                    'radial-gradient(50% 50% at 30% 50%, rgba(244,241,230,0.65), transparent), radial-gradient(45% 45% at 75% 55%, rgba(244,241,230,0.5), transparent)',
                }}
              />
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  night ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  background:
                    'radial-gradient(50% 50% at 30% 50%, rgba(70,84,98,0.45), transparent), radial-gradient(45% 45% at 75% 55%, rgba(70,84,98,0.35), transparent)',
                }}
              />
            </div>

            {(Object.keys(SCENES) as HeroScene[]).map((key) => (
              <div
                key={key}
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms] will-change-[opacity]',
                  key === scene ? 'opacity-100' : 'opacity-0',
                )}
              >
                <div className='hero-house-mask absolute bottom-[16%] left-1/2 aspect-video w-[150%] -translate-x-1/2 sm:bottom-[12%] sm:w-[125%] md:w-[110%] lg:inset-0 lg:aspect-auto lg:w-full lg:translate-x-0'>
                  <Image
                    src={SCENES[key].house}
                    alt=''
                    fill
                    priority={key === 'morning'}
                    sizes='(min-width: 1024px) 100vw, 150vw'
                    className='object-cover object-[50%_78%]'
                  />
                </div>
              </div>
            ))}

            <div className='hero-fog absolute -inset-x-[15%] bottom-[2%] h-[36%]'>
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  night ? 'opacity-0' : 'opacity-100',
                )}
                style={{
                  background:
                    'radial-gradient(45% 55% at 25% 60%, rgba(238,236,224,0.8), transparent), radial-gradient(40% 50% at 70% 70%, rgba(238,236,224,0.7), transparent)',
                }}
              />
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  night ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  background:
                    'radial-gradient(45% 55% at 25% 60%, rgba(52,64,76,0.6), transparent), radial-gradient(40% 50% at 70% 70%, rgba(52,64,76,0.5), transparent)',
                }}
              />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms]',
                night ? 'opacity-0' : 'opacity-100',
              )}
            >
              <div className='absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#e9e7db]/80 via-[#e9e7db]/30 to-transparent' />
              <div className='absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-[#e4e2d4] via-[#e4e2d4]/55 to-transparent' />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms]',
                night ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className='absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#121920]/75 via-[#121920]/25 to-transparent' />
              <div className='absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-[#151c23] via-[#151c23]/60 to-transparent' />
            </div>
          </div>

          <div
            className={cn('absolute inset-0 bg-forest/40 transition-opacity duration-[1400ms]', night ? 'opacity-100' : 'opacity-0')}
          />
        </div>

        <div className='relative mx-auto flex h-full max-w-7xl flex-col items-center justify-between px-4 pb-8 pt-28 text-center sm:px-6 sm:pb-10 sm:pt-32 lg:px-8'>
          <h1
            id='hero-title'
            className='font-heading text-[2.9rem] font-normal leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-[5.25rem]'
          >
            <span
              className={cn(
                'block transition-colors duration-1000',
                night ? 'text-white' : 'text-primary-strong',
              )}
            >
              Sun by day.
            </span>
            <span
              className={cn('block transition-colors duration-1000', night ? 'text-leaf' : 'text-primary-strong/60')}
            >
              Storage by night.
            </span>
          </h1>

          <div className='w-full max-w-md'>
            <div className='flex flex-col items-center gap-5'>
              <div
                role='group'
                aria-label='Time of day'
                className={cn(
                  'grid w-full grid-cols-2 gap-1 rounded-2xl p-1.5 ring-1 backdrop-blur-xl transition-colors duration-700',
                  night ? 'bg-forest-foreground/10 ring-white/20' : 'bg-white/35 ring-white/60',
                )}
              >
                {(Object.keys(SCENES) as HeroScene[]).map((key) => {
                  const active = key === scene
                  const Icon = key === 'morning' ? Sun : Moon

                  return (
                    <button
                      key={key}
                      type='button'
                      onClick={() => setScene(key)}
                      aria-pressed={active}
                      className='relative min-h-16 rounded-xl px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      {active && (
                        <span
                          aria-hidden='true'
                          className={cn(
                            'absolute inset-0 rounded-xl shadow-[0_14px_30px_-18px_rgba(14,26,18,0.55)]',
                            night ? 'bg-forest' : 'bg-white/85',
                          )}
                        />
                      )}

                      <span
                        className={cn(
                          'relative flex items-center justify-center gap-2 text-base font-medium transition-colors duration-500',
                          night
                            ? active
                              ? 'text-white'
                              : 'text-forest-foreground/65'
                            : active
                              ? 'text-forest'
                              : 'text-forest/65',
                        )}
                      >
                        <Icon className='size-4' aria-hidden='true' />
                        {SCENES[key].label}
                      </span>

                      <span
                        className={cn(
                          'relative mt-0.5 block text-xs transition-colors duration-500',
                          night ? (active ? 'text-forest-foreground/70' : 'text-forest-foreground/50') : 'text-forest/60',
                        )}
                      >
                        {SCENES[key].caption}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div aria-live='polite' className='min-h-[3.25rem]'>
                <p
                  className={cn(
                    'text-sm leading-relaxed transition-colors duration-700 sm:text-[15px]',
                    night ? 'text-forest-foreground/75' : 'text-forest/75',
                  )}
                >
                  {SCENES[scene].description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!still && (
          <motion.p
            aria-hidden='true'
            style={{ opacity: lineOpacity, filter: lineBlur, scale: lineScale }}
            className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center font-heading text-4xl font-light tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl'
          >
            Every megawatt, accounted for.
          </motion.p>
        )}
      </div>
    </section>
  )
}

export default HeroSection

