import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Logo } from '@/components/generals/logo'
import { buttonClasses } from '@/components/generals/button'
import { footerColumns, primaryCta, siteConfig } from '@/constants/site'

const WORDMARK = siteConfig.name.split('')

const SiteFooter: FC = (): ReactNode => {
  return (
    <footer className='relative overflow-hidden bg-forest text-forest-foreground'>
      <div className='mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6 lg:px-8'>
        <div className='grid gap-12 lg:grid-cols-[1.3fr_2fr]'>
          <div className='max-w-sm'>
            <Link
              href='/'
              aria-label={`${siteConfig.name} home`}
              className='inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf'
            >
              <Logo tone='light' />
            </Link>

            <p className='mt-5 text-[15px] leading-relaxed text-forest-foreground/70'>
              {siteConfig.tagline} Forecast the peak, store the surplus and bid at the right moment, from one calm
              workspace.
            </p>

            <Link href={primaryCta.href} className={buttonClasses({ variant: 'onDark', className: 'mt-7' })}>
              {primaryCta.label}
              <ArrowUpRight className='size-4' aria-hidden='true' />
            </Link>
          </div>

          <div className='grid grid-cols-2 gap-10 sm:grid-cols-3'>
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className='text-sm font-semibold text-white'>{column.title}</h2>

                <ul className='mt-4 space-y-3'>
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className='rounded text-sm text-forest-foreground/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf'
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className='mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-forest-foreground/55 sm:flex-row sm:items-center sm:justify-between'>
          <p>
            &copy; {siteConfig.year} {siteConfig.name}. All rights reserved.
          </p>

          <p>Built for a steadier, cleaner grid.</p>
        </div>
      </div>

      {/* The wordmark rises letter by letter as the footer comes into view. */}
      <div
        aria-hidden='true'
        className='pointer-events-none flex select-none justify-center overflow-hidden px-2 font-heading text-[23vw] font-semibold leading-[0.78] tracking-[-0.06em]'
      >
        {WORDMARK.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            initial={{ opacity: 0, y: '100%' }}
            whileInView={{ opacity: 1, y: '0%' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className='wordmark-footer inline-block'
          >
            {letter}
          </motion.span>
        ))}
      </div>
    </footer>
  )
}

export default SiteFooter
