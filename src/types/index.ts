import type { ReactNode } from 'react'
export type SiteConfig = {
  name: string
  tagline: string
  description: string
  url: string
  ogImage?: string
  year: number
}
export type NavLink = {
  label: string
  href: string
}
export type FooterColumn = {
  title: string
  links: NavLink[]
}
export type LayoutProps = {
  children: ReactNode
}
export type SeoProps = {
  title?: string
  description?: string
  ogImage?: string
  noIndex?: boolean
}
