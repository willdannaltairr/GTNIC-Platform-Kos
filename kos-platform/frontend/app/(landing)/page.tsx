import type { Metadata } from 'next'
import { Suspense } from 'react'

import HeroSection from '@/components/landing/hero-section'
import AreasMarquee from '@/components/landing/areas-marquee'
import ManifestoSection from '@/components/landing/manifesto-section'
import PlatformSection from '@/components/landing/platform-section'
import SolutionsSection from '@/components/landing/solutions-section'
import LocationsSection from '@/components/landing/locations-section'
import { RecommendedSection } from '@/components/landing/recommended-section'
import HowItWorksSection from '@/components/landing/how-it-works-section'
import BenefitsSection from '@/components/landing/benefits-section'
import StatsSection from '@/components/landing/stats-section'
import AboutSection from '@/components/landing/about-section'
import FaqSection from '@/components/landing/faq-section'
import CtaSection from '@/components/landing/cta-section'
import HouseSection from '@/components/landing/house-section'
import MotionProvider from '@/components/motion/motion-provider'

export const metadata: Metadata = {
  title: 'KosPlatform — Cari & Sewa Kos dengan Biaya Transparan',
  description:
    'Bandingkan estimasi biaya total, jarak ke kampus atau kantor, dan ketersediaan kamar sebelum survei. Platform kos dengan informasi yang bisa diperiksa.',
}

/** Kerangka kartu selama daftar kos terbaru diambil dari API. */
function RecommendedSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-10 w-80 animate-pulse rounded bg-muted" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

/**
 * Beranda publik.
 *
 * Hanya halaman ini yang memakai bahasa visual landing sendiri (foto besar,
 * gerak berbasis gulir, tipografi Space Grotesk). Halaman /kos, /masuk,
 * /daftar, dan /kredit tetap memakai chrome dan komponen yang sudah ada.
 */
export default function HomePage() {
  return (
    <MotionProvider>
      <HeroSection />
      <AreasMarquee />
      <ManifestoSection />
      <PlatformSection />
      <SolutionsSection />
      <LocationsSection />

      {/*
        Skeleton dipasang lewat Suspense lokal, bukan loading.tsx: loading.tsx
        pada segmen ini membungkus seluruh halaman dan membuat status HTTP
        jadi 200 meski isinya gagal dimuat.
      */}
      <Suspense fallback={<RecommendedSkeleton />}>
        <RecommendedSection />
      </Suspense>

      <HowItWorksSection />
      <BenefitsSection />
      <StatsSection />
      <AboutSection />
      <FaqSection />
      <CtaSection />
      <HouseSection />
    </MotionProvider>
  )
}
