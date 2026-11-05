import 'lenis/dist/lenis.css'
import '@/styles/globals.css'

import type { FC, ReactNode } from 'react'
import type { AppProps } from 'next/app'

import Head from 'next/head'
import { MotionConfig } from 'motion/react'
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import SmoothScroll from '@/components/generals/motion/smooth-scroll'
import IntroCurtain from '@/components/generals/motion/intro-curtain'
import ScrollProgress from '@/components/generals/motion/scroll-progress'

const sans = DM_Sans({ subsets: ['latin'] })
const heading = Space_Grotesk({ subsets: ['latin'] })
const mono = JetBrains_Mono({ subsets: ['latin'] })

const fontVariables = `:root{--font-app-sans:${sans.style.fontFamily};--font-app-mono:${mono.style.fontFamily};--font-app-heading:${heading.style.fontFamily}}`

const App: FC<AppProps> = ({ Component, pageProps }): ReactNode => {
  return (
    <div className="h-full font-sans">
      <Head>
        <style dangerouslySetInnerHTML={{ __html: fontVariables }} />
      </Head>

      <MotionConfig reducedMotion="user">
        <IntroCurtain />
        <SmoothScroll />
        <ScrollProgress />

        <Component {...pageProps} />
      </MotionConfig>
    </div>
  )
}

export default App
