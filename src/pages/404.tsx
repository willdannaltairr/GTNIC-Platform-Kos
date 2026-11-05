import type { FC, ReactNode } from 'react'

import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/generals/logo'
import { ButtonLink } from '@/components/generals/button'
import { siteConfig } from '@/constants/site'

const NotFound: FC = (): ReactNode => {
  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background">
      <Head>
        <title>{`Page not found - ${siteConfig.name}`}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Image
        src="/images/hills-mist.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover object-bottom opacity-70"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/80 to-background/20"
      />

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${siteConfig.name} home`}
          className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <p className="font-heading text-8xl font-light tracking-[-0.06em] text-foreground/25 sm:text-9xl">404</p>

        <h1 className="mt-4 font-heading text-3xl font-light tracking-[-0.03em] text-foreground sm:text-4xl">
          This page drifted off the grid.
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          The page you are looking for does not exist or has moved. Let us get you back to solid ground.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/" size="lg">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </ButtonLink>

          <ButtonLink href="/#get-started" variant="glass" size="lg">
            Book a demo
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}

export default NotFound
