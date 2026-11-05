import type { FC, ReactNode } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { Logo } from '@/components/generals/logo'
import { ButtonLink } from '@/components/generals/button'
import { siteConfig } from '@/constants/site'
const ServerError: FC = (): ReactNode => {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      {' '}
      <Head>
        {' '}
        <title> {`Something went wrong - ${siteConfig.name}`} </title> <meta name="robots" content="noindex" />{' '}
      </Head>{' '}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {' '}
        <Link
          href="/"
          aria-label={`${siteConfig.name} home`}
          className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {' '}
          <Logo />{' '}
        </Link>{' '}
      </div>{' '}
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        {' '}
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          {' '}
          <RefreshCw className="size-6" aria-hidden="true" />{' '}
        </span>{' '}
        <h1 className="mt-6 font-heading text-3xl font-light tracking-[-0.03em] text-foreground sm:text-4xl">
          {' '}
          Something went wrong on our side.{' '}
        </h1>{' '}
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          {' '}
          We hit a fault while loading this page. Please try again in a moment.{' '}
        </p>{' '}
        <ButtonLink href="/" size="lg" className="mt-8">
          {' '}
          Back to home{' '}
        </ButtonLink>{' '}
      </div>{' '}
    </main>
  )
}
export default ServerError
