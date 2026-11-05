import type { FC, ReactNode } from 'react'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Logo } from '@/components/generals/logo'
import { buttonClasses } from '@/components/generals/button'
import { cn } from '@/lib/utils'
import { navLinks, primaryCta } from '@/constants/site'
import { HERO_SCENE_EVENT, readHeroScene } from '@/lib/hero-scene'

const NAV_LINK_CLASS =
  'relative rounded-full px-3 py-2 text-[15px] transition-colors duration-500 after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-right after:scale-x-0 after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const SiteHeader: FC = (): ReactNode => {
  const [open, setOpen] = useState(false)
  const [night, setNight] = useState(false)

  // The hero announces its time of day on the document element, so the header can
  // adopt the light-on-dark palette without the two components sharing state.
  useEffect(() => {
    const sync = (): void => setNight(readHeroScene() === 'night')

    sync()
    window.addEventListener(HERO_SCENE_EVENT, sync)

    return () => window.removeEventListener(HERO_SCENE_EVENT, sync)
  }, [])

  useEffect(() => {
    const nav = document.querySelector('nav[aria-label="Main"]')

    if (!nav) return

    nav.classList.toggle('bg-white/85', night)
    nav.classList.toggle('shadow-[0_18px_40px_-30px_rgba(14,26,18,0.55)]', night)
    nav.classList.toggle('ring-1', night)
    nav.classList.toggle('ring-black/5', night)
  }, [night])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 sm:pt-4',
        open ? 'translate-y-0' : 'translate-y-0',
      )}
    >
      <div className='mx-auto max-w-7xl'>
        <nav
          aria-label='Main'
          className={cn(
            'flex items-center justify-between gap-4 rounded-2xl py-2 pl-4 pr-2 backdrop-blur-xl transition-all duration-300 sm:pl-5',
            night ? 'bg-white/85 shadow-[0_18px_40px_-30px_rgba(14,26,18,0.55)] ring-1 ring-black/5' : 'bg-transparent shadow-none ring-0',
          )}
        >
          <Link
            href='/'
            aria-label='Gridora home'
            className='rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Logo />
          </Link>

          <span
            aria-hidden='true'
            className={cn(
              'hidden h-px flex-1 transition-colors duration-500 lg:block',
              night ? 'bg-forest/15' : 'bg-primary-strong/15',
            )}
          />

          <ul className='hidden items-center gap-2 md:flex lg:gap-6'>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    NAV_LINK_CLASS,
                    night ? 'text-forest after:bg-forest' : 'text-primary-strong after:bg-primary-strong',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <span
            aria-hidden='true'
            className={cn(
              'hidden h-px flex-1 transition-colors duration-500 lg:block',
              night ? 'bg-forest/15' : 'bg-primary-strong/15',
            )}
          />

          <div className='flex items-center gap-2'>
            <Link
              href={primaryCta.href}
              className={buttonClasses({
                size: 'sm',
                className: cn(
                  'hidden h-10 px-5 transition-colors duration-500 sm:inline-flex',
                  night ? 'bg-primary text-primary-foreground hover:bg-primary-strong' : 'bg-primary-strong hover:bg-forest',
                ),
              })}
            >
              {primaryCta.label}
            </Link>

            <button
              type='button'
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls='mobile-menu'
              aria-label={open ? 'Close menu' : 'Open menu'}
              className='inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden'
            >
              {open ? <X className='size-5' /> : <Menu className='size-5' />}
            </button>
          </div>
        </nav>

        <div
          id='mobile-menu'
          hidden={!open}
          className='mt-2 rounded-2xl bg-white p-2 shadow-[0_24px_48px_-24px_rgba(14,26,18,0.45)] ring-1 ring-black/5 md:hidden'
        >
          <ul className='flex flex-col'>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className='flex h-12 items-center justify-between rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  {link.label}
                  <ArrowRight className='size-4 text-muted-foreground' aria-hidden='true' />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href={primaryCta.href}
            onClick={() => setOpen(false)}
            className={buttonClasses({ size: 'lg', className: 'mt-2 w-full' })}
          >
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
