import type { FC, ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import SectionHeading from '@/components/landing/section-heading'
import { faqs } from '@/constants/landing'
const FaqSection: FC = (): ReactNode => {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-white py-24 sm:py-32">
      {' '}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        {' '}
        <div className="reveal lg:sticky lg:top-28 lg:self-start">
          {' '}
          <SectionHeading
            id="faq-title"
            eyebrow="FAQ"
            title="Questions operators ask us first."
            description="Anything else you want to know, ask us on a demo call. We are happy to go deep on your assets, data and market."
          />{' '}
          <Link
            href="/#get-started"
            className="mt-8 inline-flex items-center gap-2 rounded-full text-sm font-medium text-primary transition-colors hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          >
            {' '}
            Talk to a grid specialist <ArrowRight className="size-4" aria-hidden="true" />{' '}
          </Link>{' '}
        </div>{' '}
        <div className="space-y-3">
          {' '}
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="reveal group rounded-2xl bg-background ring-1 ring-black/5 transition-colors open:bg-white open:shadow-[0_20px_40px_-30px_rgba(14,26,18,0.4)]"
            >
              {' '}
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-5 text-base font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 [&::-webkit-details-marker]:hidden">
                {' '}
                {faq.question}{' '}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-foreground ring-1 ring-black/5 transition-transform duration-300 group-open:rotate-45">
                  {' '}
                  <Plus className="size-4" aria-hidden="true" />{' '}
                </span>{' '}
              </summary>{' '}
              <p className="-mt-1 px-5 pb-6 text-[15px] leading-relaxed text-muted-foreground sm:px-6">
                {' '}
                {faq.answer}{' '}
              </p>{' '}
            </details>
          ))}{' '}
        </div>{' '}
      </div>{' '}
    </section>
  )
}
export default FaqSection
