import type { FC, ReactNode } from 'react'
import { Html, Head, Main, NextScript } from 'next/document'
const Document: FC = (): ReactNode => {
  return (
    <Html lang="en">
      {' '}
      <Head>
        {' '}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" /> <meta name="theme-color" content="#f4f5f1" />{' '}
      </Head>{' '}
      <body className="min-h-full flex flex-col">
        {' '}
        <Main /> <NextScript />{' '}
      </body>{' '}
    </Html>
  )
}
export default Document
