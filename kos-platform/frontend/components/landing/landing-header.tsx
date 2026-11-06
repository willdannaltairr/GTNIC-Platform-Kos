'use client'

import type { FC, ReactNode } from 'react'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Logo } from '@/components/landing/logo'
import { cn } from '@/lib/utils'
import { LANDING_NAV, LANDING_CTA } from '@/lib/landing'

const NAV_LINK_CLASS =
  'relative rounded-full px-3 py-2 text-[15px] text-forest transition-colors duration-300 after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-right after:scale-x-0 after:bg-forest after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * Header landing.
 *
 * Di atas hero header tampil tanpa latar agar foto terlihat penuh; setelah
 * halaman digulir ia berubah menjadi pil putih dengan bayangan, sehingga tetap
 * terbaca di atas bagian apa pun. Nilai `night` membuat header mengikuti skema
 * gelap saat hero sedang menampilkan suasana malam.
 */
export const LandingHeader: FC = (): ReactNode => {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 24)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || open

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Navigasi utama"
          className={cn(
            'flex items-center justify-between gap-4 rounded-2xl py-2 pl-4 pr-2 backdrop-blur-xl transition-all duration-300 sm:pl-5',
            solid
              ? 'bg-white/85 shadow-[0_18px_40px_-30px_rgba(14,26,18,0.55)] ring-1 ring-black/5'
              : 'bg-white/35 ring-1 ring-white/40',
          )}
        >
          <Link
            href="/"
            aria-label="Gridora — beranda"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>

          <span aria-hidden="true" className="hidden h-px flex-1 bg-forest/15 lg:block" />

          <ul className="hidden items-center gap-2 md:flex lg:gap-5">
            {LANDING_NAV.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={NAV_LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <span aria-hidden="true" className="hidden h-px flex-1 bg-forest/15 lg:block" />

          <div className="flex items-center gap-2">
            <Link
              href="/masuk"
              className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-forest transition-colors hover:bg-forest/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              Masuk
            </Link>

            <Link
              href={LANDING_CTA.href}
              className="hidden h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              {LANDING_CTA.label}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="landing-mobile-menu"
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              className="inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <div
          id="landing-mobile-menu"
          hidden={!open}
          className="mt-2 rounded-2xl bg-white p-2 shadow-[0_24px_48px_-24px_rgba(14,26,18,0.45)] ring-1 ring-black/5 md:hidden"
        >
          <ul className="flex flex-col">
            {LANDING_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center justify-between rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-2 grid gap-2">
            <Link
              href="/masuk"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground"
            >
              Masuk
            </Link>

            <Link
              href={LANDING_CTA.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              {LANDING_CTA.label}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
