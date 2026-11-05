import type { FC, ReactNode } from 'react'

import Link from 'next/link'
import { Layout } from '@/components/generals/layout'
import { Seo } from '@/components/generals/seo'
import { siteConfig } from '@/constants/site'

interface PolicySection {
  id: string
  title: string
  paragraphs: string[]
}

const sections: PolicySection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    paragraphs: [
      'Gridora builds forecasting and balancing software for renewable energy operators. This policy explains what information this website collects, why we collect it and what you can ask us to do with it.',
    ],
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    paragraphs: [
      'When you request a demo, we collect the details you type into the form: your name, work email, company, and, if you choose to share them, your role, portfolio size, the topics you are interested in and your message.',
      'When you sign up with just your email, we keep that address so our team can get in touch.',
      'We do not ask for payment details or any sensitive personal information on this website.',
    ],
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    paragraphs: [
      'We use your details to reply to you, arrange your demo and prepare it around your portfolio. Your request is stored securely so our team can follow up, and a copy is sent to our team by email.',
      'We never sell your information, and we do not add you to marketing lists without your permission.',
    ],
  },
  {
    id: 'emails',
    title: 'Emails',
    paragraphs: [
      'Emails sent through this website may include open and click tracking, which tells us whether a message was opened and which links in it were clicked. We use this only to make sure our messages arrive and are useful.',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    paragraphs: [
      'We measure visits to this website with privacy-friendly analytics that do not use cookies and do not build profiles of individual visitors. We only see totals, such as how many people visited a page and where they came from.',
    ],
  },
  {
    id: 'keeping-it',
    title: 'How long we keep it',
    paragraphs: [
      'We keep demo requests for up to 24 months after our last conversation with you, then delete them, unless you become a customer and the information is needed to provide our service.',
    ],
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    paragraphs: [
      'You can ask us to show you, correct or delete the information we hold about you at any time. Reply to any email from our team and we will act on your request within 30 days.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'If we change how we handle your information, we will update this page and the date at the top.',
    ],
  },
]

const PrivacyPage: FC = (): ReactNode => {
  return (
    <Layout>
      <Seo
        title='Privacy policy'
        description={`How ${siteConfig.name} collects, uses and protects the details you share, and what you can ask us to do with them.`}
      />

      <article className='bg-background py-20 sm:py-28'>
        <div className='mx-auto max-w-3xl px-4 sm:px-6'>
          <header>
            <p className='text-sm font-medium text-primary'>Last updated 9 October {siteConfig.year}</p>

            <h1 className='mt-4 font-heading text-4xl font-light tracking-[-0.035em] text-foreground sm:text-5xl'>
              Privacy policy
            </h1>

            <p className='mt-5 text-lg leading-relaxed text-muted-foreground'>
              The short version: we collect only what you choose to share, we use it to talk to you about{' '}
              {siteConfig.name}, and we never sell it.
            </p>
          </header>

          <nav aria-label='On this page' className='mt-10 rounded-2xl bg-white p-6 ring-1 ring-black/5'>
            <p className='text-sm font-medium text-foreground'>On this page</p>

            <ol className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className='rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className='mt-12 space-y-12'>
            {sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className='scroll-mt-28'>
                <h2
                  id={`${section.id}-title`}
                  className='font-heading text-2xl font-normal tracking-tight text-foreground'
                >
                  {section.title}
                </h2>

                <div className='mt-4 space-y-4'>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className='text-base leading-relaxed text-muted-foreground'>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className='mt-16 rounded-2xl bg-white p-6 ring-1 ring-black/5 sm:flex sm:items-center sm:justify-between sm:gap-6'>
            <p className='text-sm text-muted-foreground'>Questions about your data? Our team is happy to help.</p>

            <Link
              href='/#get-started'
              className='mt-3 inline-flex text-sm font-medium text-primary hover:text-primary-strong sm:mt-0'
            >
              Contact the team
            </Link>
          </div>
        </div>
      </article>
    </Layout>
  )
}

export default PrivacyPage
