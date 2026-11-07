import type { FC, ReactNode } from 'react'

import { Quote } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import TestimonialCarousel from '@/components/landing/testimonial-carousel'
import { TESTIMONIALS } from '@/lib/landing'

/**
 * Bagian testimoni — menggantikan bagian "Tentang" yang dulu ada di sini.
 *
 * Isinya kutipan dari penghuni dan pemilik, jadi yang tampil adalah suara
 * mereka, bukan penjelasan platform tentang dirinya sendiri. Kutipannya
 * berasal dari `lib/landing.ts` dan ditandai sebagai contoh data demo:
 * platform ini belum punya cukup pengguna nyata untuk mengutip testimoni
 * sungguhan, dan mengarang nama orang nyata untuk itu adalah hal yang tidak
 * boleh dilakukan meski tampilannya jadi kurang meyakinkan.
 *
 * Interaksinya ada di TestimonialCarousel karena butuh state dan animasi;
 * bagian ini tetap server component supaya bisa memasang judulnya sendiri.
 */
const TestimonialSection: FC = (): ReactNode => {
  return (
    <section
      id="testimoni"
      aria-labelledby="testimoni-title"
      className="scroll-mt-20 border-y border-border bg-background pb-24 pt-24 sm:pb-32 sm:pt-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            id="testimoni-title"
            eyebrow="Kata penghuni dan pemilik"
            title="Yang mereka temukan setelah informasi kosnya terbuka."
            description="Kutipan di bawah adalah contoh dari data demo platform — bukan ulasan pengguna sungguhan."
            align="center"
          />
        </div>

        <div className="relative mx-auto mt-14 max-w-3xl">
          <Quote
            className="absolute -left-1 -top-6 size-10 text-leaf/25 sm:-left-8 sm:size-14"
            aria-hidden="true"
          />

          <TestimonialCarousel items={TESTIMONIALS} />
        </div>
      </div>
    </section>
  )
}

export default TestimonialSection
