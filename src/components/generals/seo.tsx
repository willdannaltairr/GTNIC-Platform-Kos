import Head from 'next/head'
import type { FC, ReactNode } from 'react'
import type { SeoProps } from '@/types'
import { useRouter } from 'next/router'
import { siteConfig } from '@/constants/site'
const toAbsolute = (path: string): string => {
  try {
    return new URL(path, siteConfig.url).toString()
  } catch {
    return path
  }
}
export const Seo: FC<SeoProps> = ({
  title,
  description = siteConfig.description,
  ogImage = siteConfig.ogImage,
  noIndex = false,
}): ReactNode => {
  const router = useRouter()
  const pageTitle = title ? `${title} - ${siteConfig.name}` : siteConfig.name
  const path = router.asPath.split(/[?#]/)[0] || '/'
  const pageUrl = toAbsolute(path)
  const imageUrl = ogImage ? toAbsolute(ogImage) : undefined
  return (
    <Head>
      {' '}
      <title> {pageTitle} </title> <meta name="description" content={description} />{' '}
      <meta property="og:title" content={pageTitle} /> <meta property="og:description" content={description} />{' '}
      <meta property="og:type" content="website" /> <meta property="og:site_name" content={siteConfig.name} />{' '}
      <meta property="og:url" content={pageUrl} /> <meta name="twitter:card" content="summary_large_image" />{' '}
      <meta name="twitter:title" content={pageTitle} /> <meta name="twitter:description" content={description} />{' '}
      {imageUrl && <meta property="og:image" content={imageUrl} />}{' '}
      {imageUrl && <meta property="og:image:alt" content="A wind turbine on misty green hills at dawn" />}{' '}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}{' '}
      {noIndex && <meta name="robots" content="noindex" />}{' '}
    </Head>
  )
}
