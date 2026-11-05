import type { FooterColumn, NavLink, SiteConfig } from '@/types'
export const siteConfig: SiteConfig = {
  name: 'Gridora',
  tagline: 'AI forecasting and balancing for renewable energy portfolios.',
  description:
    'Gridora forecasts load and generation across wind, solar and storage, then tells your team exactly when to charge, discharge and bid. Fewer surprises at the evening peak, less energy curtailed.',
  url: 'https://gridora.modulify.website',
  ogImage: '/images/hero-turbine.jpg',
  year: 2026,
}
export const navLinks: NavLink[] = [
  { label: 'Product', href: '/#product' },
  { label: 'Solutions', href: '/#solutions' },
  { label: 'Insights', href: '/#insights' },
  { label: 'About', href: '/#about' },
]
export const primaryCta: NavLink = { label: 'Book a demo', href: '/#get-started' }
export const footerColumns: FooterColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Overview', href: '/#product' },
      { label: 'Forecast', href: '/#solutions' },
      { label: 'Balance', href: '/#solutions' },
      { label: 'Trade', href: '/#solutions' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/#about' },
      { label: 'Insights', href: '/#insights' },
      { label: 'Book a demo', href: '/#get-started' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Privacy policy', href: '/privacy' },
    ],
  },
]
