import type { FC, ReactNode } from 'react'

import Lenis from 'lenis'
import { useEffect } from 'react'

const HEADER_OFFSET = -88

// Smooth, weighted scrolling for the whole site. In-page links glide to their section,
// and visitors who ask for reduced motion keep the browser's native scrolling.
const SmoothScroll: FC = (): ReactNode => {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.95,
    })

    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const element = event.target instanceof Element ? event.target : null
      const anchor = element?.closest('a[href]') as HTMLAnchorElement | null

      if (!anchor || anchor.target === '_blank') return

      const url = new URL(anchor.href, window.location.href)

      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return

      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))
      if (!target) return

      event.preventDefault()
      lenis.scrollTo(target, { offset: HEADER_OFFSET, immediate: reduceMotion, duration: 1.4 })
      window.history.replaceState(window.history.state, '', url.hash)
    }

    window.addEventListener('click', onClick, true)

    return () => {
      window.removeEventListener('click', onClick, true)
      lenis.destroy()
    }
  }, [])

  return null
}

export default SmoothScroll
