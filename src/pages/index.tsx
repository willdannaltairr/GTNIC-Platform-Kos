import type { FC, ReactNode } from 'react'

import { Seo } from '@/components/generals/seo'
import { Layout } from '@/components/generals/layout'
import HeroSection from '@/components/landing/hero-section'
import CustomersStrip from '@/components/landing/customers-strip'
import ManifestoSection from '@/components/landing/manifesto-section'
import PlatformSection from '@/components/landing/platform-section'
import SolutionsSection from '@/components/landing/solutions-section'
import InsightsSection from '@/components/landing/insights-section'
import HowItWorksSection from '@/components/landing/how-it-works-section'
import AboutSection from '@/components/landing/about-section'
import FaqSection from '@/components/landing/faq-section'
import DemoRequestSection from '@/components/landing/demo-request-section'
import EarlyAccessSection from '@/components/landing/early-access-section'

const Home: FC = (): ReactNode => {
  return (
    <Layout>
      <Seo />

      <HeroSection />
      <CustomersStrip />
      <ManifestoSection />
      <PlatformSection />
      <SolutionsSection />
      <InsightsSection />
      <HowItWorksSection />
      <AboutSection />
      <FaqSection />
      <DemoRequestSection />
      <EarlyAccessSection />
    </Layout>
  )
}

export default Home
