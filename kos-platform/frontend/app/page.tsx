import { HeroSection } from '@/components/landing/hero-section'
import { LocationsSection } from '@/components/landing/locations-section'
import { SearchSection } from '@/components/landing/search-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { RecommendedSection } from '@/components/landing/recommended-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { BenefitsSection } from '@/components/landing/benefits-section'
import { TrustSection } from '@/components/landing/trust-section'
import { FaqSection } from '@/components/landing/faq-section'
import { CtaSection } from '@/components/landing/cta-section'

/** Beranda publik: nilai platform, pencarian, fitur, dan properti terverifikasi. */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LocationsSection />
      <SearchSection />
      <FeaturesSection />
      <RecommendedSection />
      <HowItWorksSection />
      <BenefitsSection />
      <TrustSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
