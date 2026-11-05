import type { FC, ReactNode } from 'react'
import type { LayoutProps } from '@/types'
import SiteHeader from '@/components/generals/site-header'
import SiteFooter from '@/components/generals/site-footer'
export const Layout: FC<LayoutProps> = ({ children }): ReactNode => {
  return (
    <div className="flex min-h-screen flex-col">
      {' '}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        {' '}
        Skip to content{' '}
      </a>{' '}
      <SiteHeader />{' '}
      <main id="main-content" className="flex-1">
        {' '}
        {children}{' '}
      </main>{' '}
      <SiteFooter />{' '}
    </div>
  )
}
